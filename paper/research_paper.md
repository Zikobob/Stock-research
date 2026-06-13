# Cross-Sector Correlation Regimes and Their Impact on the Predictive Accuracy of Equity Price Forecasting Models

**A quantitative study of U.S. sector ETFs (2015–2026)**

---

## Abstract

This study investigates whether the accuracy of short-horizon equity price
forecasting models depends on the prevailing cross-sector correlation regime of
the market. Using more than eleven years of daily data for four S&P 500 sector
ETFs (Technology, Health Care, Energy, Financials) and the broad-market SPY ETF,
we construct a rolling measure of average pairwise sector correlation and
classify each trading day into a high-, low-, or mid-correlation regime by
quartiles. We then evaluate five one-step-ahead forecasting models — a naive
random walk, an AR(1) model, an ordinary linear regression on lagged returns,
and Ridge and Lasso regularized regressions — in a strict walk-forward,
out-of-sample design. For every model, absolute return-forecast errors are
statistically significantly **larger** during high-correlation regimes than
during low-correlation regimes (Welch's t-test and Mann–Whitney U test, all
p < 0.001), and directional accuracy deteriorates toward or below the 50% chance
level. We conclude that forecasting accuracy is **not** independent of the
correlation regime: predictability collapses precisely when sectors move
together, which empirically coincides with periods of market stress and elevated
volatility.

---

## 1. Introduction

A recurring theme in empirical finance is that the statistical structure of
markets is not constant — it shifts between regimes. One of the most studied
regime variables is **cross-asset correlation**: during calm markets,
individual sectors are driven largely by their own idiosyncratic news, whereas
during crises a single systematic factor dominates and "everything moves
together." This phenomenon, sometimes called *correlation breakdown* or
*diversification failure*, has direct consequences for risk management.

This paper asks a narrower, testable question that connects correlation regimes
to **forecasting**:

> Do equity price-prediction models perform more accurately during periods of
> high cross-sector correlation or low cross-sector correlation?

The hypothesis is operationalized as:

- **H₀ (null):** Prediction accuracy is independent of the correlation regime.
- **H₁ (alternative):** Prediction accuracy differs between the high- and
  low-correlation regimes.

Answering this matters for two reasons. First, if predictability is
regime-dependent, then a single average performance metric (the way most
forecasting studies report results) is misleading — it masks the fact that
models may be reliable in some environments and useless in others. Second, the
correlation regime is *observable in advance* (it is computed from a trailing
window), so a regime-conditional view of model accuracy is actionable.

---

## 2. Data

We use daily adjusted-close prices (which account for dividends and splits) from
Yahoo Finance for the period **January 2015 – June 2026**. The universe is:

| Ticker | Description | Role |
|--------|-------------|------|
| XLK | Technology Select Sector SPDR | Sector |
| XLV | Health Care Select Sector SPDR | Sector |
| XLE | Energy Select Sector SPDR | Sector |
| XLF | Financials Select Sector SPDR | Sector |
| SPY | SPDR S&P 500 ETF | Broad market |

The four sector ETFs define the *cross-sector* correlation structure; SPY serves
as a broad-market reference and an additional forecasting target. Series are
aligned on common trading dates, short internal gaps are forward-filled, and any
remaining missing rows are dropped, yielding a fully populated common window.

Prices are converted to continuously compounded (log) returns:

$$ r_t = \ln\!\left(\frac{P_t}{P_{t-1}}\right). $$

**Descriptive statistics (annualized).** Technology was the strongest and
Energy the weakest sector over the sample; all series display the negative skew
and heavy tails (excess kurtosis) typical of equity returns.

| Asset | Annual return | Annual volatility | Naive Sharpe | Skew | Excess kurtosis |
|-------|--------------:|------------------:|-------------:|-----:|----------------:|
| XLK (Tech)        | 20.4% | 23.9% | 0.85 | −0.32 | 9.3 |
| XLV (Health)      |  8.7% | 16.8% | 0.52 | −0.39 | 8.7 |
| XLE (Energy)      |  7.1% | 29.4% | 0.24 | −0.87 | 15.6 |
| XLF (Financials)  | 10.4% | 21.8% | 0.48 | −0.56 | 15.1 |
| SPY (S&P 500)     | 12.9% | 17.7% | 0.73 | −0.58 | 14.5 |

*(See `figures/01_cumulative_returns.png` and `figures/02_return_series.png`.)*

---

## 3. Methodology

### 3.1 Correlation-structure analysis

For each trading day we estimate the Pearson correlation between every pair of
the four sector ETFs over a trailing **90-day window** (within the 60–120 day
range commonly used in the literature). With four sectors there are
C(4,2) = 6 pairs; their mean is the day's **average pairwise cross-sector
correlation**, a single scalar describing how tightly the sectors move together.

**Regime classification.** Using the empirical distribution of the average
correlation over the full sample, we label each day:

- **High regime:** average correlation ≥ 75th percentile (threshold ≈ **0.670**)
- **Low regime:** average correlation ≤ 25th percentile (threshold ≈ **0.337**)
- **Mid regime:** everything in between

