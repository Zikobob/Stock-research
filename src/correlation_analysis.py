"""
Step 3 - Correlation structure analysis.

Builds a time series of the average pairwise correlation among the sector ETFs
using a rolling window, classifies each day into a high / low / mid correlation
regime by quartiles, and computes a rolling PCA co-movement measure (the share
of variance explained by the first principal component).
"""

from __future__ import annotations

import os
from itertools import combinations

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

from . import config


def rolling_average_pairwise_correlation(
    returns: pd.DataFrame,
    tickers: list[str] | None = None,
    window: int | None = None,
) -> pd.Series:
    """Average of all unique pairwise rolling correlations among `tickers`.

    For each day, the trailing `window` of returns is used to estimate the
    correlation between every sector pair; the mean across the C(n, 2) pairs is
    the day's cross-sector correlation level.
    """
    tickers = tickers or config.SECTOR_TICKERS
    window = window or config.ROLLING_CORR_WINDOW

    sub = returns[tickers]
    pair_corrs = {}
    for a, b in combinations(tickers, 2):
        pair_corrs[f"{a}-{b}"] = sub[a].rolling(window).corr(sub[b])

    pair_df = pd.DataFrame(pair_corrs)
    avg_corr = pair_df.mean(axis=1)
    avg_corr.name = "avg_pairwise_corr"
    # Drop the leading window where the rolling estimate is undefined.
    return avg_corr.dropna()


def pairwise_correlation_frame(
    returns: pd.DataFrame,
    tickers: list[str] | None = None,
    window: int | None = None,
) -> pd.DataFrame:
    """Return the full DataFrame of individual rolling pairwise correlations."""
    tickers = tickers or config.SECTOR_TICKERS
    window = window or config.ROLLING_CORR_WINDOW

    sub = returns[tickers]
    pair_corrs = {}
    for a, b in combinations(tickers, 2):
        pair_corrs[f"{a}-{b}"] = sub[a].rolling(window).corr(sub[b])
    return pd.DataFrame(pair_corrs).dropna()


def classify_regimes(
    avg_corr: pd.Series,
    high_q: float | None = None,
    low_q: float | None = None,
) -> pd.DataFrame:
    """Label each day high / low / mid by quartiles of average correlation.

    Returns a DataFrame with the avg correlation, the two thresholds, and a
    categorical `regime` column.
    """
    high_q = high_q if high_q is not None else config.HIGH_REGIME_QUANTILE
    low_q = low_q if low_q is not None else config.LOW_REGIME_QUANTILE

    high_thr = avg_corr.quantile(high_q)
    low_thr = avg_corr.quantile(low_q)

    regime = pd.Series("mid", index=avg_corr.index, name="regime")
    regime[avg_corr >= high_thr] = "high"
    regime[avg_corr <= low_thr] = "low"

    out = pd.DataFrame({
        "avg_pairwise_corr": avg_corr,
        "high_threshold": high_thr,
        "low_threshold": low_thr,
        "regime": regime,
    })
    return out


def rolling_pca_comovement(
    returns: pd.DataFrame,
    tickers: list[str] | None = None,
    window: int | None = None,
) -> pd.Series:
    """Rolling share of variance explained by the first principal component.

    PC1's explained-variance ratio is a market-wide co-movement gauge: when
    sectors move together, a single factor captures most of the variance.
    """
    tickers = tickers or config.SECTOR_TICKERS
    window = window or config.PCA_ROLLING_WINDOW

    sub = returns[tickers].dropna()
    values = sub.values
    idx = sub.index
    out = pd.Series(index=idx, dtype=float, name="pc1_var_explained")

    for i in range(window, len(sub) + 1):
        chunk = values[i - window:i]
        # Standardize within the window so PCA is on the correlation structure.
        chunk = (chunk - chunk.mean(axis=0)) / chunk.std(axis=0, ddof=0)
        pca = PCA(n_components=1)
        pca.fit(chunk)
        out.iloc[i - 1] = pca.explained_variance_ratio_[0]

    return out.dropna()


def static_pca_variance(
    returns: pd.DataFrame,
    tickers: list[str] | None = None,
) -> pd.DataFrame:
    """Full-sample PCA: explained variance ratio per component."""
    tickers = tickers or config.SECTOR_TICKERS
    sub = returns[tickers].dropna()
    std = (sub - sub.mean()) / sub.std(ddof=0)
    pca = PCA()
    pca.fit(std.values)
    return pd.DataFrame({
        "component": [f"PC{i+1}" for i in range(len(tickers))],
        "explained_variance_ratio": pca.explained_variance_ratio_,
        "cumulative": np.cumsum(pca.explained_variance_ratio_),
    })


def save_outputs(regimes: pd.DataFrame, pair_df: pd.DataFrame,
                 pca_roll: pd.Series, pca_static: pd.DataFrame) -> dict[str, str]:
    config.ensure_dirs()
    paths = {
        "regimes": os.path.join(config.PROCESSED_DATA_DIR, "regimes.csv"),
        "pairwise": os.path.join(
            config.PROCESSED_DATA_DIR, "rolling_pairwise_corr.csv"
        ),
        "pca_rolling": os.path.join(
            config.PROCESSED_DATA_DIR, "rolling_pca_comovement.csv"
        ),
        "pca_static": os.path.join(config.RESULTS_DIR, "pca_static_variance.csv"),
    }
    regimes.to_csv(paths["regimes"])
    pair_df.to_csv(paths["pairwise"])
    pca_roll.to_csv(paths["pca_rolling"])
    pca_static.to_csv(paths["pca_static"], index=False)
    return paths


def run(returns: pd.DataFrame) -> dict:
    """Run the full correlation-structure analysis.

    Returns a dict with the regime frame, pairwise correlations, rolling PCA
    series, and static PCA table.
    """
    avg_corr = rolling_average_pairwise_correlation(returns)
    regimes = classify_regimes(avg_corr)
    pair_df = pairwise_correlation_frame(returns)
    pca_roll = rolling_pca_comovement(returns)
    pca_static = static_pca_variance(returns)

    paths = save_outputs(regimes, pair_df, pca_roll, pca_static)

    counts = regimes["regime"].value_counts()
    print(f"[correlation_analysis] Avg pairwise corr: "
          f"mean={avg_corr.mean():.3f}, min={avg_corr.min():.3f}, "
          f"max={avg_corr.max():.3f}")
    print(f"[correlation_analysis] Regime day counts: {counts.to_dict()}")
    print(f"[correlation_analysis] High threshold="
          f"{regimes['high_threshold'].iloc[0]:.3f}, "
          f"low threshold={regimes['low_threshold'].iloc[0]:.3f}")
    print(f"[correlation_analysis] PC1 explains "
          f"{pca_static['explained_variance_ratio'].iloc[0]:.1%} of variance "
          f"(full sample)")
    for name, p in paths.items():
        print(f"[correlation_analysis] Saved {name} -> {p}")

    return {
        "avg_corr": avg_corr,
        "regimes": regimes,
        "pairwise": pair_df,
        "pca_rolling": pca_roll,
        "pca_static": pca_static,
    }


if __name__ == "__main__":
    from . import data_collection, data_processing

    raw = data_collection.run()
    _, returns = data_processing.run(raw)
    run(returns)
