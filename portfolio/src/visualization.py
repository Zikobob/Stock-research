"""
Layer 3 -- Visualization module.

Generates publication-quality, consistently styled PNG charts:

1. Normalized price history (growth of $1).
2. Annualized-return comparison bar chart.
3. Correlation heatmap.
4. Rolling volatility.
5. Risk vs return scatter (with Sharpe context).
6. Portfolio allocation (weights and sector exposure).
7. Drawdown curves.
8. Rolling correlation to the market.

Every figure shares one house style (set in :func:`apply_style`), carries clear
titles/labels, and is exported at a consistent DPI so the set reads as one
coherent research deck.
"""
from __future__ import annotations

import os

import matplotlib
matplotlib.use("Agg")  # headless-safe backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from . import config

# House palette: one stable colour per symbol so a name looks the same in every
# chart across the deck.
_PALETTE = dict(zip(config.TICKERS, sns.color_palette("tab10", len(config.TICKERS))))
_PALETTE[config.BENCHMARK] = (0.25, 0.25, 0.25)


def apply_style() -> None:
    """Apply the shared house style for the whole figure set."""
    sns.set_theme(style="whitegrid", context="notebook")
    plt.rcParams.update(
        {
            "figure.figsize": config.FIGSIZE,
            "figure.dpi": config.DPI,
            "savefig.dpi": config.DPI,
            "savefig.bbox": "tight",
            "axes.titlesize": 14,
            "axes.titleweight": "bold",
            "axes.labelsize": 11,
            "font.size": 10,
        }
    )


def _save(fig: plt.Figure, filename: str) -> str:
    """Save a figure to the charts directory and close it."""
    path = os.path.join(config.CHARTS_DIR, filename)
    fig.savefig(path)
    plt.close(fig)
    return path


def _color(sym: str):
    return _PALETTE.get(sym, None)


# --------------------------------------------------------------------------- #
# Individual charts
# --------------------------------------------------------------------------- #
def plot_normalized_prices(adj_close: pd.DataFrame, filename="01_normalized_prices.png") -> str:
    """Growth of $1: every series rebased to 1.0 at the start of the window."""
    norm = adj_close / adj_close.iloc[0]
    fig, ax = plt.subplots()
    for sym in norm.columns:
        ax.plot(norm.index, norm[sym], label=sym, color=_color(sym),
                linewidth=2 if sym == config.BENCHMARK else 1.3,
                linestyle="--" if sym == config.BENCHMARK else "-")
    ax.set_title("Normalized Price History: Growth of $1")
    ax.set_ylabel("Value of $1 invested")
    ax.set_xlabel("Date")
    ax.legend(ncol=3, fontsize=9)
    return _save(fig, filename)


def plot_return_comparison(metrics: pd.DataFrame, filename="02_return_comparison.png") -> str:
    """Annualized return by name, benchmark line overlaid for context."""
    tickers = [t for t in metrics.index if t != config.BENCHMARK]
    data = metrics.loc[tickers, "ann_return"].sort_values()
    fig, ax = plt.subplots()
    colors = [_color(s) for s in data.index]
    ax.barh(data.index, data.values * 100, color=colors)
    bench = metrics.loc[config.BENCHMARK, "ann_return"] * 100
    ax.axvline(bench, color="black", linestyle="--", linewidth=1.5,
            label=f"{config.BENCHMARK} benchmark ({bench:.1f}%)")
    ax.set_title("Annualized Return by Holding")
    ax.set_xlabel("Annualized return (%)")
    ax.legend()
    return _save(fig, filename)


def plot_correlation_heatmap(corr: pd.DataFrame, filename="03_correlation_heatmap.png") -> str:
    """Full-sample return correlation heatmap."""
    fig, ax = plt.subplots(figsize=(8, 6.5))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0,
                vmin=0, vmax=1, square=True, linewidths=0.5,
                cbar_kws={"label": "Correlation"}, ax=ax)
    ax.set_title("Return Correlation Matrix (daily log returns)")
    return _save(fig, filename)


