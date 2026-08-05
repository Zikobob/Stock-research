"""
Layer 4 -- Stock research report generator.

For each holding, generates a structured, institutional-style Markdown research
note with four sections:

  A. Company overview      -- business model and industry position (from config)
  B. Quantitative performance -- return, volatility, Sharpe, beta, correlation
  C. Risk analysis         -- drawdown, downside risk, market sensitivity, sector
  D. Investment thesis     -- bullish case, bearish case, rules-based recommendation

The thesis engine is deliberately transparent: the bull/bear points and the
final Buy / Hold / Avoid tilt are derived from the computed statistics via
explicit rules (documented in :func:`_recommendation`), then framed with the
qualitative company context. Nothing here is investment advice.
"""
from __future__ import annotations

import os

import pandas as pd

from . import config


# --------------------------------------------------------------------------- #
# Rules-based thesis engine
# --------------------------------------------------------------------------- #
def _recommendation(row: pd.Series) -> tuple[str, str]:
    """Map a holding's Sharpe ratio to a Buy / Hold / Avoid tilt.

    Sharpe is used as the headline screen because it combines return and risk in
    one scale-free number. Thresholds live in ``config`` so the rule is tunable.
    Returns ``(label, one_line_rationale)``.
    """
    s = row["sharpe"]
    if s >= config.SHARPE_BUY:
        return ("BUY-tilt", f"Risk-adjusted return is strong (Sharpe {s:.2f} ≥ {config.SHARPE_BUY:.1f}).")
    if s >= config.SHARPE_HOLD:
        return ("HOLD", f"Risk-adjusted return is fair (Sharpe {s:.2f}).")
    return ("AVOID-tilt", f"Risk-adjusted return is weak (Sharpe {s:.2f} < {config.SHARPE_HOLD:.1f}); "
                        "the volatility has not been paid for over this window.")


def _bull_points(sym: str, row: pd.Series, market_mean: float) -> list[str]:
    """Assemble data-driven bullish arguments."""
    pts = []
    if row["ann_return"] > market_mean:
        pts.append(f"Outperformed the market on an absolute basis "
                f"({row['ann_return'] * 100:.1f}% vs {market_mean * 100:.1f}% annualized).")
    if row["sharpe"] >= config.SHARPE_BUY:
        pts.append(f"Attractive risk-adjusted return (Sharpe {row['sharpe']:.2f}).")
    if row["alpha_annual"] > 0:
        pts.append(f"Positive annualized alpha ({row['alpha_annual'] * 100:+.1f}%) — return beyond "
                f"what its market beta explains.")
    if row["beta"] > 1.15:
        pts.append(f"High beta ({row['beta']:.2f}) offers leveraged upside in market rallies.")
    if row["max_drawdown"] > -0.35:
        pts.append(f"Comparatively shallow worst drawdown ({row['max_drawdown'] * 100:.1f}%) "
                "for a single stock.")
    if not pts:
        pts.append("Franchise quality and scale (see overview) are not fully captured by the "
                "trailing-window statistics.")
    return pts


def _bear_points(sym: str, row: pd.Series, market_vol: float) -> list[str]:
    """Assemble data-driven bearish arguments."""
    pts = []
    if row["ann_volatility"] > 1.4 * market_vol:
        pts.append(f"Volatility ({row['ann_volatility'] * 100:.1f}%) runs well above the market "
                f"({market_vol * 100:.1f}%) — a rough ride.")
    if row["sharpe"] < config.SHARPE_HOLD:
        pts.append(f"Weak Sharpe ({row['sharpe']:.2f}): risk has not been rewarded over this window.")
    if row["max_drawdown"] < -0.5:
        pts.append(f"Deep peak-to-trough drawdown ({row['max_drawdown'] * 100:.1f}%) shows how far it "
                "can fall.")
    if row["beta"] > 1.5:
        pts.append(f"Very high beta ({row['beta']:.2f}) amplifies losses in market sell-offs.")
    if row["alpha_annual"] < 0:
        pts.append(f"Negative annualized alpha ({row['alpha_annual'] * 100:.1f}%): underperformed "
                "what its market exposure alone would imply.")
    if row["corr_to_market"] > 0.7:
        pts.append(f"High correlation to the market ({row['corr_to_market']:.2f}) limits its "
                "diversification value in a book.")
    if not pts:
        pts.append("Valuation and single-name concentration risk are not visible in the return "
                "statistics and warrant separate fundamental review.")
    return pts


def _risk_sentence(row: pd.Series) -> str:
    """One-line framing of market sensitivity from beta / R²."""
    beta, r2 = row["beta"], row["market_r2"]
    if beta > 1.3:
        sens = "highly sensitive to broad market moves"
    elif beta > 0.9:
        sens = "roughly as sensitive as the market"
    else:
        sens = "less sensitive than the market"
    return (f"With a beta of {beta:.2f}, the stock is {sens}; the market explains "
            f"{r2 * 100:.0f}% of its return variance (R²), leaving {100 - r2 * 100:.0f}% "
            "idiosyncratic.")


