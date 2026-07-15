# Cross-Sector Correlation Regimes and Equity Forecasting Accuracy

A reproducible quantitative-finance research project investigating one question:

> **Do equity price-forecasting models perform more accurately during periods of
> high cross-sector correlation or low cross-sector correlation?**

**Headline finding (with the honest twist):** Across five forecasting models and
~11 years of U.S. sector-ETF data, short-horizon forecast accuracy is
*descriptively* much worse during high cross-sector correlation regimes —
absolute return errors are ~58–62% larger and directional accuracy falls to the
50% chance level. **But this is a volatility artifact, not a correlation effect.**
Correlation is collinear with volatility (r = 0.64); once we control for a lagged
volatility proxy, the correlation regime adds *no* explanatory power for forecast
error (joint-regression p ≈ 0.72–0.79 across all models; R² unchanged), while
volatility stays strongly significant. A 2×2 double sort confirms it — the
correlation effect flips sign across volatility buckets. **Volatility, not
correlation, drives short-horizon predictability** (consistent with Forbes &
Rigobon, 2002).

📄 Full write-up: [`paper/research_paper.md`](paper/research_paper.md)
📓 Interactive walk-through: [`notebooks/research_analysis.ipynb`](notebooks/research_analysis.ipynb)

---

## What it does

1. **Collects** 5+ years of daily adjusted-close prices for XLK, XLV, XLE, XLF
   (sector ETFs) and SPY (broad market) from Yahoo Finance.
2. **Processes** them into aligned continuously compounded (log) returns.
3. **Analyzes correlation structure**: rolling average pairwise sector
   correlation + PCA co-movement, and classifies each day into a high / low /
   mid regime by quartiles.
4. **Forecasts** one step ahead, walk-forward and out-of-sample, with five
   models: random walk, AR(1), linear regression on lagged returns, and Ridge /
   Lasso regressions.
5. **Evaluates** MAE, RMSE, and directional accuracy by regime.
6. **Tests** the hypothesis with Welch's t-test, the Mann–Whitney U test, and a
   two-proportion z-test.
7. **Controls for the volatility confound** (the crux): regresses forecast error
   on lagged correlation *and* lagged volatility (Newey–West SE), runs a 2×2
   correlation×volatility double sort, and checks alpha-robustness.
8. **Visualizes** everything as eleven publication-ready figures.

## Quick start

```bash
pip install -r requirements.txt
python -m src.main               # main pipeline: data, regimes, models, metrics, tests, figures
python -m src.confound_analysis  # volatility-confound regressions, double sort, alpha robustness
```

This regenerates every dataset, table, and figure. To explore interactively:

```bash
jupyter notebook notebooks/research_analysis.ipynb
```

> Requires internet access for the one-time Yahoo Finance download.

## Project structure

```
Stock-research/
├── README.md
├── requirements.txt
├── src/                          # modular, reproducible pipeline
│   ├── config.py                 # all tunable parameters in one place
│   ├── data_collection.py        # (1) download prices
│   ├── data_processing.py        # (2) clean + log returns
│   ├── correlation_analysis.py   # (3) rolling corr, regimes, PCA
│   ├── models.py                 # (4) walk-forward forecasting models
│   ├── evaluation.py             # (5) MAE / RMSE / directional accuracy
│   ├── statistical_tests.py      # (6) t-test, Mann-Whitney, z-test
│   ├── confound_analysis.py      # (7) corr-vs-vol regressions, double sort, alphas
│   ├── visualization.py          # (8) eleven figures
│   └── main.py                   # orchestrates the whole pipeline
├── notebooks/
│   ├── research_analysis.ipynb   # narrative notebook
│   └── build_notebook.py         # regenerates the notebook
├── paper/
│   └── research_paper.md         # academic-style paper
├── data/
│   ├── raw/                      # downloaded prices
│   └── processed/                # clean prices, returns, regimes
├── results/                      # metric tables, hypothesis tests, summary stats
└── figures/                      # publication-ready PNGs
```

## Key outputs

| Figure | Description |
|--------|-------------|
| `01_cumulative_returns.png` | Growth of $1 per asset |
| `02_return_series.png` | Daily return small-multiples |
| `03_correlation_heatmap.png` | Full-sample correlation matrix |
| `04_rolling_corr_regimes.png` | Rolling correlation with regime shading |
| `05_regime_timeline.png` | Regime classification over time |
| `06_pca_analysis.png` | PCA scree + rolling PC1 co-movement |
| `07_prediction_vs_actual.png` | Predicted vs actual SPY price |
| `08_error_distribution.png` | Error distribution: high vs low regime |
| `09_directional_accuracy.png` | Directional accuracy by model & regime |
| `10_corr_vs_vol_scatter.png` | Correlation vs volatility collinearity (r = 0.64) |
| `11_double_sort.png` | 2×2 double sort — volatility dominates |

| Result table | Description |
|--------------|-------------|
| `results/summary_statistics.csv` | Descriptive return statistics |
| `results/metrics_by_regime.csv` | Pooled MAE/RMSE/accuracy by model & regime |
| `results/metrics_per_asset.csv` | Per-asset breakdown |
| `results/hypothesis_tests.csv` | t-test, Mann-Whitney, z-test, effect sizes |
| `results/confound_regression.csv` | Error ~ lagged corr + lagged vol (Newey–West) |
| `results/double_sort.csv` | 2×2 correlation × volatility cells |
| `results/alpha_robustness.csv` | Ridge/Lasso MAE ratio across penalties |
| `results/pca_static_variance.csv` | PCA explained variance |

## Configuration

Every parameter — date range, tickers, rolling window (90 days), regime
quartiles (25th/75th percentile), number of lags, training window, and
regularization strengths — lives in [`src/config.py`](src/config.py). Change a
value there and re-run `python -m src.main` to reproduce the study under
different assumptions.

## Methodology notes

- **No look-ahead bias.** All forecasts are walk-forward: the model at day *t* is
  fit only on data through *t−1* using a 252-day rolling window.
- **Scale-free comparison.** Regime hypothesis tests use absolute *return*
  errors, not price errors, because price levels drift over time and would
  confound the comparison.
- **Robust testing.** Both a parametric (Welch's t) and a non-parametric
  (Mann–Whitney U) test are reported, given the heavy-tailed error distribution.
- **Confound control (the honest core).** Because high correlation is collinear
  with high volatility, the descriptive regime result is re-tested with a lagged
  volatility control (Newey–West standard errors) and a 2×2 double sort. The
  correlation effect does *not* survive — volatility does. The paper reports this
  plainly rather than forcing the original conclusion.

## Disclaimer

This is an educational research project. Nothing here is investment advice. Past
performance and historical statistical relationships do not guarantee future
results.