def plot_rolling_volatility(roll_vol: pd.DataFrame, filename="04_rolling_volatility.png") -> str:
    """Annualized rolling volatility over time."""
    fig, ax = plt.subplots()
    for sym in roll_vol.columns:
        ax.plot(roll_vol.index, roll_vol[sym] * 100, label=sym,
                color=_color(sym), linewidth=1.2)
    ax.set_title(f"{config.ROLLING_WINDOW}-Day Rolling Annualized Volatility")
    ax.set_ylabel("Annualized volatility (%)")
    ax.set_xlabel("Date")
    ax.legend(ncol=3, fontsize=9)
    return _save(fig, filename)


def plot_risk_return(metrics: pd.DataFrame, filename="05_risk_return_scatter.png") -> str:
    """Risk (x) vs return (y) scatter; marker size scales with Sharpe."""
    fig, ax = plt.subplots()
    for sym, row in metrics.iterrows():
        size = 120 + max(row["sharpe"], 0) * 260
        ax.scatter(row["ann_volatility"] * 100, row["ann_return"] * 100,
                s=size, color=_color(sym), alpha=0.8,
                edgecolor="black", linewidth=0.6, zorder=3)
        ax.annotate(sym, (row["ann_volatility"] * 100, row["ann_return"] * 100),
                    xytext=(6, 4), textcoords="offset points", fontsize=9, weight="bold")
    ax.axhline(0, color="grey", linewidth=0.8)
    ax.set_title("Risk vs Return (marker size ∝ Sharpe ratio)")
    ax.set_xlabel("Annualized volatility (%)")
    ax.set_ylabel("Annualized return (%)")
    return _save(fig, filename)


