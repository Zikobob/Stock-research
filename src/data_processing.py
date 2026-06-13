"""
Step 2 - Data processing.

Aligns the price series on common trading dates, handles missing values, and
computes continuously compounded (log) returns:

    r_t = ln(P_t / P_{t-1})
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

from . import config


def clean_prices(prices: pd.DataFrame) -> pd.DataFrame:
    """Align series and handle missing values.

    Strategy:
      1. Sort by date.
      2. Forward-fill short internal gaps (e.g. a ticker that did not print on
         a day the others did) so the time series stay aligned.
      3. Drop any remaining rows with NA (typically the leading edge before a
         ticker began trading), leaving a fully populated common window.
    """
    prices = prices.sort_index().copy()
    prices = prices.ffill()
    prices = prices.dropna(how="any")
    return prices


def compute_log_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute continuously compounded daily returns for every column."""
    returns = np.log(prices / prices.shift(1))
    returns = returns.dropna(how="any")
    return returns


def standardize_returns(returns: pd.DataFrame) -> pd.DataFrame:
    """Z-score each return series (mean 0, unit variance).

    Useful for comparability across assets in some downstream steps; the main
    pipeline keeps raw returns for modeling but exports the standardized panel
    for reference.
    """
    return (returns - returns.mean()) / returns.std(ddof=0)


def save_processed(prices: pd.DataFrame, returns: pd.DataFrame,
                   std_returns: pd.DataFrame) -> dict[str, str]:
    """Save the cleaned price and return panels; return a dict of paths."""
    config.ensure_dirs()
    paths = {
        "prices": os.path.join(config.PROCESSED_DATA_DIR, "prices_clean.csv"),
        "returns": os.path.join(config.PROCESSED_DATA_DIR, "log_returns.csv"),
        "std_returns": os.path.join(
            config.PROCESSED_DATA_DIR, "log_returns_standardized.csv"
        ),
    }
    prices.to_csv(paths["prices"])
    returns.to_csv(paths["returns"])
    std_returns.to_csv(paths["std_returns"])
    return paths


def run(prices: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Clean prices and compute returns; persist outputs.

    Returns (clean_prices, log_returns).
    """
    clean = clean_prices(prices)
    returns = compute_log_returns(clean)
    std_returns = standardize_returns(returns)
    paths = save_processed(clean, returns, std_returns)

    print(f"[data_processing] Clean prices: {clean.shape[0]} rows "
          f"({clean.index.min().date()} to {clean.index.max().date()})")
    print(f"[data_processing] Log returns:  {returns.shape[0]} rows")
    for name, p in paths.items():
        print(f"[data_processing] Saved {name} -> {p}")
    return clean, returns


if __name__ == "__main__":
    from . import data_collection

    raw = data_collection.run()
    run(raw)