This yields 697 high-correlation days, 697 low-correlation days, and 1,394
mid-correlation days. Figure `04_rolling_corr_regimes.png` shows the
correlation series with the regime bands; high-correlation episodes cluster
around well-known stress periods (e.g. the 2018 volatility spike, the 2020
COVID crash, and the 2022 drawdown), while the later part of the sample is
markedly less correlated.

**Principal Component Analysis.** As a complementary, market-wide co-movement
gauge we run PCA on the standardized sector returns. Over the full sample the
**first principal component explains 69.3% of total variance** (PC1+PC2 = 85.0%),
confirming that a single systematic factor dominates sector co-movement. A
rolling PC1 variance share (Figure `06_pca_analysis.png`) tracks the average
correlation closely, providing a robustness check on the regime definition.

### 3.2 Forecasting models

All models generate **one-step-ahead, walk-forward, out-of-sample** forecasts.
For each day *t* in the evaluation window the model is fit only on data up to
*t−1* using a **252-day rolling training window** (≈ one trading year), then
predicts day *t*. This eliminates look-ahead bias and produces a continuous
out-of-sample prediction series that can be tagged by regime.

| Model | Specification |
|-------|---------------|
| **RandomWalk** (Model A) | $\hat{P}_t = P_{t-1}$ (predicted return = 0); naive direction = sign of previous return |
| **AR(1)** (Model B) | $r_t$ regressed on $r_{t-1}$ |
| **LinearRegression** (Model B) | $r_t$ regressed on lags $r_{t-1},\dots,r_{t-5}$ |
| **Ridge** (extension) | Same design matrix with L2 penalty (α = 1.0) |
| **Lasso** (extension) | Same design matrix with L1 penalty (α = 5×10⁻⁴) |

Predicted returns are converted back to a price forecast via
$\hat{P}_t = P_{t-1}\,e^{\hat{r}_t}$.

### 3.3 Evaluation metrics

For each model, regime, and asset we compute:

- **MAE** and **RMSE** of the price forecast,
- **MAE** and **RMSE** of the *return* forecast (scale-free; the primary metric),
- **Directional accuracy** — the fraction of days the sign of the predicted
  return matches the realized return (zero-return days excluded).

Errors are pooled across the five assets and tagged by the regime of each day,
giving thousands of observations per regime for statistical power.

> **Why return-space errors, not price-MAE, for the regime comparison?**
> Price levels drift over the sample, so a raw price MAE conflates the
> forecasting difficulty with the price level on a given day. The absolute
> *return* error is scale-free and directly comparable across regimes and
> assets, so it is the basis for hypothesis testing.

### 3.4 Hypothesis testing

For each model we compare the distribution of absolute return errors in the
high regime against the low regime using:

1. **Welch's t-test** (unequal-variance) on the mean error, and
2. the **Mann–Whitney U test**, a non-parametric test robust to the non-normal,
   heavy-tailed error distribution.

Directional accuracy is compared with a **two-proportion z-test**, and we report
**Cohen's d** as a standardized effect size.

---

## 4. Results

### 4.1 Pooled accuracy by regime

The table below reports pooled return-error metrics and directional accuracy by
model and regime (full table in `results/metrics_by_regime.csv`).

| Model | Regime | MAE (return) | RMSE (return) | Directional accuracy |
|-------|--------|-------------:|--------------:|---------------------:|
| RandomWalk | high | 0.01162 | 0.01924 | 46.6% |
| RandomWalk | low  | 0.00734 | 0.01009 | 50.6% |
| AR(1) | high | 0.01157 | 0.01915 | 50.6% |
| AR(1) | low  | 0.00734 | 0.01013 | 52.0% |
| LinearRegression | high | 0.01209 | 0.02032 | 49.3% |
| LinearRegression | low  | 0.00746 | 0.01027 | 50.6% |
| Ridge | high | 0.01162 | 0.01925 | 51.1% |
| Ridge | low  | 0.00732 | 0.01012 | 53.1% |
| Lasso | high | 0.01163 | 0.01928 | 50.9% |
| Lasso | low  | 0.00732 | 0.01011 | 53.2% |

Two patterns are immediate and consistent across all five models:

1. **Return-forecast errors are roughly 55–60% larger in the high-correlation
   regime** than in the low-correlation regime (e.g. Ridge MAE 0.01162 vs
   0.00732).
2. **Directional accuracy is lower in the high regime**, falling to the
   chance level (~50%) or below — the naive random-walk direction is actually
   *worse than a coin flip* (46.6%) during high-correlation periods.

The regularized models (Ridge, Lasso) achieve the best directional accuracy
overall (~53% in the low regime), modestly beating the random walk, but even
they lose their edge when correlation is high.

*(See `figures/08_error_distribution.png` and
`figures/09_directional_accuracy.png`.)*

### 4.2 Hypothesis tests (high vs low regime)

