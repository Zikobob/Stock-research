"""
Layer 5 -- Portfolio summary module.

Combines the individual holdings into a single book and computes the
portfolio-level statistics an allocator cares about:

* weighted (portfolio) return and volatility computed from the full covariance
  matrix -- so cross-asset diversification is captured correctly, not just a
  weighted average of standalone vols,
* the diversification ratio and average pairwise correlation,
* sector-exposure breakdown,
* a concentration read (effective number of names / Herfindahl index),
* portfolio beta and Sharpe.

Produces both a machine-readable CSV and a written Markdown summary document.
"""
from __future__ import annotations

import os

import numpy as np
import pandas as pd

from . import config
from . import quant_analysis as qa


def _weight_vector(weights: dict[str, float], tickers: list[str]) -> np.ndarray:
    w = np.array([weights[t] for t in tickers], dtype=float)
    return w / w.sum()  # guard against weights that don't quite sum to 1


def portfolio_statistics(log_returns: pd.DataFrame,
                        weights: dict[str, float] | None = None) -> dict:
    """Compute portfolio-level risk/return statistics from the covariance matrix."""
    weights = weights or config.PORTFOLIO_WEIGHTS
    tickers = list(weights.keys())
    w = _weight_vector(weights, tickers)

    R = log_returns[tickers]
    # Daily portfolio return series (rebalanced daily to target weights).
    port_ret = R.mul(w, axis=1).sum(axis=1)

    # Annualized moments from the covariance matrix.
    mean_daily = R.mean().values
    cov_daily = R.cov().values
    ann_return = float(mean_daily @ w * config.TRADING_DAYS)
    ann_vol = float(np.sqrt(w @ cov_daily @ w) * np.sqrt(config.TRADING_DAYS))
    sharpe = (ann_return - config.RISK_FREE_ANNUAL) / ann_vol if ann_vol else float("nan")

    # Diversification ratio = weighted-average standalone vol / portfolio vol.
    standalone_vol = R.std(ddof=1).values * np.sqrt(config.TRADING_DAYS)
    wavg_vol = float(standalone_vol @ w)
    diversification_ratio = wavg_vol / ann_vol if ann_vol else float("nan")

    # Average pairwise correlation among held names (off-diagonal mean).
    corr = R.corr().values
    iu = np.triu_indices_from(corr, k=1)
    avg_pairwise_corr = float(corr[iu].mean())

    # Concentration: Herfindahl index and its inverse (effective # of holdings).
    hhi = float((w ** 2).sum())
    effective_n = 1.0 / hhi

    # Portfolio beta vs the benchmark.
    beta, alpha, _ = qa.capm_beta_alpha(port_ret, log_returns[config.BENCHMARK])

    return {
        "port_ret_series": port_ret,
        "ann_return": ann_return,
        "ann_volatility": ann_vol,
        "sharpe": sharpe,
        "beta": beta,
        "alpha_annual": alpha,
        "max_drawdown": qa.max_drawdown(port_ret),
        "var_95_daily": qa.historical_var(port_ret, 0.05),
        "cvar_95_daily": qa.conditional_var(port_ret, 0.05),
        "wavg_standalone_vol": wavg_vol,
        "diversification_ratio": diversification_ratio,
        "avg_pairwise_corr": avg_pairwise_corr,
        "hhi": hhi,
        "effective_n": effective_n,
        "weights": dict(zip(tickers, w)),
    }


def sector_exposure(weights: dict[str, float] | None = None) -> pd.DataFrame:
    """Aggregate holding weights up to GICS sector."""
    weights = weights or config.PORTFOLIO_WEIGHTS
    rows: dict[str, float] = {}
    for sym, w in weights.items():
        sec = config.COMPANIES[sym]["sector"]
        rows[sec] = rows.get(sec, 0.0) + w
    df = pd.DataFrame({"sector": list(rows.keys()), "weight": list(rows.values())})
    df["weight"] = df["weight"] / df["weight"].sum()
    return df.sort_values("weight", ascending=False).reset_index(drop=True)


