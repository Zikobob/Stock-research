# Cross-Sector Correlation Regimes and Their Impact on the Predictive Accuracy of Equity Price Forecasting Models

**A quantitative study of U.S. sector ETFs (2015–2026)**

---

## Abstract

This study asks whether the accuracy of short-horizon equity price forecasting
models depends on the prevailing cross-sector correlation regime, and — crucially
— whether any such dependence survives once market volatility is controlled for.
Using more than eleven years of daily data for four S&P 500 sector ETFs
(Technology, Health Care, Energy, Financials) and the broad-market SPY ETF, we
build a rolling measure of average pairwise sector correlation, classify each day
into a high-, low-, or mid-correlation regime by quartiles, and evaluate five
one-step-ahead forecasting models (a naive random walk, an AR(1), a linear
regression on lagged returns, and Ridge and Lasso regressions) in a strict
walk-forward, out-of-sample design.

We find a strong **descriptive** result: absolute return-forecast errors are
roughly 58–62% larger in high-correlation regimes than in low-correlation
regimes, and both parametric and non-parametric tests reject the hypothesis that
accuracy is independent of the correlation regime (p ≪ 0.001 for every model).
**However, this association does not represent an independent correlation
effect.** High correlation is collinear with high volatility in our sample
(r = 0.64). When the daily mean absolute error is regressed on both the lagged
correlation and a lagged volatility proxy (90-day realized volatility of SPY,
Newey–West standard errors), the correlation coefficient collapses from
significant (p ≈ 0.017) to indistinguishable from zero (p ≈ 0.72–0.79) and even
changes sign, while volatility remains strongly significant (p ≈ 3×10⁻⁶) and
absorbs essentially all of the explanatory power (R² essentially unchanged,
≈ 0.11–0.12 across models). A 2×2 double sort confirms this: within a fixed
volatility bucket the correlation effect is small and flips sign. The correlation
regime therefore appears to matter **only because it proxies for volatility** —
consistent with Forbes and Rigobon (2002), who show that measured correlation is
itself inflated by volatility.

We are equally candid about the volatility half of the story. Because our models
predict returns near zero, absolute error is nearly equal to the size of the move,
so the "volatility explains the error" result is partly *mechanical* rather than a
discovery. The honest test is **directional accuracy**, a scale-free metric that
does not inflate with volatility — and there we find that predictive skill is weak
in *every* cell of the double sort (44–54%, hovering near the 50% coin-flip), with
no clean ordering by either volatility or correlation. The paper's real
contribution is therefore methodological: an effect that looks statistically
bulletproof on a scale-dependent metric (p ≪ 0.001, every model, two tests) can be
a volatility shadow, and the cure — add one lagged volatility control and read the
coefficient, then re-check on a scale-free metric — is cheap and decisive. A tiny
p-value certifies neither a real effect nor genuine forecast skill.

---

## 1. Introduction

A recurring theme in empirical finance is that the statistical structure of
markets is not constant — it shifts between regimes (Hamilton, 1989). One of the
most studied regime variables is **cross-asset correlation**: in calm markets,
individual sectors are driven largely by their own sector-specific news, whereas
in crises a single systematic factor dominates and "everything moves together"
(Ang and Bekaert, 2002; Ang and Chen, 2002). This phenomenon — higher co-movement
precisely when diversification is most needed — has direct consequences for risk
management and, potentially, for forecasting.

It is worth stating the backdrop plainly: short-horizon equity return
predictability is weak to begin with. Welch and Goyal (2008) show that popular
predictors struggle to beat the historical mean out of sample, and Campbell and
Thompson (2008) find that even statistically detectable predictability translates
into only slim out-of-sample gains. Any regime-conditional "edge" must be read
against this low baseline — a point that becomes central to our conclusions.