| Model | Mean \|err\| high | Mean \|err\| low | Welch t p-value | Mann–Whitney p-value | Cohen's d |
|-------|------------------:|-----------------:|----------------:|---------------------:|----------:|
| RandomWalk       | 0.01162 | 0.00734 | 2.3×10⁻⁴⁴ | 2.0×10⁻²⁹ | 0.37 |
| AR(1)            | 0.01157 | 0.00734 | 1.2×10⁻⁴³ | 3.0×10⁻²⁸ | 0.37 |
| LinearRegression | 0.01209 | 0.00746 | 3.4×10⁻⁴⁶ | 4.5×10⁻³³ | 0.38 |
| Ridge            | 0.01162 | 0.00732 | 2.1×10⁻⁴⁴ | 4.0×10⁻³⁰ | 0.37 |
| Lasso            | 0.01163 | 0.00732 | 1.1×10⁻⁴⁴ | 1.8×10⁻³⁰ | 0.37 |

For **every** model both tests reject the null at any conventional significance
level (all p ≪ 0.001), with a consistent small-to-medium effect size
(Cohen's d ≈ 0.37). The directional-accuracy z-test is also significant for the
random walk (p ≈ 0.001) and points in the same direction for the other models.

**We therefore reject H₀.** Prediction accuracy is not independent of the
correlation regime; models are reliably *less* accurate when cross-sector
correlation is high.

---

## 5. Discussion

The result is intuitive once correlation is understood as a proxy for market
state. High cross-sector correlation empirically coincides with **stress
episodes and elevated volatility** — the very environments in which return
magnitudes balloon and price moves become news-driven and erratic. Larger,
more erratic moves mechanically inflate absolute forecast errors and erode the
weak autocorrelation structure that linear models rely on, so directional
accuracy decays to chance.

Conversely, in calm, low-correlation regimes, returns are smaller and somewhat
more orderly, and the regularized models extract a small but statistically
detectable directional edge (~53%).

A practical implication is that **a single headline accuracy number is
misleading**. The same model that looks mildly useful on average is essentially
a coin flip exactly when accurate forecasts would matter most. Because the
correlation regime is computed from a trailing window and is therefore known in
advance, this regime-conditional view is actionable: forecasts (and any strategy
built on them) should be down-weighted or treated with greater caution during
high-correlation regimes.

### 5.1 Limitations

- **Linear, short-horizon models only.** Non-linear models (gradient boosting,
  LSTMs) might behave differently, though they face the same noisy data in
  stress regimes.
- **Endogeneity of volatility.** High correlation and high volatility are
  intertwined; this study establishes that accuracy differs *by correlation
  regime* but does not fully disentangle correlation from volatility as the
  driving variable.
- **Quartile thresholds** for regime definition are a modeling choice; the PCA
  co-movement cross-check mitigates but does not eliminate this sensitivity.
- **Equity ETFs, U.S. only, 2015–2026.** Generalization to other asset classes
  or periods is untested.

### 5.2 Future work

Promising extensions include: (i) using a volatility control (e.g. VIX) to
separate the correlation effect from the volatility effect; (ii) a regime-switching
or HMM-based regime definition instead of static quartiles; (iii) testing whether
a regime-aware *meta-model* (switching between models by regime) improves overall
accuracy; and (iv) adding non-linear / machine-learning forecasters.

---

## 6. Conclusion

Across a decade of U.S. sector-ETF data and five forecasting models spanning
naive, autoregressive, and regularized approaches, short-horizon equity
forecasting accuracy is **significantly and consistently worse during
high cross-sector correlation regimes**. Absolute return errors are ~55–60%
larger and directional accuracy falls to (or below) chance, with both
parametric and non-parametric tests rejecting the null hypothesis at
p ≪ 0.001 for every model. Predictability is therefore regime-dependent and
collapses precisely when markets move as one — a finding with direct
implications for how forecast-driven strategies should be deployed and risk-managed.

---

## Appendix A — Reproducibility

The entire study is reproducible from the command line:

```bash
pip install -r requirements.txt
python -m src.main          # runs the full pipeline end-to-end
```

This regenerates every dataset (`data/`), result table (`results/`), and figure
(`figures/`). The annotated notebook `notebooks/research_analysis.ipynb` walks
through the analysis interactively. Key parameters (date range, correlation
window, regime quantiles, model hyperparameters) are centralized in
`src/config.py`.

## Appendix B — Output artifacts

| Artifact | Location |
|----------|----------|
| Raw adjusted-close prices | `data/raw/adj_close_prices.csv` |
| Cleaned prices & log returns | `data/processed/` |
| Rolling correlations & regimes | `data/processed/regimes.csv`, `rolling_pairwise_corr.csv` |
| Summary statistics | `results/summary_statistics.csv` |
| Accuracy by regime / per asset | `results/metrics_by_regime.csv`, `metrics_per_asset.csv` |
| Hypothesis tests | `results/hypothesis_tests.csv` |
| PCA variance | `results/pca_static_variance.csv` |
| Figures (9 publication-ready PNGs) | `figures/` |
