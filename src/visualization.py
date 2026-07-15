"""
Step 7 - Visualizations.

Generates publication-ready figures:
  1. Cumulative sector returns (growth of $1)
  2. Daily return time series (small multiples)
  3. Full-sample correlation heatmap
  4. Rolling average pairwise correlation with regime shading
  5. Regime classification timeline
  6. PCA explained-variance (scree) chart + rolling PC1 co-movement
  7. Model prediction vs actual price (example asset)
  8. Error-distribution comparison across regimes (box / violin)
  9. Directional accuracy by regime (grouped bars)
"""

from __future__ import annotations

import os

import matplotlib
matplotlib.use("Agg")  # headless backend for script/CI use
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from . import config

sns.set_theme(style="whitegrid", context="talk")
plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.dpi"] = 200
plt.rcParams["savefig.bbox"] = "tight"


def _save(fig, name: str) -> str:
    config.ensure_dirs()
    path = os.path.join(config.FIGURES_DIR, name)
    fig.savefig(path)
    plt.close(fig)
    return path


def plot_cumulative_returns(returns: pd.DataFrame) -> str:
    cum = np.exp(returns.cumsum())
    fig, ax = plt.subplots(figsize=(12, 6))
    for col in cum.columns:
        ax.plot(cum.index, cum[col], label=config.TICKER_NAMES.get(col, col))
    ax.set_title("Growth of $1 Invested (Cumulative Log Returns)")
    ax.set_ylabel("Value of $1")
    ax.set_xlabel("Date")
    ax.legend(fontsize=11)
    return _save(fig, "01_cumulative_returns.png")


def plot_return_series(returns: pd.DataFrame) -> str:
    cols = list(returns.columns)
    fig, axes = plt.subplots(len(cols), 1, figsize=(12, 2.2 * len(cols)),
                             sharex=True)
    for ax, col in zip(np.atleast_1d(axes), cols):
        ax.plot(returns.index, returns[col], lw=0.6, color="steelblue")
        ax.set_ylabel(col)
        ax.axhline(0, color="grey", lw=0.5)
    axes[0].set_title("Daily Log Returns by Asset")
    axes[-1].set_xlabel("Date")
    return _save(fig, "02_return_series.png")


def plot_correlation_heatmap(returns: pd.DataFrame) -> str:
    corr = returns.corr()
    fig, ax = plt.subplots(figsize=(8, 6.5))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1,
                square=True, cbar_kws={"label": "Correlation"}, ax=ax)
    ax.set_title("Full-Sample Return Correlation Matrix")
    return _save(fig, "03_correlation_heatmap.png")


def plot_rolling_corr_regimes(regimes: pd.DataFrame) -> str:
    fig, ax = plt.subplots(figsize=(13, 6))
    avg = regimes["avg_pairwise_corr"]
    ax.plot(avg.index, avg, color="black", lw=1.2, label="Avg pairwise corr")
    ax.axhline(regimes["high_threshold"].iloc[0], color="firebrick", ls="--",
               label="High threshold (75th pct)")
    ax.axhline(regimes["low_threshold"].iloc[0], color="navy", ls="--",
               label="Low threshold (25th pct)")
    # Shade regime periods.
    high_mask = regimes["regime"] == "high"
    low_mask = regimes["regime"] == "low"
    ax.fill_between(avg.index, avg.min(), avg.max(), where=high_mask,
                    color="firebrick", alpha=0.12)
    ax.fill_between(avg.index, avg.min(), avg.max(), where=low_mask,
                    color="navy", alpha=0.12)
    ax.set_title("Rolling Average Cross-Sector Correlation & Regimes")
    ax.set_ylabel("Avg pairwise correlation")
    ax.set_xlabel("Date")
    ax.legend(fontsize=11, loc="upper left")
    return _save(fig, "04_rolling_corr_regimes.png")


def plot_regime_timeline(regimes: pd.DataFrame) -> str:
    mapping = {"low": 0, "mid": 1, "high": 2}
    codes = regimes["regime"].map(mapping)
    fig, ax = plt.subplots(figsize=(13, 3.2))
    colors = {0: "navy", 1: "lightgrey", 2: "firebrick"}
    ax.scatter(regimes.index, codes, c=codes.map(colors), s=8)
    ax.set_yticks([0, 1, 2])
    ax.set_yticklabels(["Low", "Mid", "High"])
    ax.set_title("Correlation Regime Classification Over Time")
    ax.set_xlabel("Date")
    return _save(fig, "05_regime_timeline.png")


def plot_pca(pca_static: pd.DataFrame, pca_rolling: pd.Series) -> str:
    fig, axes = plt.subplots(1, 2, figsize=(15, 5.5))
    # Scree / cumulative.
    ax = axes[0]
    ax.bar(pca_static["component"], pca_static["explained_variance_ratio"],
           color="steelblue", label="Individual")
    ax.plot(pca_static["component"], pca_static["cumulative"], color="firebrick",
            marker="o", label="Cumulative")
    ax.set_title("PCA Explained Variance (Full Sample)")
    ax.set_ylabel("Variance explained")
    ax.legend(fontsize=11)
    # Rolling PC1.
    ax = axes[1]
    ax.plot(pca_rolling.index, pca_rolling, color="darkgreen", lw=1.2)
    ax.set_title("Rolling PC1 Variance Explained (Co-movement)")
    ax.set_ylabel("PC1 variance share")
    ax.set_xlabel("Date")
    return _save(fig, "06_pca_analysis.png")


