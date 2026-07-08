"""
DATA ENGINE
===========

The data-acquisition and cleaning layer for the equity-research portfolio
system. Everything downstream (signals, factor models, back-tests, reports)
consumes the aligned panels this module produces, so the goal here is a single
source of truth: reproducible, gap-free, and self-documenting.

What it does
------------
1. Pulls daily adjusted-close prices and volume for a fixed equity universe
   plus a market benchmark (SPY) from Yahoo Finance via ``yfinance``.
2. Uses a configurable lookback window (default: 3 years).
3. Cleans and aligns every series onto one common trading calendar.
4. Computes daily continuously-compounded (log) returns for each name.
5. Writes one tidy CSV per ticker into ``data/`` and a single wide
   ``master_dataset.csv`` with every series aligned by date.
6. Prints a summary: date range, number of trading days, and any tickers that
   had missing-data issues.

The code is organised as small, reusable, independently-testable functions.
Call :func:`run` for the full pipeline, or compose the pieces yourself.

Design note on cleaning (the "which and why")
---------------------------------------------
Every name in the universe is a large-cap US equity (or SPY) trading on the
NYSE/NASDAQ calendar, so their native trading days already coincide. We still
reindex all series onto the *union* of observed trading dates to surface any
ticker-specific gap (e.g. a single-day trading halt). Then:

* **Prices are forward-filled** across short internal gaps. Carrying the last
  observed price is the "no new information" assumption; it produces a 0.0 log
  return on the filled day, which is the correct neutral treatment and keeps
  the panel rectangular so cross-sectional math never sees a NaN.
* **Volume is NOT forward-filled** — a day with no print genuinely had no
  volume, and copying yesterday's volume would invent liquidity. Volume gaps
  are filled with 0.0 instead.
* **Leading rows are dropped**, not filled: if a ticker had not yet started
  trading at the window start there is no price to carry backward. (Within a
  3-year window every name in the default universe has full history, so in
  practice nothing is dropped — but the guard matters if the universe or
  lookback changes.)
* Forward-fill is **capped** (``FFILL_LIMIT``) so a delisting or a long data
  outage becomes a visible NaN/dropped row rather than a silently flat line.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import yfinance as yf

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
# The tradeable equity universe. SPY is kept separate conceptually (it is the
# market benchmark, not a position) but is fetched and cleaned identically.
EQUITY_TICKERS: list[str] = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "GOOGL", "META"]
BENCHMARK_TICKER: str = "SPY"
ALL_TICKERS: list[str] = EQUITY_TICKERS + [BENCHMARK_TICKER]

# Lookback window, in whole years, measured back from "today".
LOOKBACK_YEARS: int = 3

# Maximum consecutive days a price may be carried forward before we treat the
# gap as a real data problem (NaN -> dropped) rather than a one-off missing
# print. 5 trading days ~= one calendar week.
FFILL_LIMIT: int = 5

# Output location. Per-ticker CSVs and the master dataset both land here.
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Column names used consistently across per-ticker files and the master panel.
COL_ADJ_CLOSE = "adj_close"
COL_VOLUME = "volume"
COL_LOG_RETURN = "log_return"


# --------------------------------------------------------------------------- #
# Result container
# --------------------------------------------------------------------------- #
@dataclass
class DataEngineResult:
    """Everything the pipeline produces, returned in one bundle.

    Attributes
    ----------
    adj_close:
        Cleaned adjusted-close prices, dates x tickers.
    volume:
        Cleaned volume, dates x tickers.
    log_returns:
        Daily log returns, dates x tickers (one row shorter than prices).
    master:
        Wide master panel with ``<TICKER>_<field>`` columns, aligned by date.
    per_ticker_paths:
        Mapping of ticker -> written CSV path.
    master_path:
        Path to the written ``master_dataset.csv``.
    missing_report:
        Per-ticker record of any gaps that were filled or rows dropped.
    """

    adj_close: pd.DataFrame
    volume: pd.DataFrame
    log_returns: pd.DataFrame
    master: pd.DataFrame
    per_ticker_paths: dict[str, str] = field(default_factory=dict)
    master_path: str = ""
    missing_report: dict[str, dict] = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Networking
# --------------------------------------------------------------------------- #
def build_session():
    """Build an HTTP session for ``yfinance``, robust to proxied environments.

    ``yfinance`` talks to Yahoo through ``curl_cffi`` and, by default,
    impersonates a very recent Chrome TLS fingerprint. Some corporate / agent
    proxies re-terminate TLS and reset that handshake. Impersonating an
    older Chrome (``chrome110``) negotiates cleanly while still looking like a
    browser to Yahoo. We also honour the standard proxy / CA-bundle
    environment variables when they are present so the same code runs both
    behind a proxy and on a normal machine.

    Returns
    -------
    A ``curl_cffi`` session, or ``None`` if ``curl_cffi`` is unavailable — in
    which case the caller lets ``yfinance`` use its own default session.
    """
    try:
        from curl_cffi import requests as curl_requests
    except ImportError:
        return None

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    ca_bundle = (
        os.environ.get("CURL_CA_BUNDLE")
        or os.environ.get("REQUESTS_CA_BUNDLE")
        or os.environ.get("SSL_CERT_FILE")
    )

    kwargs: dict = {"impersonate": "chrome110"}
    if proxy:
        kwargs["proxies"] = {"https": proxy, "http": proxy}
    if ca_bundle:
        kwargs["verify"] = ca_bundle

    return curl_requests.Session(**kwargs)


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #
def resolve_window(lookback_years: int = LOOKBACK_YEARS,
                   end: pd.Timestamp | None = None) -> tuple[pd.Timestamp, pd.Timestamp]:
    """Resolve the (start, end) dates for a whole-year lookback.

    ``end`` defaults to today; ``start`` is ``lookback_years`` calendar years
    earlier. Returned as normalised (midnight) timestamps.
    """
    end = pd.Timestamp.today().normalize() if end is None else pd.Timestamp(end).normalize()
    start = end - pd.DateOffset(years=lookback_years)
    return start, end


def download_raw(tickers: list[str] | None = None,
                 lookback_years: int = LOOKBACK_YEARS,
                 session=None) -> pd.DataFrame:
    """Download raw OHLCV+AdjClose data for ``tickers`` over the lookback window.

    Uses ``auto_adjust=False`` so a dedicated ``Adj Close`` column (split- and
    dividend-adjusted) is available alongside raw ``Volume``. With multiple
    tickers ``yfinance`` returns a column MultiIndex of ``(field, ticker)``.

    Returns the raw ``yfinance`` frame untouched; field extraction happens in
    :func:`extract_fields` so this stays a thin, easily-mocked network wrapper.
    """
    tickers = tickers or ALL_TICKERS
    start, end = resolve_window(lookback_years)
    session = session if session is not None else build_session()

    raw = yf.download(
        tickers,
        start=start.strftime("%Y-%m-%d"),
        # yfinance treats `end` as exclusive; add a day so today is included.
        end=(end + pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
        session=session,
        progress=False,
        auto_adjust=False,
        group_by="column",
    )
    if raw.empty:
        raise RuntimeError(
            "yfinance returned no data. Check connectivity / ticker symbols."
        )
    return raw


def extract_fields(raw: pd.DataFrame,
                   tickers: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split a raw ``yfinance`` frame into (adj_close, volume) panels.

    Both returned frames are indexed by date with one column per ticker, in the
    requested ``tickers`` order. Handles both the multi-ticker MultiIndex layout
    and the single-ticker flat layout.
    """
    if isinstance(raw.columns, pd.MultiIndex):
        adj_close = raw["Adj Close"].copy()
        volume = raw["Volume"].copy()
    else:  # single-ticker frame: flat columns
        adj_close = raw[["Adj Close"]].copy()
        volume = raw[["Volume"]].copy()
        adj_close.columns = tickers
        volume.columns = tickers

    # Stable, requested column order (silently skip any ticker Yahoo dropped).
    keep = [t for t in tickers if t in adj_close.columns]
    adj_close, volume = adj_close[keep], volume[keep]
    adj_close.index.name = volume.index.name = "Date"
    return adj_close, volume


