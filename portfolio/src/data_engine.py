"""
Layer 1 -- Data engine.

Collects daily OHLCV and adjusted-close history for the research universe,
cleans and aligns the series, computes continuously compounded (log) returns,
and persists both per-stock CSVs and master comparison datasets.

Data source: free public Yahoo Finance data.

Two fetch backends are provided:

* ``yfinance`` -- the conventional library, used when it can reach Yahoo.
* A dependency-light ``requests`` client against Yahoo's public v8 chart API,
  used as a robust fallback (it honours the standard ``HTTPS_PROXY`` /
  ``REQUESTS_CA_BUNDLE`` environment and includes retry-with-backoff for the
  rate limiting Yahoo applies to anonymous traffic).

The two backends produce an identical schema, so the rest of the pipeline is
agnostic to which one ran.
"""
from __future__ import annotations

import os
import time

import numpy as np
import pandas as pd
import requests

from . import config

# Yahoo throttles anonymous requests aggressively; a browser-like UA plus
# spacing and backoff keeps the download reliable.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}
_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"


# --------------------------------------------------------------------------- #
# Single-symbol fetch
# --------------------------------------------------------------------------- #
def _fetch_via_requests(symbol: str, range_: str, interval: str,
                        max_retries: int = 6) -> pd.DataFrame:
    """Fetch one symbol from Yahoo's v8 chart API with retry/backoff.

    Returns a DataFrame indexed by date with columns
    ``[open, high, low, close, adj_close, volume]``.
    """
    params = {"range": range_, "interval": interval, "events": "div,split"}
    last_err: Exception | None = None

    for attempt in range(max_retries):
        try:
            resp = requests.get(
                _CHART_URL.format(symbol=symbol),
                params=params, headers=_HEADERS, timeout=30,
            )
            if resp.status_code == 200:
                return _parse_chart_json(resp.json())
            # 429 / 5xx -> back off and retry; anything else is fatal.
            if resp.status_code not in (429, 500, 502, 503, 504):
                resp.raise_for_status()
            last_err = RuntimeError(f"HTTP {resp.status_code}")
        except Exception as exc:  # network hiccup, JSON error, etc.
            last_err = exc
        # Exponential backoff with a little jitter.
        time.sleep(min(2 ** attempt, 30) + 0.25 * attempt)

    raise RuntimeError(f"Failed to fetch {symbol} after {max_retries} tries: {last_err}")


def _parse_chart_json(payload: dict) -> pd.DataFrame:
    """Turn a Yahoo chart JSON payload into a tidy OHLCV DataFrame."""
    result = payload["chart"]["result"][0]
    timestamps = result["timestamp"]
    quote = result["indicators"]["quote"][0]
    # ``adjclose`` is present whenever we ask for split/div events.
    adj = result["indicators"].get("adjclose", [{}])[0].get("close")

    frame = pd.DataFrame(
        {
            "open": quote.get("open"),
            "high": quote.get("high"),
            "low": quote.get("low"),
            "close": quote.get("close"),
            "adj_close": adj if adj is not None else quote.get("close"),
            "volume": quote.get("volume"),
        },
        index=pd.to_datetime(pd.Series(timestamps, dtype="int64"), unit="s"),
    )
    frame.index = frame.index.normalize()
    frame.index.name = "date"
    return frame


def _fetch_via_yfinance(symbol: str, range_: str, interval: str) -> pd.DataFrame:
    """Fetch one symbol through the yfinance library (conventional path)."""
    import yfinance as yf  # imported lazily so the fallback works without it

    hist = yf.Ticker(symbol).history(
        period=range_, interval=interval, auto_adjust=False
    )
    if hist.empty:
        raise RuntimeError("yfinance returned no rows")
    hist = hist.rename(
        columns={
            "Open": "open", "High": "high", "Low": "low",
            "Close": "close", "Adj Close": "adj_close", "Volume": "volume",
        }
    )
    hist.index = pd.to_datetime(hist.index).tz_localize(None).normalize()
    hist.index.name = "date"
    return hist[["open", "high", "low", "close", "adj_close", "volume"]]