**A signal-to-noise view.** Short-horizon linear forecasting models exploit weak,
sector-specific structure in returns — mild autocorrelation and cross-sector
lead–lag relationships. In low-correlation regimes, prices track sector-specific
fundamentals, and that idiosyncratic structure is exactly the signal a linear
model can pick up. In high-correlation regimes, a single systematic factor
dominates the cross-section, the sector-specific component of returns shrinks
relative to common market noise, and the signal the model relies on collapses.
This intuition predicts that models should forecast *less* accurately when
cross-sector correlation is high.

This paper tests that prediction — and then interrogates it. The hypothesis is:

- **H₀ (null):** Prediction accuracy is independent of the correlation regime.
- **H₁ (alternative):** Prediction accuracy differs between the high- and
  low-correlation regimes.

Testing H₁ alone, however, is not enough, and this is the central methodological
point of the paper. High correlation and high volatility are tightly linked, and
Forbes and Rigobon (2002) show that estimated correlation coefficients are
themselves mechanically inflated during high-volatility periods. A naive finding
that "accuracy is worse in high-correlation regimes" could therefore be nothing
more than "accuracy is worse when moves are large." We confront this confound
head-on by asking a sharper question:

> Does the correlation regime carry any information about forecast accuracy
> *beyond* what volatility already explains?

As we report below, the answer in our sample is essentially **no**. We present
the descriptive regime result in full, and then show honestly that it is a
volatility artifact.

---

## 2. Data

We use daily adjusted-close prices (which account for dividends and splits) from
Yahoo Finance for **2 January 2015 – 12 June 2026** (2,878 trading days). The
universe is:

| Ticker | Sector | Economic character | Role |
|--------|--------|--------------------|------|
| XLK | Technology Select Sector SPDR | Secular growth, long-duration | Sector |
| XLV | Health Care Select Sector SPDR | Defensive growth | Sector |
| XLE | Energy Select Sector SPDR | Inflation / commodity-sensitive | Sector |
| XLF | Financials Select Sector SPDR | Interest-rate-sensitive, cyclical | Sector |
| SPY | SPDR S&P 500 ETF | Broad market | Market / target |

These four sectors are deliberately chosen to span distinct macro drivers —
secular growth (Tech), rate sensitivity (Financials), inflation/commodity
exposure (Energy), and defensive growth (Health Care). Because they respond to
different forces, their pairwise correlations vary meaningfully over the cycle,
which is exactly what makes them a useful laboratory for a *correlation-regime*
study. SPY serves as a broad-market reference and an additional forecasting
target.

Series are aligned on common trading dates, short internal gaps are
forward-filled, and any remaining missing rows are dropped, yielding a fully
populated common window. Prices are converted to continuously compounded (log)
returns:

$$ r_t = \ln\!\left(\frac{P_t}{P_{t-1}}\right). $$

**Descriptive statistics (annualized).** Technology was the strongest and Energy
the weakest sector; all series show the negative skew and heavy tails typical of
equity returns.

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

For each trading day we estimate the Pearson correlation between every pair of the
four sector ETFs over a trailing **90-day window** (within the 60–120-day range
common in the literature). With four sectors there are C(4,2) = 6 pairs; their
mean is the day's **average pairwise cross-sector correlation**.

**Regime classification.** Using the empirical distribution of the average
correlation over the full sample, we label each day **high** (≥ 75th percentile,
threshold ≈ 0.670), **low** (≤ 25th percentile, threshold ≈ 0.337), or **mid**.
This yields 697 high, 697 low, and 1,394 mid days. Figure
`04_rolling_corr_regimes.png` shows the correlation series with the regime bands;
high-correlation episodes cluster around well-known stress periods (the 2018
volatility spike, the 2020 COVID crash, the 2022 drawdown), while the later part
of the sample is markedly less correlated.

**Principal Component Analysis.** As a complementary market-wide co-movement gauge
we run PCA on the standardized sector returns. Over the full sample the **first
principal component explains 69.3%** of total variance (PC1+PC2 = 85.0%),
confirming a single dominant systematic factor. A rolling PC1 variance share
(`06_pca_analysis.png`) tracks the average correlation closely.

