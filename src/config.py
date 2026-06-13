"""
Central configuration for the cross-sector correlation regime study.

Keeping every tunable parameter in one place makes the whole pipeline
reproducible: re-running with a different window or date range only requires
editing this file.
"""

from __future__ import annotations

import os

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
# Resolve project root as the parent of the directory holding this file (src/).
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(PROJECT_ROOT, "data")
RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DATA_DIR = os.path.join(DATA_DIR, "processed")
FIGURES_DIR = os.path.join(PROJECT_ROOT, "figures")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")

# --------------------------------------------------------------------------- #
# Universe
# --------------------------------------------------------------------------- #
# The four sector ETFs whose pairwise correlations define the "cross-sector"
# correlation structure, plus SPY as the broad-market reference / target.
SECTOR_TICKERS = ["XLK", "XLV", "XLE", "XLF"]   # Tech, Health, Energy, Financials
MARKET_TICKER = "SPY"                            # S&P 500 broad market
ALL_TICKERS = SECTOR_TICKERS + [MARKET_TICKER]

# Human-readable names for plots / tables.
TICKER_NAMES = {
    "XLK": "Technology (XLK)",
    "XLV": "Health Care (XLV)",
    "XLE": "Energy (XLE)",
    "XLF": "Financials (XLF)",
    "SPY": "S&P 500 (SPY)",
}

# --------------------------------------------------------------------------- #
# Data window
# --------------------------------------------------------------------------- #
# At least five years of daily data is requested; we pull a generous window and
# let the processing step trim to the common overlapping range.
START_DATE = "2015-01-01"
END_DATE = None  # None -> up to today

# --------------------------------------------------------------------------- #
# Correlation / regime parameters
# --------------------------------------------------------------------------- #
ROLLING_CORR_WINDOW = 90        # trading days (within the requested 60-120 range)
HIGH_REGIME_QUANTILE = 0.75     # top quartile of avg pairwise correlation
LOW_REGIME_QUANTILE = 0.25      # bottom quartile
PCA_ROLLING_WINDOW = 90         # window for rolling PC1 variance-explained

# --------------------------------------------------------------------------- #
# Forecasting parameters
# --------------------------------------------------------------------------- #
N_LAGS = 5                      # number of lagged returns used as features
FIT_WINDOW = 252                # rolling training window (~1 trading year)
RIDGE_ALPHA = 1.0
LASSO_ALPHA = 0.0005

# --------------------------------------------------------------------------- #
# Reproducibility
# --------------------------------------------------------------------------- #
RANDOM_SEED = 42


def ensure_dirs() -> None:
    """Create all output directories if they do not already exist."""
    for d in (
        RAW_DATA_DIR,
        PROCESSED_DATA_DIR,
        FIGURES_DIR,
        RESULTS_DIR,
    ):
        os.makedirs(d, exist_ok=True)