def fetch_symbol(symbol: str, range_: str, interval: str,
                prefer: str = "requests") -> pd.DataFrame:
    """Fetch one symbol, trying the preferred backend then falling back."""
    order = ["requests", "yfinance"] if prefer == "requests" else ["yfinance", "requests"]
    errors = []
    for backend in order:
        try:
            if backend == "requests":
                df = _fetch_via_requests(symbol, range_, interval)
            else:
                df = _fetch_via_yfinance(symbol, range_, interval)
            if not df.empty:
                return df
        except Exception as exc:
            errors.append(f"{backend}: {exc}")
    raise RuntimeError(f"All backends failed for {symbol} -> {' | '.join(errors)}")


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def collect_universe(symbols: list[str] | None = None,
                    range_: str | None = None,
                    interval: str | None = None,
                    pause: float = 0.8) -> dict[str, pd.DataFrame]:
    """Download every symbol, save a per-stock CSV, and return the frames.

    A small ``pause`` between symbols keeps well under Yahoo's rate limit.
    """
    symbols = symbols or config.ALL_SYMBOLS
    range_ = range_ or config.HISTORY_RANGE
    interval = interval or config.INTERVAL

    frames: dict[str, pd.DataFrame] = {}
    for i, sym in enumerate(symbols):
        df = fetch_symbol(sym, range_, interval)
        df = df.dropna(how="all")
        out = os.path.join(config.RAW_DIR, f"{sym}.csv")
        df.to_csv(out)
        frames[sym] = df
        print(f"  [{i + 1}/{len(symbols)}] {sym}: {len(df)} rows -> {os.path.relpath(out, config.PACKAGE_ROOT)}")
        if i < len(symbols) - 1:
            time.sleep(pause)
    return frames


def build_master_datasets(frames: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """Align all symbols and build master price / volume / return matrices.

    Returns a dict with keys ``adj_close``, ``volume``, ``log_returns`` and
    saves each to ``data/processed``.
    """
    # Assemble wide matrices, then align on the common trading calendar.
    adj_close = pd.DataFrame({s: f["adj_close"] for s, f in frames.items()})
    volume = pd.DataFrame({s: f["volume"] for s, f in frames.items()})

    # Forward-fill isolated gaps (rare holidays that differ by listing), then
    # drop any remaining rows that are not complete across the whole universe so
    # every downstream comparison is on identical dates.
    adj_close = adj_close.sort_index().ffill().dropna()
    volume = volume.reindex(adj_close.index)

    # Continuously compounded (log) returns are preferred: they are additive
    # across time and closer to normally distributed than simple returns.
    log_returns = np.log(adj_close / adj_close.shift(1)).dropna()

    datasets = {
        "adj_close": adj_close,
        "volume": volume,
        "log_returns": log_returns,
    }
    for name, df in datasets.items():
        out = os.path.join(config.PROCESSED_DIR, f"master_{name}.csv")
        df.to_csv(out)
        print(f"  master_{name}: {df.shape[0]} rows x {df.shape[1]} cols "
              f"-> {os.path.relpath(out, config.PACKAGE_ROOT)}")

    # A tidy "long" master dataset is convenient for spreadsheet/BI tools.
    tidy = (
        adj_close.reset_index()
        .melt(id_vars="date", var_name="symbol", value_name="adj_close")
        .merge(
            volume.reset_index().melt(id_vars="date", var_name="symbol", value_name="volume"),
            on=["date", "symbol"], how="left",
        )
    )
    tidy.to_csv(os.path.join(config.PROCESSED_DIR, "master_long.csv"), index=False)

    return datasets


def load_processed() -> dict[str, pd.DataFrame]:
    """Reload the master datasets from disk (used by later layers / the notebook)."""
    out = {}
    for name in ("adj_close", "volume", "log_returns"):
        path = os.path.join(config.PROCESSED_DIR, f"master_{name}.csv")
        out[name] = pd.read_csv(path, index_col=0, parse_dates=True)
    return out


def run() -> dict[str, pd.DataFrame]:
    """End-to-end Layer 1: collect, clean, align, and persist."""
    print("Layer 1 | Data engine")
    frames = collect_universe()
    datasets = build_master_datasets(frames)
    print(f"  Data window: {datasets['adj_close'].index.min().date()} "
          f"-> {datasets['adj_close'].index.max().date()}")
    return datasets


if __name__ == "__main__":
    run()