def plot_prediction_vs_actual(universe_forecasts: dict, ticker: str,
                              model: str = "LinearRegression",
                              last_n: int = 250) -> str:
    f = universe_forecasts[ticker][model].tail(last_n)
    fig, ax = plt.subplots(figsize=(13, 6))
    ax.plot(f.index, f["actual_price"], label="Actual", color="black", lw=1.5)
    ax.plot(f.index, f["pred_price"], label=f"{model} prediction",
            color="firebrick", lw=1.0, ls="--")
    ax.set_title(f"{config.TICKER_NAMES.get(ticker, ticker)}: "
                 f"Predicted vs Actual Price (last {last_n} days)")
    ax.set_ylabel("Price ($)")
    ax.set_xlabel("Date")
    ax.legend(fontsize=12)
    return _save(fig, "07_prediction_vs_actual.png")


def plot_error_distribution(pooled: dict, model: str = "LinearRegression") -> str:
    df = pooled[model]
    df = df[df["regime"].isin(["high", "low"])].copy()
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    order = ["low", "high"]
    palette = {"low": "navy", "high": "firebrick"}
    sns.boxplot(data=df, x="regime", y="abs_return_error", order=order,
                hue="regime", palette=palette, legend=False,
                ax=axes[0], showfliers=False)
    axes[0].set_title(f"{model}: Abs. Return Error by Regime")
    axes[0].set_ylabel("|actual - predicted| return")
    axes[0].set_xlabel("Correlation regime")

    for reg in order:
        sns.kdeplot(df[df["regime"] == reg]["abs_return_error"],
                    label=f"{reg} corr", fill=True, alpha=0.3,
                    color=palette[reg], ax=axes[1], clip=(0, None))
    axes[1].set_title(f"{model}: Error Density by Regime")
    axes[1].set_xlabel("|actual - predicted| return")
    axes[1].legend(fontsize=12)
    return _save(fig, "08_error_distribution.png")


def plot_directional_accuracy(summary: pd.DataFrame) -> str:
    df = summary[summary["regime"].isin(["high", "low"])].copy()
    fig, ax = plt.subplots(figsize=(12, 6))
    sns.barplot(data=df, x="model", y="Directional_Accuracy", hue="regime",
                hue_order=["low", "high"],
                palette={"low": "navy", "high": "firebrick"}, ax=ax)
    ax.axhline(0.5, color="grey", ls="--", label="Random (50%)")
    ax.set_title("Directional Accuracy by Model and Regime")
    ax.set_ylabel("Directional accuracy")
    ax.set_xlabel("Model")
    ax.set_ylim(0.4, max(0.6, df["Directional_Accuracy"].max() + 0.05))
    ax.legend(fontsize=11)
    plt.xticks(rotation=20)
    return _save(fig, "09_directional_accuracy.png")


def plot_corr_vol_scatter(predictors: pd.DataFrame) -> str:
    """Scatter of lagged correlation vs lagged volatility (collinearity)."""
    r = float(np.corrcoef(predictors["corr_lag"], predictors["vol_lag"])[0, 1])
    fig, ax = plt.subplots(figsize=(9, 7))
    ax.scatter(predictors["corr_lag"], predictors["vol_lag"], s=10,
               alpha=0.35, color="steelblue")
    ax.set_xlabel("Lagged avg cross-sector correlation")
    ax.set_ylabel("Lagged 90-day realized volatility (SPY, annualized)")
    ax.set_title(f"Correlation vs. Volatility are Collinear (r = {r:.2f})")
    return _save(fig, "10_corr_vs_vol_scatter.png")


def plot_double_sort(ds_table: pd.DataFrame,
                     model: str = "LinearRegression") -> str:
    """Grouped bars of MAE by correlation x volatility cell for one model."""
    d = ds_table[ds_table["model"] == model].copy()
    order_c = ["low_corr", "high_corr"]
    order_v = ["low_vol", "high_vol"]
    fig, ax = plt.subplots(figsize=(10, 6.5))
    width = 0.35
    x = np.arange(len(order_c))
    for i, v in enumerate(order_v):
        vals = [d[(d["corr"] == c) & (d["vol"] == v)]["MAE_return"].values[0]
                for c in order_c]
        ns = [int(d[(d["corr"] == c) & (d["vol"] == v)]["n_obs"].values[0])
              for c in order_c]
        bars = ax.bar(x + (i - 0.5) * width, vals, width,
                      label=v.replace("_", " "),
                      color="navy" if v == "low_vol" else "firebrick",
                      alpha=0.85)
        for b, n in zip(bars, ns):
            ax.text(b.get_x() + b.get_width() / 2, b.get_height(),
                    f"n={n}", ha="center", va="bottom", fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels(["Low correlation", "High correlation"])
    ax.set_ylabel("Mean abs. return error (MAE)")
    ax.set_title(f"Double Sort: Volatility Dominates, Not Correlation "
                 f"({model})")
    ax.legend(title="Volatility", fontsize=12)
    return _save(fig, "11_double_sort.png")


def run(returns, regimes, pca_static, pca_rolling, universe_forecasts,
        pooled, summary) -> list[str]:
    paths = []
    paths.append(plot_cumulative_returns(returns))
    paths.append(plot_return_series(returns))
    paths.append(plot_correlation_heatmap(returns))
    paths.append(plot_rolling_corr_regimes(regimes))
    paths.append(plot_regime_timeline(regimes))
    paths.append(plot_pca(pca_static, pca_rolling))
    paths.append(plot_prediction_vs_actual(universe_forecasts, config.MARKET_TICKER))
    paths.append(plot_error_distribution(pooled))
    paths.append(plot_directional_accuracy(summary))
    for p in paths:
        print(f"[visualization] Saved {os.path.basename(p)}")
    return paths