# --------------------------------------------------------------------------- #
# Cleaning & alignment
# --------------------------------------------------------------------------- #
def diagnose_missing(adj_close: pd.DataFrame,
                     volume: pd.DataFrame) -> dict[str, dict]:
    """Report, per ticker, where prices/volume are missing before cleaning.

    Run against the raw (union-reindexed) panel so the summary reflects the
    real state of the data, not the post-fill state. For each ticker we record
    the count and the leading/internal breakdown of missing observations.
    """
    union_index = adj_close.index
    report: dict[str, dict] = {}
    for tkr in adj_close.columns:
        px = adj_close[tkr]
        n_missing = int(px.isna().sum())
        first_valid = px.first_valid_index()
        # Leading gap = missing rows before the ticker's first real print.
        leading = int(px.loc[:first_valid].isna().sum()) if first_valid is not None else len(px)
        internal = n_missing - leading
        report[tkr] = {
            "missing_price_total": n_missing,
            "leading_missing": leading,
            "internal_missing": internal,
            "missing_volume": int(volume[tkr].isna().sum()) if tkr in volume else None,
            "first_valid_date": None if first_valid is None else first_valid.date().isoformat(),
        }
    report["_union_trading_days"] = len(union_index)
    return report


def clean_and_align(adj_close: pd.DataFrame,
                    volume: pd.DataFrame,
                    ffill_limit: int = FFILL_LIMIT
                    ) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Align both panels to a common trading calendar and handle missing data.

    See the module docstring for the full rationale. In brief:

    * Reindex onto the sorted union of all observed trading dates.
    * Forward-fill **prices** up to ``ffill_limit`` consecutive days (carry the
      last known price across short halts; a longer outage stays NaN).
    * Fill **volume** gaps with 0.0 (a missing print means no volume traded).
    * Drop any row that still has a NaN price for any ticker — this removes the
      leading edge before a late-starting ticker and any gap longer than the
      fill cap, guaranteeing a fully-populated, rectangular panel.
    """
    # Union of all trading dates, sorted ascending.
    union_index = adj_close.index.union(volume.index).sort_values()
    adj_close = adj_close.reindex(union_index).sort_index()
    volume = volume.reindex(union_index).sort_index()

    # Prices: bounded forward-fill for short internal gaps.
    adj_close = adj_close.ffill(limit=ffill_limit)

    # Volume: a missing print is genuinely zero traded volume, not carry-forward.
    volume = volume.fillna(0.0)

    # Drop rows where any price is still missing (leading edge / long outage).
    good_rows = adj_close.notna().all(axis=1)
    adj_close = adj_close.loc[good_rows]
    volume = volume.loc[good_rows]

    return adj_close, volume


def compute_log_returns(adj_close: pd.DataFrame) -> pd.DataFrame:
    """Daily continuously-compounded (log) returns per ticker.

    ``r_t = ln(P_t / P_{t-1})``. The first row is NaN by construction and is
    dropped, so the returns frame is one row shorter than ``adj_close``. Log
    returns are used (rather than simple returns) because they are additive
    across time, which the downstream analytics rely on.
    """
    returns = np.log(adj_close / adj_close.shift(1))
    return returns.dropna(how="any")


# --------------------------------------------------------------------------- #
# Assembly & persistence
# --------------------------------------------------------------------------- #
def build_master(adj_close: pd.DataFrame,
                 volume: pd.DataFrame,
                 log_returns: pd.DataFrame) -> pd.DataFrame:
    """Assemble the wide master panel aligned by date.

    Columns are named ``<TICKER>_adj_close``, ``<TICKER>_volume`` and
    ``<TICKER>_log_return`` and interleaved so all three fields for a ticker sit
    together. The index is the returns index (log returns lose the first day),
    so every row of the master is fully populated across all three fields.
    """
    frames = []
    for tkr in adj_close.columns:
        block = pd.DataFrame(
            {
                f"{tkr}_{COL_ADJ_CLOSE}": adj_close[tkr],
                f"{tkr}_{COL_VOLUME}": volume[tkr],
                f"{tkr}_{COL_LOG_RETURN}": log_returns[tkr],
            }
        )
        frames.append(block)

    master = pd.concat(frames, axis=1)
    # Align to the return dates so no row carries a NaN log-return.
    master = master.loc[log_returns.index]
    master.index.name = "Date"
    return master


def per_ticker_frame(tkr: str,
                     adj_close: pd.DataFrame,
                     volume: pd.DataFrame,
                     log_returns: pd.DataFrame) -> pd.DataFrame:
    """Build the tidy single-ticker frame written to ``data/<TICKER>.csv``.

    Columns: ``adj_close``, ``volume``, ``log_return``. Indexed by date over the
    return window (first day dropped) so the file is self-consistent.
    """
    frame = pd.DataFrame(
        {
            COL_ADJ_CLOSE: adj_close[tkr],
            COL_VOLUME: volume[tkr],
            COL_LOG_RETURN: log_returns[tkr],
        }
    ).loc[log_returns.index]
    frame.index.name = "Date"
    return frame


def save_outputs(adj_close: pd.DataFrame,
                 volume: pd.DataFrame,
                 log_returns: pd.DataFrame,
                 master: pd.DataFrame,
                 data_dir: str = DATA_DIR) -> tuple[dict[str, str], str]:
    """Write one CSV per ticker plus the master dataset into ``data_dir``.

    Returns ``(per_ticker_paths, master_path)``.
    """
    os.makedirs(data_dir, exist_ok=True)

    per_ticker_paths: dict[str, str] = {}
    for tkr in adj_close.columns:
        frame = per_ticker_frame(tkr, adj_close, volume, log_returns)
        path = os.path.join(data_dir, f"{tkr}.csv")
        frame.to_csv(path)
        per_ticker_paths[tkr] = path

    master_path = os.path.join(data_dir, "master_dataset.csv")
    master.to_csv(master_path)
    return per_ticker_paths, master_path


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #
def print_summary(result: DataEngineResult) -> None:
    """Print the end-of-run summary: date range, trading days, missing issues."""
    master = result.master
    start, end = master.index.min().date(), master.index.max().date()

    print("\n" + "=" * 66)
    print("DATA ENGINE SUMMARY")
    print("=" * 66)
    print(f"Universe          : {', '.join(EQUITY_TICKERS)}  |  benchmark: {BENCHMARK_TICKER}")
    print(f"Lookback          : {LOOKBACK_YEARS} year(s)")
    print(f"Date range        : {start}  ->  {end}")
    print(f"Trading days      : {len(master)} (aligned rows in master_dataset)")
    print(f"Tickers delivered : {result.adj_close.shape[1]} / {len(ALL_TICKERS)}")

    # Missing-data issues: any ticker that needed a fill or lost rows.
    report = result.missing_report
    flagged = {
        t: r for t, r in report.items()
        if isinstance(r, dict) and (r.get("missing_price_total") or r.get("missing_volume"))
    }
    print("-" * 66)
    if not flagged:
        print("Missing-data issues: none — all series clean and fully aligned.")
    else:
        print("Missing-data issues:")
        for t, r in flagged.items():
            print(
                f"  {t:6s} price-missing={r['missing_price_total']:>3} "
                f"(leading={r['leading_missing']}, internal={r['internal_missing']}) "
                f"volume-missing={r['missing_volume']}"
            )
        print("  (prices: internal gaps forward-filled up to "
              f"{FFILL_LIMIT}d; volume gaps -> 0; leading gaps dropped.)")
    print("-" * 66)
    print(f"Per-ticker CSVs   : {len(result.per_ticker_paths)} files in {DATA_DIR}/")
    print(f"Master dataset    : {result.master_path}")
    print("=" * 66 + "\n")


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(tickers: list[str] | None = None,
        lookback_years: int = LOOKBACK_YEARS,
        data_dir: str = DATA_DIR,
        session=None) -> DataEngineResult:
    """Run the full data-engine pipeline end to end.

    Steps: download -> extract fields -> diagnose -> clean/align -> log returns
    -> assemble master -> write CSVs -> summarise.

    Returns a :class:`DataEngineResult` with every in-memory panel and the paths
    of the files written, so callers can keep working without re-reading disk.
    """
    tickers = tickers or ALL_TICKERS

    raw = download_raw(tickers, lookback_years=lookback_years, session=session)
    adj_close_raw, volume_raw = extract_fields(raw, tickers)

    # Reindex to the union first so the diagnosis sees every gap.
    union_index = adj_close_raw.index.union(volume_raw.index).sort_values()
    missing_report = diagnose_missing(
        adj_close_raw.reindex(union_index), volume_raw.reindex(union_index)
    )

    adj_close, volume = clean_and_align(adj_close_raw, volume_raw)
    log_returns = compute_log_returns(adj_close)
    master = build_master(adj_close, volume, log_returns)

    per_ticker_paths, master_path = save_outputs(
        adj_close, volume, log_returns, master, data_dir=data_dir
    )

    result = DataEngineResult(
        adj_close=adj_close,
        volume=volume,
        log_returns=log_returns,
        master=master,
        per_ticker_paths=per_ticker_paths,
        master_path=master_path,
        missing_report=missing_report,
    )
    print_summary(result)
    return result


if __name__ == "__main__":
    run()