# --------------------------------------------------------------------------- #
# Benchmark comparison
# --------------------------------------------------------------------------- #
def _vs_benchmark(stats: dict, log_returns: pd.DataFrame) -> dict:
    bench = log_returns[config.BENCHMARK]
    return {
        "bench_ann_return": qa.annualized_return(bench),
        "bench_ann_vol": qa.annualized_vol(bench),
        "bench_sharpe": qa.sharpe_ratio(bench),
        "bench_max_dd": qa.max_drawdown(bench),
    }


# --------------------------------------------------------------------------- #
# Written summary document
# --------------------------------------------------------------------------- #
def _corr_risk_note(avg_corr: float) -> str:
    if avg_corr >= 0.6:
        return ("High average pairwise correlation. The book is effectively a "
                "levered bet on a single macro/technology factor; diversification "
                "benefit is limited and drawdowns will tend to cluster.")
    if avg_corr >= 0.4:
        return ("Moderate average pairwise correlation. Some diversification, but "
                "the holdings still tend to move together in risk-off episodes.")
    return ("Low average pairwise correlation. Names diversify one another "
            "reasonably well, dampening portfolio volatility below the "
            "weighted-average of standalone risks.")


def _pca_note(pca: dict | None) -> str:
    """One-paragraph read on systematic risk from the PCA common factor."""
    if not pca:
        return ""
    share = pca["pc1_share"]
    return (f"A principal-component analysis of the holdings' returns confirms this: "
            f"the first principal component (a common market/technology factor) "
            f"alone explains **{share * 100:.0f}%** of the cross-sectional return "
            f"variance. That is the systematic core of the book's risk, which "
            f"holding these particular names together cannot diversify away.")