# --------------------------------------------------------------------------- #
# Report rendering
# --------------------------------------------------------------------------- #
def build_report(sym: str, metrics: pd.DataFrame) -> str:
    """Render one holding's Markdown research note and return the file path."""
    row = metrics.loc[sym]
    info = config.COMPANIES[sym]
    market_mean = metrics.loc[config.BENCHMARK, "ann_return"]
    market_vol = metrics.loc[config.BENCHMARK, "ann_volatility"]

    label, rationale = _recommendation(row)
    bull = _bull_points(sym, row, market_mean)
    bear = _bear_points(sym, row, market_vol)

    bull_md = "\n".join(f"- {p}" for p in bull)
    bear_md = "\n".join(f"- {p}" for p in bear)

    md = f"""# {info['name']} ({sym}) — Equity Research Note

**Sector:** {info['sector']}  |  **Industry:** {info['industry']}
*Educational research project. Not investment advice.*

---

## A. Company overview

**Business model.** {info['business']}

**Industry position.** {info['position']}

---

## B. Quantitative performance
*Trailing {config.HISTORY_RANGE} of daily log returns, annualized ({config.TRADING_DAYS} trading days).*

| Metric | {sym} | {config.BENCHMARK} | Read |
|---|---|---|---|
| Annualized return | {row['ann_return'] * 100:.1f}% | {market_mean * 100:.1f}% | {'Ahead of' if row['ann_return'] >= market_mean else 'Behind'} the market |
| Annualized volatility | {row['ann_volatility'] * 100:.1f}% | {market_vol * 100:.1f}% | {'More' if row['ann_volatility'] >= market_vol else 'Less'} volatile |
| Sharpe ratio | {row['sharpe']:.2f} | {metrics.loc[config.BENCHMARK, 'sharpe']:.2f} | Risk-adjusted return |
| Beta vs {config.BENCHMARK} | {row['beta']:.2f} | 1.00 | Market sensitivity |
| Annualized alpha | {row['alpha_annual'] * 100:+.1f}% | — | Return beyond beta |
| Correlation to market | {row['corr_to_market']:.2f} | 1.00 | Co-movement |

---

## C. Risk analysis

- **Downside / drawdown.** Worst peak-to-trough decline over the window was
  **{row['max_drawdown'] * 100:.1f}%**. Annualized downside deviation
  (volatility of losing days only) is {row['downside_dev'] * 100:.1f}%.
- **Tail risk.** One-day 95% Value-at-Risk is {row['var_95_daily'] * 100:.2f}%
  and Conditional VaR (average loss in the worst 5% of days) is
  {row['cvar_95_daily'] * 100:.2f}%.
- **Market sensitivity.** {_risk_sentence(row)}
- **Sector exposure.** Concentrated in **{info['sector']}**; the position
  inherits that sector's macro drivers and moves with its peers.

---

## D. Investment thesis

**Bullish arguments**
{bull_md}

**Bearish arguments**
{bear_md}

**Recommendation (rules-based): `{label}`**

{rationale} This tilt is generated mechanically from the trailing risk-adjusted
return and is *not* a substitute for fundamental valuation work or investment
advice.

---
*Generated by the equity research portfolio system. Educational use only.*
"""
    path = os.path.join(config.REPORTS_DIR, f"{sym}_report.md")
    with open(path, "w") as f:
        f.write(md)
    return path


def build_index(metrics: pd.DataFrame, paths: dict[str, str]) -> str:
    """Build a one-page index/leaderboard linking to every report."""
    tickers = [t for t in metrics.index if t != config.BENCHMARK]
    ranked = metrics.loc[tickers].sort_values("sharpe", ascending=False)
    rows = []
    for sym in ranked.index:
        row = ranked.loc[sym]
        label, _ = _recommendation(row)
        rows.append(
            f"| [{sym}]({os.path.basename(paths[sym])}) | {config.COMPANIES[sym]['name']} "
            f"| {row['ann_return'] * 100:.1f}% | {row['ann_volatility'] * 100:.1f}% "
            f"| {row['sharpe']:.2f} | {row['beta']:.2f} | `{label}` |"
        )
    table = "\n".join(rows)
    md = f"""# Equity Research — Company Reports Index

*Educational research project. Not investment advice. Ranked by Sharpe ratio.*

| Ticker | Company | Ann. Return | Ann. Vol | Sharpe | Beta | Tilt |
|---|---|---|---|---|---|---|
{table}

See [`PORTFOLIO_SUMMARY.md`](PORTFOLIO_SUMMARY.md) for the portfolio-level view.

*Recommendation tilts are rules-based on trailing Sharpe ratio
(BUY ≥ {config.SHARPE_BUY:.1f}, HOLD ≥ {config.SHARPE_HOLD:.1f}, else AVOID) and are
not investment advice.*
"""
    path = os.path.join(config.REPORTS_DIR, "INDEX.md")
    with open(path, "w") as f:
        f.write(md)
    return path


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(analysis: dict | None = None) -> list[str]:
    """End-to-end Layer 4: write one report per holding plus an index."""
    from .data_engine import load_processed
    from . import quant_analysis as qa

    print("Layer 4 | Stock research reports")
    if analysis is None:
        analysis = qa.run(load_processed()["log_returns"])
    metrics = analysis["metrics"]

    paths = {sym: build_report(sym, metrics) for sym in config.TICKERS}
    index = build_index(metrics, paths)
    for sym, p in paths.items():
        print(f"  {sym}: {os.path.relpath(p, config.PACKAGE_ROOT)}")
    print(f"  index: {os.path.relpath(index, config.PACKAGE_ROOT)}")
    return list(paths.values()) + [index]


if __name__ == "__main__":
    run()
