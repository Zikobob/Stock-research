"""
Central configuration for the equity research portfolio system.

Every tunable parameter lives here so the entire study can be reproduced under
different assumptions by editing one file and re-running ``python -m portfolio.src.main``.
"""
from __future__ import annotations

import os

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
# Package root is .../portfolio ; project root is one level up.
PACKAGE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RAW_DIR = os.path.join(PACKAGE_ROOT, "data", "raw")
PROCESSED_DIR = os.path.join(PACKAGE_ROOT, "data", "processed")
CHARTS_DIR = os.path.join(PACKAGE_ROOT, "charts")
REPORTS_DIR = os.path.join(PACKAGE_ROOT, "reports")

for _d in (RAW_DIR, PROCESSED_DIR, CHARTS_DIR, REPORTS_DIR):
    os.makedirs(_d, exist_ok=True)

# --------------------------------------------------------------------------- #
# Universe
# --------------------------------------------------------------------------- #
# The research universe: eight large-cap names spanning four GICS sectors, plus
# a broad-market benchmark (SPY) used for beta and relative-performance work.
BENCHMARK = "SPY"

# Each entry carries the qualitative context the report generator needs so that
# reports read like research notes rather than raw statistics.
COMPANIES: dict[str, dict[str, str]] = {
    "AAPL": {
        "name": "Apple Inc.",
        "sector": "Information Technology",
        "industry": "Consumer Electronics",
        "business": (
            "Designs and sells smartphones (iPhone), personal computers (Mac), "
            "tablets (iPad), wearables, and a fast-growing, high-margin Services "
            "segment (App Store, iCloud, Apple Pay, advertising)."
        ),
        "position": (
            "Owns the premium end of the smartphone market and an unusually "
            "sticky hardware-plus-services ecosystem with ~2 billion active "
            "devices, giving it durable pricing power and recurring revenue."
        ),
    },
    "MSFT": {
        "name": "Microsoft Corporation",
        "sector": "Information Technology",
        "industry": "Systems Software",
        "business": (
            "Sells cloud infrastructure and platform services (Azure), "
            "productivity software (Microsoft 365, Teams), Windows, LinkedIn, "
            "and gaming (Xbox, Activision)."
        ),
        "position": (
            "The number-two hyperscale cloud provider and the default enterprise "
            "productivity stack, now distributing generative AI (Copilot) across "
            "an installed base measured in the hundreds of millions of seats."
        ),
    },
    "NVDA": {
        "name": "NVIDIA Corporation",
        "sector": "Information Technology",
        "industry": "Semiconductors",
        "business": (
            "Designs GPUs and accelerated-computing platforms for data centers, "
            "gaming, professional visualization, and automotive, paired with the "
            "CUDA software ecosystem."
        ),
        "position": (
            "The dominant supplier of AI training and inference accelerators, "
            "with a software moat (CUDA) that raises switching costs well beyond "
            "the silicon itself."
        ),
    },
    "AMZN": {
        "name": "Amazon.com, Inc.",
        "sector": "Consumer Discretionary",
        "industry": "Broadline Retail",
        "business": (
            "Operates the largest Western e-commerce marketplace, a leading "
            "cloud-computing division (AWS), advertising, subscriptions (Prime), "
            "and logistics."
        ),
        "position": (
            "Scale leader in online retail and cloud infrastructure; AWS and "
            "advertising supply the profit while retail supplies the reach."
        ),
    },
    "TSLA": {
        "name": "Tesla, Inc.",
        "sector": "Consumer Discretionary",
        "industry": "Automobile Manufacturers",
        "business": (
            "Manufactures battery electric vehicles and energy generation and "
            "storage systems, and is developing autonomy and robotics."
        ),
        "position": (
            "The best-known EV brand with industry-leading manufacturing margins "
            "historically, though facing intensifying competition and a "
            "valuation that prices in optionality (autonomy, energy, robotics)."
        ),
    },
    "GOOGL": {
        "name": "Alphabet Inc.",
        "sector": "Communication Services",
        "industry": "Interactive Media & Services",
        "business": (
            "Runs Google Search, YouTube, the Android and Chrome platforms, and "
            "Google Cloud, monetized primarily through advertising."
        ),
        "position": (
            "Controls the world's dominant search and video advertising funnels; "
            "the key debate is whether generative AI disrupts or extends that "
            "franchise."
        ),
    },
    "META": {
        "name": "Meta Platforms, Inc.",
        "sector": "Communication Services",
        "industry": "Interactive Media & Services",
        "business": (
            "Operates the Facebook, Instagram, WhatsApp, and Messenger family of "
            "apps monetized by advertising, and invests in Reality Labs "
            "(AR/VR/metaverse)."
        ),
        "position": (
            "Reaches roughly half the world's internet users daily; a highly "
            "profitable advertising engine funding large, speculative bets."
        ),
    },
    "JPM": {
        "name": "JPMorgan Chase & Co.",
        "sector": "Financials",
        "industry": "Diversified Banks",
        "business": (
            "A universal bank spanning consumer and community banking, corporate "
            "and investment banking, commercial banking, and asset and wealth "
            "management."
        ),
        "position": (
            "The largest U.S. bank by assets, generally regarded as the "
            "best-run money-center bank; earnings are sensitive to interest "
            "rates, credit cycles, and capital-markets activity."
        ),
    },
}

TICKERS = list(COMPANIES.keys())
ALL_SYMBOLS = TICKERS + [BENCHMARK]

# --------------------------------------------------------------------------- #
# Data window
# --------------------------------------------------------------------------- #
# Yahoo "range" string for the price download. 5y balances a meaningful sample
# against keeping the study centered on the current business regime.
HISTORY_RANGE = "5y"
INTERVAL = "1d"

# --------------------------------------------------------------------------- #
# Analytics parameters
# --------------------------------------------------------------------------- #
TRADING_DAYS = 252            # trading days per year for annualization
ROLLING_WINDOW = 60           # window (days) for rolling volatility / correlation
RISK_FREE_ANNUAL = 0.04       # annual risk-free rate assumed for Sharpe ratio

# Portfolio construction. Default is an equal-weight book across the eight names;
# edit these weights (they should sum to 1.0) to study a different allocation.
PORTFOLIO_WEIGHTS: dict[str, float] = {t: 1.0 / len(TICKERS) for t in TICKERS}

# Recommendation thresholds (Sharpe ratio) used by the rules-based thesis engine.
SHARPE_BUY = 1.0
SHARPE_HOLD = 0.4

# Plot styling
FIGSIZE = (11, 6)
DPI = 130