### 3.2 Forecasting models

All models generate **one-step-ahead, walk-forward, out-of-sample** forecasts.

| Model | Specification |
|-------|---------------|
| **RandomWalk** (Model A) | $\hat{P}_t = P_{t-1}$ (predicted return = 0); naive direction = sign of the previous return |
| **AR(1)** (Model B) | $r_t$ on a single lag $r_{t-1}$ |
| **LinearRegression** (Model C) | $r_t$ on lags $r_{t-1},\dots,r_{t-5}$ |
| **Ridge** (extension) | Model C's design matrix with an L2 penalty (α = 1.0) |
| **Lasso** (extension) | Model C's design matrix with an L1 penalty (α = 5×10⁻⁴) |

Predicted returns are converted to a price forecast via
$\hat{P}_t = P_{t-1}\,e^{\hat{r}_t}$. The random walk is a deliberately demanding
benchmark: beating a no-change forecast out of sample is known to be hard for
short-horizon equity returns (Campbell and Thompson, 2008).

**No look-ahead bias.** For each day *t* the model is fit only on data through
*t−1* using a **252-day rolling training window** (≈ one trading year). The
rolling correlation series, the 252-day training window, and the regime
boundaries are **all computed using data strictly up to *t−1***; nothing on day
*t* enters any quantity used to forecast day *t*.

**On the regularized models and their penalties.** Ridge and Lasso are included
because regularized linear models are a standard, well-motivated benchmark in
empirical asset pricing (Gu, Kelly, and Xiu, 2020), which finds that shrinkage
methods are among the more reliable linear return predictors. We do **not** tune
the penalties: the sample begins in January 2015, so there is no earlier
validation window to tune on without either introducing look-ahead bias or
sacrificing data. We therefore fix the penalties at conventional defaults
(Ridge α = 1.0; Lasso α = 5×10⁻⁴) and, rather than claim a tuned optimum, provide
an explicit **alpha-robustness check** (Section 4.6) showing the regime finding
does not hinge on the exact penalty.

### 3.3 Evaluation metrics

For each model, regime, and asset we compute **MAE** and **RMSE** of the return
forecast, the same for the price forecast, and **directional accuracy** (fraction
of days the predicted return sign matches the realized sign; zero-return days
excluded). Errors are pooled across the five assets and tagged by the regime of
each day.

> **Why return-space errors, not price-MAE?** Price levels drift over the sample,
> so a raw price MAE conflates forecasting difficulty with the price level on a
> given day. The absolute *return* error is comparable across assets and regimes.

> **A caution about MAE that shapes the whole analysis.** Because every model
> predicts a return close to zero (the random walk predicts exactly zero), the
> absolute return error is nearly equal to the *size of the realized move* — i.e.
> it tracks realized volatility almost by construction. Return-MAE is therefore
> **not** invariant to volatility, and any "volatility explains the error" result
> in Section 4 is partly mechanical. The metric that is genuinely invariant to
> move size is **directional accuracy**: getting the sign right is neither easier
> nor harder simply because moves are large. We treat directional accuracy as the
> load-bearing, non-trivial test (Section 4.5).

### 3.4 Hypothesis testing

For each model we compare absolute return errors in the high vs low regime using
**Welch's t-test** (unequal variance) and the **Mann–Whitney U test**
(distribution-free, robust to the heavy-tailed error distribution); comparing the
predictive accuracy of competing forecasts in this way follows the tradition of
Diebold and Mariano (1995). Directional accuracy is compared with a
**two-proportion z-test**, and we report **Cohen's d** as a standardized effect
size.

**Caveat on independence.** The pooled observations are *not* independent — regimes
persist for many consecutive days and the five assets are correlated — so the
extremely small p-values below overstate the true statistical certainty. We
report them for transparency but do not lean on their magnitude; the confound
analysis in Section 3.5, which uses HAC standard errors, is the more rigorous
inferential test.

### 3.5 Confound analysis: correlation vs. volatility

