"""
Step 1 - Data collection.

Downloads historical daily price data for the sector ETFs and SPY from Yahoo
Finance (via the `yfinance` package) and saves a tidy raw CSV of adjusted
close prices.
"""

from __future__ import annotations

import os

import pandas as pd
import yfinance as yf

from . import config


def download_prices(
    tickers: list[str] | None = None,
    start: str | None = None,
    end: str | None = None,
) -> pd.DataFrame:
    """Download adjusted close prices for `tickers`.

    Returns a DataFrame indexed by date with one column per ticker holding the
    adjusted close price. Adjusted close accounts for splits and dividends,
    which is what we want for return calculations.
    """
    tickers = tickers or config.ALL_TICKERS
    start = start or config.START_DATE
    end = end or config.END_DATE

    # auto_adjust=False keeps a separate "Adj Close" column we can select.
    raw = yf.download(
        tickers,
        start=start,
        end=end,
        progress=False,
        auto_adjust=False,
    )

    # With multiple tickers yfinance returns a column MultiIndex
    # (field, ticker); pull the adjusted close block.
    if isinstance(raw.columns, pd.MultiIndex):
        adj_close = raw["Adj Close"].copy()
    else:  # single ticker fallback
        adj_close = raw[["Adj Close"]].copy()
        adj_close.columns = tickers

    # Preserve a stable column order.
    adj_close = adj_close[[t for t in tickers if t in adj_close.columns]]
    adj_close.index.name = "Date"
    return adj_close


def save_raw(prices: pd.DataFrame) -> str:
    """Persist the raw adjusted-close panel to CSV and return the path."""
    config.ensure_dirs()
    path = os.path.join(config.RAW_DATA_DIR, "adj_close_prices.csv")
    prices.to_csv(path)
    return path


def run() -> pd.DataFrame:
    """Download and save raw prices; return the price panel."""
    prices = download_prices()
    path = save_raw(prices)
    print(f"[data_collection] Saved {prices.shape[0]} rows x "
          f"{prices.shape[1]} tickers -> {path}")
    print(f"[data_collection] Date range: {prices.index.min().date()} "
          f"to {prices.index.max().date()}")
    return prices


if __name__ == "__main__":
    run()
