"""
Generator for `research_analysis.ipynb`.

Run from the project root:  python notebooks/build_notebook.py

Keeping the notebook in a script form makes it easy to regenerate cleanly and
keeps the repo diff readable.
"""

import nbformat as nbf
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell

nb = new_notebook()
cells = []

cells.append(new_markdown_cell(
    "# Cross-Sector Correlation Regimes and Equity Forecasting Accuracy\n"
    "\n"
    "**Research question:** Do equity price-forecasting models perform more "
    "accurately during periods of *high* cross-sector correlation or *low* "
    "cross-sector correlation?\n"
    "\n"
    "This notebook walks through the full analysis. It reuses the modular code "
    "in `../src/`, so every result here is reproducible end-to-end. You can "
    "either (a) run the saved pipeline outputs loaded from disk, or (b) "
    "re-run the whole pipeline live by executing the optional cell below.\n"
    "\n"
    "**Universe:** XLK (Tech), XLV (Health Care), XLE (Energy), XLF "
    "(Financials), and SPY (S&P 500).\n"
))

cells.append(new_markdown_cell("## 0. Setup"))
cells.append(new_code_cell(
    "import os, sys\n"
    "sys.path.append(os.path.abspath('..'))\n"
    "\n"
    "import numpy as np\n"
    "import pandas as pd\n"
    "import matplotlib.pyplot as plt\n"
    "from IPython.display import Image, display\n"
    "\n"
    "from src import config\n"
    "pd.set_option('display.float_format', lambda x: f'{x:,.4f}')\n"
    "PROC = config.PROCESSED_DATA_DIR\n"
    "RES = config.RESULTS_DIR\n"
    "FIG = config.FIGURES_DIR\n"
    "print('Project root:', config.PROJECT_ROOT)"
))

cells.append(new_markdown_cell(
    "### (Optional) Re-run the entire pipeline live\n"
    "Uncomment and run to regenerate every dataset, figure and result table. "
    "Requires internet access for the Yahoo Finance download (~1-2 min)."
))
cells.append(new_code_cell(
    "# from src import main\n"
    "# main.main()"
))

cells.append(new_markdown_cell(
    "## 1. Data & Descriptive Statistics\n"
    "Five years+ of daily adjusted-close prices, converted to continuously "
    "compounded (log) returns $r_t = \\ln(P_t / P_{t-1})$."
))
cells.append(new_code_cell(
    "prices = pd.read_csv(os.path.join(PROC, 'prices_clean.csv'),\n"
    "                     index_col=0, parse_dates=True)\n"
    "returns = pd.read_csv(os.path.join(PROC, 'log_returns.csv'),\n"
    "                      index_col=0, parse_dates=True)\n"
    "print(f'{len(prices)} trading days: "
    "{prices.index.min().date()} -> {prices.index.max().date()}')\n"
    "display(pd.read_csv(os.path.join(RES, 'summary_statistics.csv'), index_col=0))"
))
cells.append(new_code_cell(
    "display(Image(os.path.join(FIG, '01_cumulative_returns.png')))\n"
    "display(Image(os.path.join(FIG, '02_return_series.png')))"
))

cells.append(new_markdown_cell(
    "## 2. Correlation Structure & Regime Classification\n"
    "We compute rolling pairwise correlations among the four sector ETFs "
    "(90-day window), average them, and label each day as **high** (top "
    "quartile), **low** (bottom quartile), or **mid**."
))
cells.append(new_code_cell(
    "regimes = pd.read_csv(os.path.join(PROC, 'regimes.csv'),\n"
    "                      index_col=0, parse_dates=True)\n"
    "print('Regime day counts:')\n"
    "print(regimes['regime'].value_counts())\n"
    "print(f\"High threshold: {regimes['high_threshold'].iloc[0]:.3f}\")\n"
    "print(f\"Low threshold:  {regimes['low_threshold'].iloc[0]:.3f}\")\n"
    "display(Image(os.path.join(FIG, '03_correlation_heatmap.png')))\n"
    "display(Image(os.path.join(FIG, '04_rolling_corr_regimes.png')))\n"
    "display(Image(os.path.join(FIG, '05_regime_timeline.png')))"
))

cells.append(new_markdown_cell(
    "### Principal Component Analysis (market-wide co-movement)\n"
    "PC1's share of variance is a single-factor co-movement gauge: it rises "
    "when sectors move together."
))
cells.append(new_code_cell(
    "display(pd.read_csv(os.path.join(RES, 'pca_static_variance.csv')))\n"
    "display(Image(os.path.join(FIG, '06_pca_analysis.png')))"
))

cells.append(new_markdown_cell(
    "## 3. Forecasting Models\n"
    "All models produce **walk-forward, one-step-ahead** out-of-sample "
    "forecasts (252-day rolling fit window), so there is no look-ahead bias.\n"
    "\n"
    "- **RandomWalk** (Model A): $P_{t+1}=P_t$.\n"
    "- **AR(1)** / **LinearRegression** (Model B): returns on lagged returns.\n"
    "- **Ridge** / **Lasso**: regularized extensions.\n"
))
cells.append(new_code_cell(
    "summary = pd.read_csv(os.path.join(RES, 'metrics_by_regime.csv'))\n"
    "display(summary)"
))
cells.append(new_code_cell(
    "display(Image(os.path.join(FIG, '07_prediction_vs_actual.png')))"
))