This is the paper's core robustness section. To separate a genuine correlation
effect from a volatility effect, we:

1. **Add a volatility proxy** — 90-day annualized realized volatility of SPY,
   computed through day *t−1* (a VIX-based proxy was considered but is not used
   here, to keep the pipeline fully reproducible from the price data alone).

2. **Regress the daily mean absolute error on the lagged predictors** (both
   z-scored), using Newey and West (1987) heteroskedasticity- and
   autocorrelation-consistent (HAC) standard errors with 21 lags to account for
   the strong persistence of the series:
   $$ |\text{error}|_t = b_0 + b_1\,\text{corr}_{t-1} + b_2\,\text{vol}_{t-1} + e_t. $$
   We estimate three specifications — correlation only, volatility only, and joint
   — so the shrinkage of $b_1$ when volatility is added is directly visible.

3. **Build a 2×2 double sort** — Low/High correlation (25th/75th percentile) ×
   Low/High volatility (median split) — and report MAE and directional accuracy in
   each cell. The critical comparison is **high-volatility/low-correlation vs
   high-volatility/high-correlation**, which isolates the correlation effect with
   volatility held high.

---

## 4. Results

### 4.1 Descriptive accuracy by regime

Pooled return-error metrics and directional accuracy by model and regime (full
table in `results/metrics_by_regime.csv`):

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

Descriptively, errors are **roughly 58–62% larger** in the high-correlation
regime for every model, and directional accuracy is lower — falling to chance or
below (the naive random-walk direction is 46.6%, worse than a coin flip, in the
high regime).

### 4.2 Hypothesis tests (high vs low regime)

| Model | Mean \|err\| high | Mean \|err\| low | Welch t p-value | Mann–Whitney p-value | Cohen's d |
|-------|------------------:|-----------------:|----------------:|---------------------:|----------:|
| RandomWalk       | 0.01162 | 0.00734 | 2.3×10⁻⁴⁴ | 2.0×10⁻²⁹ | 0.37 |
| AR(1)            | 0.01157 | 0.00734 | 1.2×10⁻⁴³ | 3.0×10⁻²⁸ | 0.37 |
| LinearRegression | 0.01209 | 0.00746 | 3.4×10⁻⁴⁶ | 4.5×10⁻³³ | 0.38 |
| Ridge            | 0.01162 | 0.00732 | 2.1×10⁻⁴⁴ | 4.0×10⁻³⁰ | 0.37 |
| Lasso            | 0.01163 | 0.00732 | 1.1×10⁻⁴⁴ | 1.8×10⁻³⁰ | 0.37 |