def write_summary_markdown(stats: dict, sectors: pd.DataFrame,
                        bench: dict, metrics: pd.DataFrame,
                        corr: pd.DataFrame, pca: dict | None = None) -> str:
    """Render the portfolio summary as an institutional-style Markdown document."""
    w = stats["weights"]
    dd_note = _corr_risk_note(stats["avg_pairwise_corr"])

    holdings_rows = "\n".join(
        f"| {s} | {config.COMPANIES[s]['name']} | {config.COMPANIES[s]['sector']} "
        f"| {w[s] * 100:.1f}% | {metrics.loc[s, 'ann_return'] * 100:.1f}% "
        f"| {metrics.loc[s, 'ann_volatility'] * 100:.1f}% | {metrics.loc[s, 'sharpe']:.2f} "
        f"| {metrics.loc[s, 'beta']:.2f} |"
        for s in w
    )
    sector_rows = "\n".join(
        f"| {r.sector} | {r.weight * 100:.1f}% |" for r in sectors.itertuples()
    )

    excess = stats["ann_return"] - bench["bench_ann_return"]

    md = f"""# Portfolio Summary: Model Equity Book

*Educational research project. Not investment advice.*

Equal-weight book of {len(w)} large-cap holdings, benchmarked to {config.BENCHMARK}.
Statistics are computed from {config.HISTORY_RANGE} of daily log returns and are
annualized with the square-root-of-time rule ({config.TRADING_DAYS} trading days).

## 1. Headline metrics

| Metric | Portfolio | {config.BENCHMARK} (benchmark) |
|---|---|---|
| Annualized return | **{stats['ann_return'] * 100:.1f}%** | {bench['bench_ann_return'] * 100:.1f}% |
| Annualized volatility | **{stats['ann_volatility'] * 100:.1f}%** | {bench['bench_ann_vol'] * 100:.1f}% |
| Sharpe ratio (rf={config.RISK_FREE_ANNUAL:.0%}) | **{stats['sharpe']:.2f}** | {bench['bench_sharpe']:.2f} |
| Beta vs {config.BENCHMARK} | {stats['beta']:.2f} | 1.00 |
| Annualized alpha | {stats['alpha_annual'] * 100:.1f}% | — |
| Max drawdown | {stats['max_drawdown'] * 100:.1f}% | {bench['bench_max_dd'] * 100:.1f}% |
| 1-day 95% VaR | {stats['var_95_daily'] * 100:.2f}% | — |
| 1-day 95% CVaR | {stats['cvar_95_daily'] * 100:.2f}% | — |

The book returned **{excess * 100:+.1f}%** annualized {'above' if excess >= 0 else 'below'}
the benchmark, at a beta of {stats['beta']:.2f}.

## 2. Holdings

| Ticker | Company | Sector | Weight | Ann. Return | Ann. Vol | Sharpe | Beta |
|---|---|---|---|---|---|---|---|
{holdings_rows}

## 3. Diversification analysis

| Measure | Value | Reading |
|---|---|---|
| Weighted-avg standalone volatility | {stats['wavg_standalone_vol'] * 100:.1f}% | Risk if holdings moved in lockstep |
| Realized portfolio volatility | {stats['ann_volatility'] * 100:.1f}% | Actual, after diversification |
| **Diversification ratio** | **{stats['diversification_ratio']:.2f}** | >1 means diversification is working |
| Average pairwise correlation | {stats['avg_pairwise_corr']:.2f} | Lower is better diversified |
| Herfindahl index (HHI) | {stats['hhi']:.3f} | Concentration (1/N = {1 / len(w):.3f} if perfectly equal) |
| Effective number of holdings | {stats['effective_n']:.1f} | vs {len(w)} nominal names |

Diversification lowered realized volatility from a weighted-average
{stats['wavg_standalone_vol'] * 100:.1f}% to {stats['ann_volatility'] * 100:.1f}%
(a diversification ratio of {stats['diversification_ratio']:.2f}).

## 4. Sector exposure

| Sector | Weight |
|---|---|
{sector_rows}

The book is technology-tilted; sector concentration is the primary
non-diversifiable exposure and should be read alongside the correlation note below.

## 5. Correlation risk

Average pairwise correlation among the holdings is **{stats['avg_pairwise_corr']:.2f}**.

{dd_note}

{_pca_note(pca)}

The correlation matrix (see `charts/03_correlation_heatmap.png`) shows the
technology and communication-services names clustering tightly, while {config.BENCHMARK}
-relative diversification comes mainly from JPM (Financials), whose return drivers
(rates, credit) differ from the secular-growth names.

## 6. Takeaways

- The portfolio earns its return by taking **above-market beta**
  ({stats['beta']:.2f}) and a technology growth tilt.
- Diversification is **{'limited' if stats['avg_pairwise_corr'] >= 0.5 else 'moderate'}**:
  the names share a common growth/rates factor, so drawdowns cluster.
- The clearest diversifier in the current set is the Financials sleeve (JPM);
  adding uncorrelated exposures (e.g. defensives, energy, international) would
  raise the diversification ratio further.

---
*Generated by the equity research portfolio system. Educational use only. Not investment advice.*
"""
    path = os.path.join(config.REPORTS_DIR, "PORTFOLIO_SUMMARY.md")
    with open(path, "w") as f:
        f.write(md)
    return path


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(datasets: dict | None = None, analysis: dict | None = None,
        weights: dict[str, float] | None = None) -> dict:
    """End-to-end Layer 5: compute stats, save CSV + Markdown."""
    from .data_engine import load_processed

    print("Layer 5 | Portfolio summary")
    if datasets is None:
        datasets = load_processed()
    if analysis is None:
        analysis = qa.run(datasets["log_returns"])
    weights = weights or config.PORTFOLIO_WEIGHTS

    log_returns = datasets["log_returns"]
    stats = portfolio_statistics(log_returns, weights)
    sectors = sector_exposure(weights)
    bench = _vs_benchmark(stats, log_returns)

    # Persist a flat CSV of scalar stats (drop the embedded series/dict).
    flat = {k: v for k, v in stats.items() if k not in ("port_ret_series", "weights")}
    flat.update(bench)
    pd.Series(flat).to_csv(os.path.join(config.PROCESSED_DIR, "portfolio_stats.csv"))
    sectors.to_csv(os.path.join(config.PROCESSED_DIR, "sector_exposure.csv"), index=False)

    path = write_summary_markdown(stats, sectors, bench, analysis["metrics"],
                                analysis["correlation"], analysis.get("pca"))
    print(f"  portfolio ann.return {stats['ann_return'] * 100:.1f}%  "
          f"vol {stats['ann_volatility'] * 100:.1f}%  sharpe {stats['sharpe']:.2f}  "
          f"beta {stats['beta']:.2f}")
    print(f"  wrote {os.path.relpath(path, config.PACKAGE_ROOT)}")
    return {"stats": stats, "sectors": sectors, "bench": bench}


if __name__ == "__main__":
    run()