cells.append(new_markdown_cell(
    "## 4. Does accuracy differ across regimes?\n"
    "The scale-free metric is the **return-space error**; price MAE is not "
    "comparable across regimes because price *levels* drift over time. We "
    "compare absolute return errors in the high vs low regime."
))
cells.append(new_code_cell(
    "display(Image(os.path.join(FIG, '08_error_distribution.png')))\n"
    "display(Image(os.path.join(FIG, '09_directional_accuracy.png')))"
))

cells.append(new_markdown_cell(
    "## 5. Hypothesis Testing\n"
    "$H_0$: prediction accuracy is independent of the correlation regime.  \n"
    "$H_1$: prediction accuracy differs between high and low regimes.\n"
    "\n"
    "Welch's t-test (means) and the Mann-Whitney U test (distribution-free) on "
    "absolute return errors; a two-proportion z-test on directional accuracy."
))
cells.append(new_code_cell(
    "tests = pd.read_csv(os.path.join(RES, 'hypothesis_tests.csv'))\n"
    "cols = ['model','mean_abs_err_high','mean_abs_err_low','t_pvalue',\n"
    "        'mannwhitney_pvalue','dir_acc_high','dir_acc_low','cohens_d']\n"
    "display(tests[cols])"
))
cells.append(new_code_cell(
    "for _, r in tests.iterrows():\n"
    "    better = 'HIGH' if r['mean_abs_err_high'] < r['mean_abs_err_low'] else 'LOW'\n"
    "    sig = 'REJECT H0' if r['mannwhitney_pvalue'] < 0.05 else 'fail to reject H0'\n"
    "    print(f\"{r['model']:>17}: lower error in {better}-corr regime | \"\n"
    "          f\"MW p={r['mannwhitney_pvalue']:.2e} -> {sig}\")"
))

cells.append(new_markdown_cell(
    "## 6. The confound: is it correlation, or just volatility?\n"
    "The result above is **descriptive**. High correlation is collinear with "
    "high volatility, so a critic can argue we are only measuring *bigger moves "
    "= bigger errors*. We test this directly with a lagged volatility proxy "
    "(90-day realized volatility of SPY, through $t-1$).\n"
    "\n"
    "Run `python -m src.confound_analysis` to regenerate these tables."
))
cells.append(new_code_cell(
    "reg = pd.read_csv(os.path.join(RES, 'confound_regression.csv'))\n"
    "print(f\"corr-vol correlation: {reg['corr_vol_correlation'].iloc[0]:.3f}\")\n"
    "show = reg[['model','b_corr_only','p_corr_only','b_corr_joint',\n"
    "            'p_corr_joint','b_vol_joint','p_vol_joint','r2_joint']]\n"
    "display(show)\n"
    "display(Image(os.path.join(FIG, '10_corr_vs_vol_scatter.png')))"
))
cells.append(new_markdown_cell(
    "**Read the coefficients:** correlation is significant *alone* "
    "(`p_corr_only` ≈ 0.017) but collapses to insignificance once volatility is "
    "added (`p_corr_joint` ≈ 0.72–0.79, coefficient ≈ 0), while volatility stays "
    "highly significant (`p_vol_joint` ≈ 3–6×10⁻⁶). Adding correlation on top of "
    "volatility barely moves R². The correlation 'effect' is a volatility "
    "artifact."
))
cells.append(new_code_cell(
    "ds = pd.read_csv(os.path.join(RES, 'double_sort.csv'))\n"
    "lr = ds[ds['model']=='LinearRegression'].pivot(index='corr', columns='vol',\n"
    "        values='MAE_return')\n"
    "print('MAE by correlation x volatility (LinearRegression):')\n"
    "display(lr)\n"
    "display(Image(os.path.join(FIG, '11_double_sort.png')))"
))
cells.append(new_markdown_cell(
    "In the 2×2 sort, **volatility dominates** (low-vol cells ≈ 0.007, high-vol "
    "cells ≈ 0.010–0.012). Within a fixed volatility level the correlation "
    "effect is small and even **flips sign** (in the low-vol row, high "
    "correlation has *lower* error). No robust independent correlation effect."
))

cells.append(new_markdown_cell(
    "## 7. Conclusion\n"
    "Descriptively, forecast errors are ~58–62% larger in high cross-sector "
    "correlation regimes and both tests reject $H_0$. **But that is not an "
    "independent correlation effect.** Correlation is collinear with volatility "
    "($r = 0.64$); once volatility is controlled with a lagged, "
    "look-ahead-free proxy, the correlation regime adds *no* information about "
    "forecast accuracy (joint-regression $p \\approx 0.72\\text{–}0.79$), while "
    "volatility remains strongly significant. A 2×2 double sort confirms it.\n"
    "\n"
    "**Honest bottom line:** the correlation regime predicts poor forecast "
    "accuracy *only because it proxies for volatility*. Volatility, not "
    "correlation, drives short-horizon predictability — consistent with Forbes "
    "& Rigobon (2002).\n"
    "\n"
    "See `../paper/research_paper.md` for the full write-up."
))

nb["cells"] = cells
nb["metadata"] = {
    "kernelspec": {"display_name": "Python 3", "language": "python",
                   "name": "python3"},
    "language_info": {"name": "python", "version": "3.11"},
}

out = "research_analysis.ipynb"
import os
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), out)
with open(out_path, "w") as f:
    nbf.write(nb, f)
print("Wrote", out_path)