Both tests reject H₀ for every model (small-to-medium effect, Cohen's d ≈ 0.37).
Taken at face value this says accuracy is *not* independent of the correlation
regime. Section 4.3 shows why that face-value reading is misleading.

### 4.3 The confound: correlation vs. volatility (the key result)

In our sample, lagged correlation and lagged volatility are strongly collinear:
**r = 0.64** (Figure `10_corr_vs_vol_scatter.png`). The regression of daily mean
absolute error on the two lagged predictors (z-scored; Newey–West SE, 21 lags;
n = 2,620) is decisive. Results are near-identical across models; the
LinearRegression row is representative (full table in
`results/confound_regression.csv`):

| Specification | b (correlation) | p (corr) | b (volatility) | p (vol) | R² |
|---------------|----------------:|---------:|---------------:|--------:|---:|
| Correlation only | **+0.00190** | **0.017** | — | — | 0.045 |
| Volatility only  | — | — | **+0.00309** | **5.3×10⁻⁵** | 0.119 |
| Joint            | **−0.00015** | **0.794** | **+0.00319** | **6.0×10⁻⁶** | 0.119 |

The pattern is the same for all five models: in the joint specification the
correlation coefficient is statistically insignificant (**p ≈ 0.72–0.79** across
models) and economically ≈ 0 (it even flips slightly negative), while volatility
remains highly significant (**p ≈ 3–6×10⁻⁶**). Adding correlation on top of
volatility moves R² by essentially nothing (0.1189 → 0.1190 for the linear model;
the joint R² ranges 0.109–0.119 across the five models). In plain terms: **once
volatility is accounted for, the correlation regime tells us nothing more about
the error magnitude.** The significant marginal association in Sections 4.1–4.2 is
a volatility effect wearing a correlation costume.

One caveat we return to below: the dependent variable here is absolute return
error, which — because forecasts are near zero — is close to the size of the move
itself. So this regression establishes that the *correlation* effect is spurious,
but the surviving *volatility* coefficient is partly mechanical and should not be
read as "volatility predicts skill." Section 4.5 puts that to a scale-free test.

### 4.4 Double sort (volatility held fixed)

The 2×2 sort tells the same story visually and numerically. Cells use lagged
correlation quartiles (thresholds 0.337 / 0.670) and a lagged-volatility median
split (0.137). LinearRegression shown (all models in `results/double_sort.csv`;
Figure `11_double_sort.png`):

| | Low volatility | High volatility |
|---|---:|---:|
| **Low correlation**  | MAE 0.00734 (n=3,095) | MAE 0.01032 (n=390) |
| **High correlation** | MAE 0.00657 (n=250)   | MAE 0.01216 (n=2,760) |

Two things stand out. First, **volatility dominates**: moving from low to high
volatility roughly doubles MAE within each correlation column (e.g. within
low-correlation, +41%; within high-correlation, +85%). Second, the **correlation
effect is inconsistent once volatility is fixed**: within the *low-volatility*
row, high correlation actually has a *lower* MAE than low correlation
(0.00657 vs 0.00734), whereas within the *high-volatility* row it is somewhat
higher (0.01216 vs 0.01032). The sign flips — the hallmark of a variable with no
robust independent effect.

Two honest caveats on the double sort: (i) the off-diagonal cells are thin
(n = 250 and 390) precisely because correlation and volatility co-move, so those
means are noisier; and (ii) within the coarse "high-volatility" bucket the
high-correlation days still tend to be the very highest-volatility days, which is
why a residual gap remains there. The continuous-control regression in Section 4.3,
which does not suffer from a coarse split, is the cleaner test and attributes that
residual gap to volatility. But note again that all of these cells are measured in
MAE — the metric that tracks move size. Section 4.5 asks whether the pattern
survives on a metric that does not.

### 4.5 Directional accuracy: the scale-free test (the load-bearing result)

MAE is contaminated by the mechanical link to move size, so the honest question is
whether the models get the *direction* right more often in any regime — a metric
that does not inflate with volatility. We re-ran the 2×2 double sort using
directional accuracy for all five models (full table in
`results/double_sort.csv`):

| Model | Low-corr / Low-vol | Low-corr / High-vol | High-corr / Low-vol | High-corr / High-vol |
|-------|-----:|-----:|-----:|-----:|
| RandomWalk       | 51.7% | 45.2% | 45.5% | 46.8% |
| AR(1)            | 52.2% | 53.0% | 52.8% | 50.5% |
| LinearRegression | 51.1% | 48.8% | 50.8% | 48.7% |
| Ridge            | 53.3% | 53.0% | 48.4% | 51.7% |
| Lasso            | 53.5% | 52.4% | 48.4% | 51.4% |

**Here the strong story dissolves.** Every number sits between 44% and 54% — a
whisker around the 50% coin-flip. No model is meaningfully skillful in any cell,
and the naive random walk's direction rule is actually *below* 50% in three of
four cells. Crucially, the clean volatility ordering that dominated the MAE
results **does not reappear**: for Ridge and Lasso the *worst* cell is
high-correlation/**low**-volatility (48.4%), not a high-volatility cell, and AR(1)
is essentially flat everywhere. Because correlation and volatility are collinear,
their marginal orderings coincide (both "low" cells edge out their "high"
counterparts by ~1–5 percentage points), and this scale-free metric cannot cleanly
credit either one.

The honest reading is therefore weaker than the MAE tables suggest, and we state
it plainly: **on the metric that is not mechanically inflated by volatility, there
is little genuine directional skill to allocate to any regime.** The models are
near coin-flips throughout. This is the load-bearing evidence, and it disciplines
every claim in the Discussion.

### 4.6 Alpha robustness

To confirm the regularized-model results are not an artifact of the chosen
penalties, we re-ran Ridge and Lasso on SPY across an alpha grid (full table in
`results/alpha_robustness.csv`). The high/low-regime MAE ratio is flat:

| Model | α values | high/low MAE ratio |
|-------|----------|--------------------|
| Ridge | 0.1, 1.0, 10.0 | 1.70, 1.71, 1.72 |
| Lasso | 1×10⁻⁴, 5×10⁻⁴, 1×10⁻³ | 1.71, 1.72, 1.72 |

The descriptive regime gap is essentially invariant to the penalty, so nothing in
the paper depends on a specific tuned alpha. (These SPY-only ratios differ in
level from the pooled five-asset figures because they cover a single asset; the
point is their stability across α.)

---

## 5. Discussion

These results have to be read carefully, because two different things are true at
two different levels of rigor.

**On error magnitude, the correlation effect is a volatility artifact.** The
descriptive regime effect is real — errors genuinely are ~60% larger in
high-correlation regimes — but it is not evidence of a correlation mechanism. Once
we control for volatility with a lagged, look-ahead-free proxy, the correlation
regime adds no explanatory power (joint p ≈ 0.72–0.79), and the double sort shows
the correlation effect changing sign across volatility buckets. This is exactly the
trap Forbes and Rigobon (2002) identified: because measured correlation is
mechanically higher when volatility is higher, an apparent "correlation regime
effect" can be a volatility effect in disguise. Our result is a concrete,
forecasting-flavored instance of their point.

**But we must not over-claim the volatility side either.** The surviving volatility
coefficient is measured on absolute return error, and because our forecasts are
near zero, that error is close to the size of the move itself — so "volatility
explains the error" is partly *mechanical*, not a discovery about forecast skill.
This is precisely why we lean on directional accuracy (Section 4.5), a metric that
is invariant to move size. On that metric the strong story evaporates: skill sits
between 44% and 54% in every cell, the volatility ordering does not cleanly
reappear (for Ridge/Lasso the worst cell is low-volatility), and neither
correlation nor volatility earns a robust edge. In other words, there is little
genuine directional predictability in *any* regime to begin with — consistent with
the broader evidence that short-horizon equity returns are hard to forecast out of
sample (Welch and Goyal, 2008; Campbell and Thompson, 2008). The signal-to-noise
intuition from the introduction is best restated as a null: the sector-specific
signal these linear models can exploit is faint everywhere, and no regime turns it
into a reliable edge.

**Practical implication.** The usable takeaway is modest and honest. Volatility is
the right variable to watch for *how large forecast errors will be* — it is
observable at *t−1* and dominates the error magnitude — and cross-sector
correlation adds nothing beyond it. But large errors are not the same as lost
skill: on a scale-free basis the models are near coin-flips regardless of regime,
so neither correlation nor volatility should be sold as a switch that turns
short-horizon forecasts on or off. The most defensible advice is to size positions
by volatility and to distrust any single headline accuracy number.

### 5.1 Limitations

- **Correlation and volatility cannot be fully separated observationally.** They
  are collinear by nature (r = 0.64), and the cells that would most cleanly
  separate them (high-vol/low-corr, low-vol/high-corr) are the sparsest (n = 390,
  250). Our conclusion — no independent correlation effect — is well supported by
  the continuous-control regression, but the double sort's thin off-diagonal cells
  are a genuine data limitation.
- **One volatility proxy.** We use 90-day realized volatility of SPY. Alternative
  proxies (VIX, GARCH-based conditional volatility) could shift the exact
  coefficients, though the collinearity and the direction of the result are
  unlikely to reverse.
- **Linear, short-horizon models only.** Non-linear models (gradient boosting,
  LSTMs) might behave differently, though they face the same noisy data in
  high-volatility states.
- **Equity ETFs, U.S. only, 2015–2026.** Generalization to other asset classes,
  horizons, or periods is untested.
- **Overlapping, dependent observations.** The Section 4.2 p-values overstate
  certainty; the HAC-based Section 4.3 inference is the reliable one.
- **MAE is partly mechanical.** Because forecasts are near zero, absolute return
  error ≈ move size, so the volatility result on MAE is partly definitional. We
  rely on directional accuracy (Section 4.5) to avoid this trap — but that metric,
  being near 50% everywhere, offers little skill to explain in the first place.

### 5.2 Future work

Promising extensions: (i) a heteroskedasticity-corrected correlation measure à la
Forbes and Rigobon to test whether *volatility-adjusted* correlation has any
residual predictive content; (ii) a regime-switching / HMM regime definition
(Hamilton, 1989; Ang and Bekaert, 2002) instead of static quartiles; (iii) adding
non-linear forecasters; and (iv) testing whether a **volatility-aware** meta-model
(scaling back forecasts in high-volatility states) improves realized accuracy.

---

## 6. Conclusion

This study set out to test whether cross-sector correlation regimes shape the
accuracy of equity forecasting models. The answer is more interesting than a
simple yes: correlation regimes *appear* to matter enormously, but that appearance
is a mirage — and the lesson is in how the mirage forms and how cheaply it
dissolves.

Three findings, in order of what they teach:

1. **The naive result is striking and real — descriptively.** Across five models
   and eleven years of data, short-horizon forecast errors are ~58–62% larger and
   directional accuracy falls to chance in high cross-sector correlation regimes.
   Every parametric and non-parametric test rejects the null that accuracy is
   independent of the regime. Taken alone, this looks like a clean, publishable
   "correlation kills predictability" story.

2. **That story does not survive contact with its own confound.** High
   correlation is collinear with high volatility (r = 0.64), and estimated
   correlation is itself inflated by volatility (Forbes and Rigobon, 2002). When we
   control for a lagged, look-ahead-free volatility proxy, the correlation regime's
   explanatory power vanishes — its coefficient falls to zero and loses
   significance (joint-regression p ≈ 0.72–0.79 across all models; R² unchanged),
   while volatility stays overwhelmingly significant (p ≈ 3–6×10⁻⁶). The double
   sort drives the point home: hold volatility fixed and the correlation effect
   shrinks to noise and even flips sign.

3. **What survives is a caveat, not a new predictor.** Stripping away the
   correlation mirage does *not* leave a shiny "volatility predicts skill" result
   in its place — and claiming one would repeat the very mistake the paper warns
   against. Volatility dominates the *error magnitude*, but that is partly
   mechanical: with forecasts near zero, absolute error is essentially move size.
   On directional accuracy — the metric that does not inflate with volatility —
   skill is 44–54% in every regime, a whisker from a coin flip, with no clean
   ordering by volatility or correlation. The blunt truth is that there is little
   short-horizon directional predictability here for *any* regime to switch on or
   off, exactly as the out-of-sample predictability literature would lead us to
   expect (Welch and Goyal, 2008; Campbell and Thompson, 2008).

**The real contribution is methodological, and it is the headline.** A
correlation-regime effect that looked statistically bulletproof — a ~60% error gap,
p ≪ 0.001, replicated across five models and two tests — turned out to be a
volatility shadow. The cure was cheap and decisive: add one lagged volatility
control and read the coefficient (it fell to zero), then re-check on a scale-free
metric (the pattern vanished). This generalizes. Regime studies that sort on
correlation, dispersion, or breadth are all exposed to the same volatility
confound, and often to a mechanical-metric trap on top of it. **A tiny p-value
certifies neither a real effect nor genuine forecast skill.** Before believing a
regime "controls" predictability, control for volatility and test on a metric that
move size cannot inflate. When we did both, the impressive result dissolved — and
saying so plainly is the point.

---

## References

Ang, A., and G. Bekaert. 2002. "International Asset Allocation With Regime
Shifts." *The Review of Financial Studies* 15 (4): 1137–1187.

Ang, A., and J. Chen. 2002. "Asymmetric Correlations of Equity Portfolios."
*Journal of Financial Economics* 63 (3): 443–494.

Campbell, J. Y., and S. B. Thompson. 2008. "Predicting Excess Stock Returns Out of
Sample: Can Anything Beat the Historical Average?" *The Review of Financial
Studies* 21 (4): 1509–1531.

Diebold, F. X., and R. S. Mariano. 1995. "Comparing Predictive Accuracy." *Journal
of Business & Economic Statistics* 13 (3): 253–263.

Forbes, K. J., and R. Rigobon. 2002. "No Contagion, Only Interdependence:
Measuring Stock Market Comovements." *The Journal of Finance* 57 (5): 2223–2261.

Gu, S., B. Kelly, and D. Xiu. 2020. "Empirical Asset Pricing via Machine
Learning." *The Review of Financial Studies* 33 (5): 2223–2273.

Hamilton, J. D. 1989. "A New Approach to the Economic Analysis of Nonstationary
Time Series and the Business Cycle." *Econometrica* 57 (2): 357–384.

Newey, W. K., and K. D. West. 1987. "A Simple, Positive Semi-Definite,
Heteroskedasticity and Autocorrelation Consistent Covariance Matrix."
*Econometrica* 55 (3): 703–708.

Welch, I., and A. Goyal. 2008. "A Comprehensive Look at the Empirical Performance
of Equity Premium Prediction." *The Review of Financial Studies* 21 (4):
1455–1508.

> **Note on citations (author should verify before submission).** I am confident
> these nine papers are real and that each genuinely supports the specific sentence
> it is attached to — Forbes and Rigobon on the volatility/correlation confound;
> Hamilton, Ang–Bekaert, and Ang–Chen on regime-switching and asymmetric
> co-movement; Gu–Kelly–Xiu on regularized linear models; Newey–West on the HAC
> standard errors actually used here; Diebold–Mariano on forecast-accuracy
> comparison; and Welch–Goyal and Campbell–Thompson on the weak out-of-sample
> predictability of short-horizon equity returns. The exact volume/issue/page
> numbers are given from memory and should be double-checked against the journal of
> record (or a DOI) before final submission. No reference was included unless it
> directly backs a claim in the text.

---

## Appendix A — Reproducibility

```bash
pip install -r requirements.txt
python -m src.main               # main pipeline: data, regimes, models, metrics, tests, figures
python -m src.confound_analysis  # volatility-confound regressions, double sort, alpha robustness
```

Key parameters (date range, correlation window, regime quantiles, model
hyperparameters) are centralized in `src/config.py`. The annotated notebook
`notebooks/research_analysis.ipynb` walks through the analysis interactively.

## Appendix B — Output artifacts

| Artifact | Location |
|----------|----------|
| Raw adjusted-close prices | `data/raw/adj_close_prices.csv` |
| Cleaned prices & log returns | `data/processed/` |
| Rolling correlations & regimes | `data/processed/regimes.csv`, `rolling_pairwise_corr.csv` |
| Lagged predictors (corr, vol) | `data/processed/lagged_predictors.csv` |
| Summary statistics | `results/summary_statistics.csv` |
| Accuracy by regime / per asset | `results/metrics_by_regime.csv`, `metrics_per_asset.csv` |
| Hypothesis tests | `results/hypothesis_tests.csv` |
| **Confound regressions** | `results/confound_regression.csv` |
| **2×2 double sort** | `results/double_sort.csv` |
| **Alpha robustness** | `results/alpha_robustness.csv` |
| PCA variance | `results/pca_static_variance.csv` |
| Figures (11 publication-ready PNGs) | `figures/` |