def plot_allocation(weights: dict[str, float], filename="06_portfolio_allocation.png") -> str:
    """Two-panel allocation view: weight by name, and aggregated by sector."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 6))

    syms = list(weights.keys())
    vals = [weights[s] * 100 for s in syms]
    ax1.pie(vals, labels=syms, autopct="%1.1f%%", startangle=90,
            colors=[_color(s) for s in syms],
            wedgeprops={"edgecolor": "white", "linewidth": 1})
    ax1.set_title("Allocation by Holding")

    # Aggregate weights up to GICS sector.
    sector_w: dict[str, float] = {}
    for s, w in weights.items():
        sec = config.COMPANIES[s]["sector"]
        sector_w[sec] = sector_w.get(sec, 0.0) + w
    sec_names = list(sector_w.keys())
    sec_vals = [sector_w[s] * 100 for s in sec_names]
    sns.barplot(x=sec_vals, y=sec_names, ax=ax2, palette="viridis", hue=sec_names, legend=False)
    ax2.set_title("Allocation by Sector")
    ax2.set_xlabel("Weight (%)")
    for i, v in enumerate(sec_vals):
        ax2.text(v + 0.5, i, f"{v:.1f}%", va="center", fontsize=9)
    fig.suptitle("Portfolio Allocation", fontsize=15, fontweight="bold")
    return _save(fig, filename)


def plot_drawdowns(log_returns: pd.DataFrame, filename="07_drawdowns.png") -> str:
    """Underwater (drawdown) curves for each name."""
    fig, ax = plt.subplots()
    for sym in config.TICKERS:
        equity = np.exp(log_returns[sym].cumsum())
        dd = (equity / equity.cummax() - 1.0) * 100
        ax.plot(dd.index, dd, label=sym, color=_color(sym), linewidth=1.1)
    ax.set_title("Drawdown Curves (peak-to-trough decline)")
    ax.set_ylabel("Drawdown (%)")
    ax.set_xlabel("Date")
    ax.legend(ncol=3, fontsize=9)
    return _save(fig, filename)


def plot_rolling_corr_market(roll_corr: pd.DataFrame, filename="08_rolling_corr_market.png") -> str:
    """Rolling correlation of each name to the market benchmark."""
    fig, ax = plt.subplots()
    for sym in roll_corr.columns:
        ax.plot(roll_corr.index, roll_corr[sym], label=sym, color=_color(sym), linewidth=1.1)
    ax.set_title(f"{config.ROLLING_WINDOW}-Day Rolling Correlation to {config.BENCHMARK}")
    ax.set_ylabel(f"Correlation to {config.BENCHMARK}")
    ax.set_xlabel("Date")
    ax.set_ylim(-0.1, 1.05)
    ax.legend(ncol=3, fontsize=9)
    return _save(fig, filename)


def plot_prediction_accuracy(pred_metrics: pd.DataFrame,
                            filename="09_prediction_accuracy.png") -> str:
    """Heatmap of directional accuracy (models x stocks), centered on a coin flip."""
    pivot = pred_metrics.pivot(index="model", columns="symbol",
                            values="directional_accuracy")
    # Keep a sensible model order and the portfolio ticker order.
    pivot = pivot.reindex(index=["RandomWalk", "RidgeReturn", "LogisticDir", "RandomForest"],
                        columns=config.TICKERS)
    fig, ax = plt.subplots(figsize=(11, 4.2))
    sns.heatmap(pivot * 100, annot=True, fmt=".1f", cmap="RdYlGn", center=50,
                vmin=44, vmax=56, linewidths=0.5,
                cbar_kws={"label": "Directional accuracy (%)"}, ax=ax)
    ax.set_title("Next-Day Directional Accuracy: green beats a coin flip (50%)")
    ax.set_xlabel("")
    ax.set_ylabel("")
    return _save(fig, filename)


def plot_prediction_vs_coinflip(pred_metrics: pd.DataFrame,
                                filename="10_prediction_vs_coinflip.png") -> str:
    """Best-model accuracy per stock as deviation from the 50% coin-flip line."""
    best = (pred_metrics.sort_values("directional_accuracy", ascending=False)
            .groupby("symbol").head(1).set_index("symbol").reindex(config.TICKERS))
    fig, ax = plt.subplots()
    vals = (best["directional_accuracy"] - 0.5) * 100
    colors = [_PALETTE.get(s) for s in best.index]
    ax.bar(best.index, vals, color=colors, edgecolor="black", linewidth=0.5)
    ax.axhline(0, color="black", linewidth=1.2)
    ax.set_title("Best Model's Edge Over a Coin Flip (percentage points)")
    ax.set_ylabel("Directional accuracy − 50% (pp)")
    ax.set_ylim(-2, 5)
    for s, v in zip(best.index, vals):
        ax.annotate(f"{best.loc[s, 'model']}", (s, v), xytext=(0, 3 if v >= 0 else -12),
                    textcoords="offset points", ha="center", fontsize=7, rotation=0)
    return _save(fig, filename)


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(datasets: dict | None = None, analysis: dict | None = None,
        weights: dict[str, float] | None = None,
        pred_metrics: pd.DataFrame | None = None) -> list[str]:
    """Generate the full chart deck and return the list of saved paths."""
    from .data_engine import load_processed
    from . import quant_analysis as qa

    print("Layer 3 | Visualization")
    apply_style()

    if datasets is None:
        datasets = load_processed()
    if analysis is None:
        analysis = qa.run(datasets["log_returns"])
    weights = weights or config.PORTFOLIO_WEIGHTS

    adj_close = datasets["adj_close"]
    log_returns = datasets["log_returns"]

    paths = [
        plot_normalized_prices(adj_close),
        plot_return_comparison(analysis["metrics"]),
        plot_correlation_heatmap(analysis["correlation"]),
        plot_rolling_volatility(analysis["rolling_vol"]),
        plot_risk_return(analysis["metrics"]),
        plot_allocation(weights),
        plot_drawdowns(log_returns),
        plot_rolling_corr_market(analysis["rolling_corr"]),
    ]
    # Prediction charts (Layer 6), only if prediction metrics were supplied.
    if pred_metrics is not None:
        paths.append(plot_prediction_accuracy(pred_metrics))
        paths.append(plot_prediction_vs_coinflip(pred_metrics))
    for p in paths:
        print(f"  saved {os.path.relpath(p, config.PACKAGE_ROOT)}")
    return paths


if __name__ == "__main__":
    run()
