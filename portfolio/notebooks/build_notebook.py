"""
Regenerate ``equity_research.ipynb`` -- the narrative walk-through of the
equity research portfolio system.

The notebook imports the same ``portfolio.src`` modules the pipeline uses, so it
never duplicates logic: it just narrates and displays. Run:

    python portfolio/notebooks/build_notebook.py
"""
from __future__ import annotations

import os

import nbformat as nbf
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "equity_research.ipynb")


def md(text: str):
    return new_markdown_cell(text.strip("\n"))


def code(text: str):
    return new_code_cell(text.strip("\n"))


cells = [
    md("""
# Equity Research Portfolio — Interactive Walk-through

A mini institutional equity-research desk in five layers:

1. **Data engine** — daily prices, volume, log returns (Yahoo Finance).
2. **Quantitative analysis** — returns, volatility, Sharpe, beta, correlation, rolling metrics.
3. **Visualization** — publication-quality charts.
4. **Research reports** — a structured note per company.
5. **Portfolio summary** — weighted returns, diversification, sector & correlation risk.

*Educational research project. Nothing here is investment advice.*

> Run order: `Kernel → Restart & Run All`. The first run downloads ~5y of daily
> data once; set `OFFLINE = True` below to reuse the cached CSVs in `data/processed`.
"""),
    code("""
import os, sys
import numpy as np
import pandas as pd

# Make the `portfolio` package importable whether the notebook runs from the
# repo root or the notebooks/ folder.
ROOT = os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
if not os.path.isdir(os.path.join(ROOT, "portfolio")):
    ROOT = os.path.abspath(os.path.join(os.getcwd(), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from portfolio.src import config, data_engine, quant_analysis as qa
from portfolio.src import visualization as viz, report_generator, portfolio_summary

# Route requests through the pre-configured CA bundle if one is present.
_ca = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_ca):
    os.environ.setdefault("REQUESTS_CA_BUNDLE", _ca)

OFFLINE = True   # True -> reuse cached data/processed CSVs; False -> download fresh
print("Universe:", ", ".join(config.TICKERS), "| Benchmark:", config.BENCHMARK)
"""),
    md("## Layer 1 — Data engine\n\nCollect daily OHLCV + adjusted close, clean, align, and build master log-return matrix."),
    code("""
if OFFLINE and os.path.exists(os.path.join(config.PROCESSED_DIR, "master_log_returns.csv")):
    datasets = data_engine.load_processed()
else:
    datasets = data_engine.run()

adj_close   = datasets["adj_close"]
volume      = datasets["volume"]
log_returns = datasets["log_returns"]
print(f"{adj_close.shape[0]} trading days: {adj_close.index.min().date()} -> {adj_close.index.max().date()}")
adj_close.tail()
"""),
    md("## Layer 2 — Quantitative analysis\n\nPer-asset return, volatility, Sharpe, beta/alpha vs SPY, drawdown and tail-risk metrics."),
    code("""
analysis = qa.run(log_returns)
metrics  = analysis["metrics"]
metrics.style.format({
    "ann_return": "{:.1%}", "ann_volatility": "{:.1%}", "sharpe": "{:.2f}",
    "beta": "{:.2f}", "alpha_annual": "{:.1%}", "market_r2": "{:.2f}",
    "max_drawdown": "{:.1%}", "var_95_daily": "{:.2%}", "cvar_95_daily": "{:.2%}",
    "downside_dev": "{:.1%}", "corr_to_market": "{:.2f}",
})
"""),
    md("### Correlation matrix"),
    code("analysis['correlation'].style.format('{:.2f}').background_gradient(cmap='coolwarm', vmin=0, vmax=1)"),
    md("## Layer 3 — Visualization\n\nRegenerate the full chart deck and display a few inline."),
    code("""
viz.apply_style()
paths = viz.run(datasets, analysis)
print("Charts written to:", os.path.relpath(config.CHARTS_DIR, ROOT))
[os.path.basename(p) for p in paths]
"""),
    code("""
from IPython.display import Image, display
for name in ["01_normalized_prices.png", "03_correlation_heatmap.png",
            "05_risk_return_scatter.png", "06_portfolio_allocation.png"]:
    display(Image(filename=os.path.join(config.CHARTS_DIR, name)))
"""),
    md("## Layer 4 — Research reports\n\nGenerate a structured Markdown note per holding (overview, quant, risk, thesis)."),
    code("""
report_paths = report_generator.run(analysis)
from IPython.display import Markdown
# Preview the highest-Sharpe name's note.
top = metrics.drop(index=config.BENCHMARK)["sharpe"].idxmax()
Markdown(open(os.path.join(config.REPORTS_DIR, f"{top}_report.md")).read())
"""),
    md("## Layer 5 — Portfolio summary\n\nWeighted return & volatility (from the covariance matrix), diversification ratio, sector & correlation risk."),
    code("""
summary = portfolio_summary.run(datasets, analysis)
stats = summary["stats"]
print(f"Portfolio: return {stats['ann_return']:.1%} | vol {stats['ann_volatility']:.1%} | "
    f"Sharpe {stats['sharpe']:.2f} | beta {stats['beta']:.2f} | "
    f"diversification ratio {stats['diversification_ratio']:.2f}")
Markdown(open(os.path.join(config.REPORTS_DIR, "PORTFOLIO_SUMMARY.md")).read())
"""),
    md("""
## Recap

Everything above is fully reproducible from `portfolio/src`:

```bash
python -m portfolio.src.main            # download + full pipeline
python -m portfolio.src.main --offline  # reuse cached data
```

*Educational research project. Not investment advice.*
"""),
]

nb = new_notebook(cells=cells)
nb.metadata["kernelspec"] = {"display_name": "Python 3", "language": "python", "name": "python3"}
nb.metadata["language_info"] = {"name": "python", "version": "3.11"}

with open(OUT, "w") as f:
    nbf.write(nb, f)
print("wrote", OUT)
