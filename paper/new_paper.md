# Cross-Sector Correlation Regimes and Their Impact on the Predictive Accuracy of Equity Price Forecasting Models

**A quantitative study of U.S. sector ETFs (2015–2026)**

---

## Abstract

This paper examines whether the accuracy of one-day-ahead equity forecasts depends on cross-sector correlation regimes, and whether that dependence survives after controlling for volatility. Daily data from January 2015 to June 2026 cover four S&P 500 sector ETFs, technology, health care, energy, and financials, along with SPY. High, mid, and low correlation regimes are defined by quartiles of a 90-day rolling pairwise correlation. Five walk-forward models are evaluated: a random walk, an AR(1), a five-lag linear regression, and Ridge and Lasso variants.

Absolute return errors run 58% to 62% larger in the high-correlation regime (p < 0.001 across all models via t-test and Mann-Whitney tests). Sector correlation and volatility co-move substantially in this sample (r = 0.64), which complicates the interpretation of the regime result on its own. A joint regression on lagged correlation and lagged volatility resolves this: correlation loses significance (p = 0.72–0.79), volatility remains highly significant (p ≈ 6×10⁻⁶), and model fit does not improve when correlation is added. Directional accuracy stays between 45% and 54% across all regimes. The regime-dependent forecast errors observed here trace to volatility, not correlation.

---

## Introduction

Market structure is not fixed. Correlations, volatility, and return behavior shift over time, and one common way to describe this is through regimes (1). Cross-asset correlation is one such regime variable. In calm markets, sectors are driven mostly by their own news. In stressed markets, a single systematic factor dominates and sectors move together (2, 3).

Short-horizon equity returns are hard to predict to begin with. Standard predictors rarely beat the historical mean out of sample (4). Even detectable predictability produces only small out-of-sample gains (5). Combining predictors can add modest out-of-sample value (6), but the baseline is low, and any regime-conditional result has to be read against it.

The starting idea is a signal-to-noise argument. Linear forecasting models rely on weak sector-specific structure, such as mild autocorrelation and lead-lag effects between sectors. When correlation is low, that structure is visible. When correlation is high, one factor dominates the cross-section and the sector-specific part of returns shrinks. So models should forecast less accurately when cross-sector correlation is high.

This paper tests that prediction and then checks it against a confound. High correlation tends to occur when volatility is high, and estimated correlations are themselves inflated during high-volatility periods (7). A result that accuracy is worse in high-correlation regimes could simply mean that accuracy is worse when moves are large. The question is therefore narrower: does the correlation regime say anything about forecast accuracy beyond what volatility already explains? In this sample, it does not.

---

## Data

The data are daily adjusted-close prices from Yahoo Finance for 2 January 2015 to 12 June 2026, which is 2,878 trading days. Adjusted close accounts for splits and dividends. The universe is four sector ETFs and the broad market.

| Ticker | Sector | Economic character | Role |
|--------|--------|--------------------|------|
| XLK | Technology | Secular growth, long-duration | Sector |
| XLV | Health care | Defensive growth | Sector |
| XLE | Energy | Inflation and commodity sensitive | Sector |
| XLF | Financials | Rate sensitive, cyclical | Sector |
| SPY | S&P 500 | Broad market | Market and target |

The four sectors respond to different drivers, so their pairwise correlations vary over the cycle. Prices are aligned on common trading dates, short internal gaps are forward-filled, and any remaining missing rows are dropped. Prices are converted to log returns:

$$ r_t = \ln\!\left(\frac{P_t}{P_{t-1}}\right). $$

Technology was the strongest sector over the period and energy the weakest. All five series have negative skew and heavy tails, which are standard features of equity returns (8).

| Asset | Annual return | Annual volatility | Sharpe | Skew | Excess kurtosis |
|-------|--------------:|------------------:|-------:|-----:|----------------:|
| XLK | 20.4% | 23.9% | 0.85 | −0.32 | 9.3 |
| XLV | 8.7% | 16.8% | 0.52 | −0.39 | 8.7 |
| XLE | 7.1% | 29.4% | 0.24 | −0.87 | 15.6 |
| XLF | 10.4% | 21.8% | 0.48 | −0.56 | 15.1 |
| SPY | 12.9% | 17.7% | 0.73 | −0.58 | 14.5 |

![Figure 1. Growth of one dollar invested per asset (cumulative log returns).](../figures/01_cumulative_returns.png)

---

## Methods

### Correlation and regimes

For each day, the Pearson correlation between every pair of the four sector ETFs is estimated over a trailing 90-day window. There are six pairs, and their mean is the day's average pairwise correlation. The full-sample correlations are shown in Figure 2.

![Figure 2. Full-sample return correlation matrix.](../figures/03_correlation_heatmap.png)

Each day is labeled by quartile of the average correlation: high if at or above the 75th percentile (0.670), low if at or below the 25th percentile (0.337), and mid otherwise. This gives 697 high days, 697 low days, and 1,394 mid days. High-correlation periods line up with known stress episodes, including the 2018 volatility spike, the 2020 COVID crash, and the 2022 drawdown (Figure 3).

![Figure 3. Rolling average cross-sector correlation with high and low regime shading.](../figures/04_rolling_corr_regimes.png)

As a check on co-movement, principal component analysis is run on the standardized sector returns. The first component explains 69.3% of the variance, and the first two explain 85.0% (Figure 4). A single factor accounts for most of the joint variation.

![Figure 4. PCA explained variance and rolling first-component share.](../figures/06_pca_analysis.png)

### Forecasting models

All forecasts are one step ahead and out of sample. For each day the model is fit only on data through the previous day, using a 252-day rolling window. The rolling correlation, the training window, and the regime thresholds all use data through the previous day, so nothing from day t enters the forecast for day t.

| Model | Specification |
|-------|---------------|
| Random walk | Predicted return is zero, so the price forecast equals the previous close; naive direction is the sign of the previous return |
| AR(1) | Return on one lag |
| Linear regression | Return on lags 1 through 5 |
| Ridge | Linear regression with an L2 penalty, α = 1.0 |
| Lasso | Linear regression with an L1 penalty, α = 5×10⁻⁴ |

The random walk is a hard benchmark; beating a no-change forecast out of sample is difficult for short-horizon returns (5). Ridge and Lasso are standard linear benchmarks in this setting, where shrinkage methods are evaluated alongside nonlinear ones that can do better (9). The penalties are fixed at conventional defaults rather than tuned, because the sample starts in January 2015 and there is no earlier period to tune on without look-ahead. A penalty grid is reported in the results.

### Evaluation

For each model and regime, mean absolute error (MAE) and root mean squared error (RMSE) are computed for both the return forecast and the price forecast, along with directional accuracy, which is the share of days on which the predicted return sign matches the realized sign. Days with zero realized return are dropped from the directional count.

Return MAE is the main scale for comparing regimes, because price levels drift and a price MAE would mix forecasting difficulty with the price level. One caution shapes the rest of the analysis. Because every model predicts a return near zero, the absolute return error is close to the size of the realized move, which tracks realized volatility. Volatility clusters and persists (10, 11), so return MAE is not independent of volatility. Directional accuracy is the metric that does not scale with move size; getting the sign right is no easier when moves are large.

### Volatility control

To separate a correlation effect from a volatility effect, a volatility proxy is added: the 90-day annualized realized volatility of SPY, computed through the previous day (12). The daily mean absolute error is regressed on the lagged correlation and the lagged volatility, each standardized, with Newey-West standard errors at 21 lags (13):

$$ |\text{error}|_t = b_0 + b_1\,\text{corr}_{t-1} + b_2\,\text{vol}_{t-1} + e_t. $$

Three versions are estimated: correlation only, volatility only, and both. A 2×2 sort on the lagged correlation quartiles and a lagged-volatility median split is also reported, so error can be read with volatility held roughly fixed.

---

## Results

### Accuracy by regime

Return errors are larger and directional accuracy is lower in the high-correlation regime for every model. The naive direction from the random walk is 46.6% in the high regime, below a coin flip.

| Model | Regime | MAE (return) | RMSE (return) | Directional accuracy |
|-------|--------|-------------:|--------------:|---------------------:|
| Random walk | high | 0.01162 | 0.01924 | 46.6% |
| Random walk | low | 0.00734 | 0.01009 | 50.6% |
| AR(1) | high | 0.01157 | 0.01915 | 50.6% |
| AR(1) | low | 0.00734 | 0.01013 | 52.0% |
| Linear regression | high | 0.01209 | 0.02032 | 49.3% |
| Linear regression | low | 0.00746 | 0.01027 | 50.6% |
| Ridge | high | 0.01162 | 0.01925 | 51.1% |
| Ridge | low | 0.00732 | 0.01012 | 53.1% |
| Lasso | high | 0.01163 | 0.01928 | 50.9% |
| Lasso | low | 0.00732 | 0.01011 | 53.2% |

Return errors are 58% to 62% larger in the high regime across the five models.

### Regime tests

For each model, absolute return errors in the high and low regimes are compared with a Welch t-test and a Mann-Whitney U test; comparing the accuracy of competing forecasts is a standard problem in forecast evaluation (14). Directional accuracy is compared with a two-proportion z-test, in the spirit of a nonparametric sign test (15). The paired observations are not independent, since regimes persist and the assets are correlated, so the very small p-values overstate certainty. The regression below uses heteroskedasticity- and autocorrelation-consistent standard errors and is the more reliable test.

| Model | Mean \|err\| high | Mean \|err\| low | t-test p | Mann-Whitney p | Cohen's d |
|-------|------------------:|-----------------:|---------:|---------------:|----------:|
| Random walk | 0.01162 | 0.00734 | 2.3×10⁻⁴⁴ | 2.0×10⁻²⁹ | 0.37 |
| AR(1) | 0.01157 | 0.00734 | 1.2×10⁻⁴³ | 3.0×10⁻²⁸ | 0.37 |
| Linear regression | 0.01209 | 0.00746 | 3.4×10⁻⁴⁶ | 4.5×10⁻³³ | 0.38 |
| Ridge | 0.01162 | 0.00732 | 2.1×10⁻⁴⁴ | 4.0×10⁻³⁰ | 0.37 |
| Lasso | 0.01163 | 0.00732 | 1.1×10⁻⁴⁴ | 1.8×10⁻³⁰ | 0.37 |

Both tests reject equal accuracy for every model, with a small-to-medium effect size. On its own this says accuracy depends on the regime.

### Correlation versus volatility

Lagged correlation and lagged volatility are correlated at 0.64 in the sample (Figure 5). The regression of daily mean absolute error on the two lagged predictors settles the question. The linear-regression model is shown; the other models give the same pattern (n = 2,620).

![Figure 5. Lagged correlation against lagged volatility.](../figures/10_corr_vs_vol_scatter.png)

| Specification | b (correlation) | p (corr) | b (volatility) | p (vol) | R² |
|---------------|----------------:|---------:|---------------:|--------:|---:|
| Correlation only | +0.00190 | 0.017 | — | — | 0.045 |
| Volatility only | — | — | +0.00309 | 5.3×10⁻⁵ | 0.119 |
| Both | −0.00015 | 0.794 | +0.00319 | 6.0×10⁻⁶ | 0.119 |

Correlation is significant on its own but drops to zero and loses significance once volatility is added, with a joint p between 0.72 and 0.79 across the five models. Volatility stays significant, with a joint p near 6×10⁻⁶. Adding correlation on top of volatility does not change the fit; R² is 0.119 either way, and ranges from 0.109 to 0.119 across models. Once volatility is in the regression, the correlation regime adds nothing to the error magnitude. The dependent variable here is still return error, which tracks move size, so the surviving volatility term is partly mechanical and should not be read as volatility predicting skill. Directional accuracy is tested below.

### Double sort

The 2×2 sort shows the same thing with volatility held roughly fixed. Cells use the correlation quartile thresholds (0.337 and 0.670) and the lagged-volatility median (0.137). The linear-regression model is shown.

| | Low volatility | High volatility |
|---|---:|---:|
| Low correlation | MAE 0.00734 (n = 3,095) | MAE 0.01032 (n = 390) |
| High correlation | MAE 0.00657 (n = 250) | MAE 0.01216 (n = 2,760) |

Moving from low to high volatility raises MAE within each correlation row, by 41% in the low row and 85% in the high row. Holding volatility fixed, correlation does not have a consistent effect: in the low-volatility row, high correlation has a lower MAE than low correlation, while in the high-volatility row it has a higher MAE. The two off-diagonal cells are small, at 250 and 390 days, because correlation and volatility move together, so those means are noisier (Figure 6).

![Figure 6. Mean absolute error by correlation and volatility cell.](../figures/11_double_sort.png)

### Directional accuracy

Return MAE tracks move size, so the test that does not is whether the models get the direction right in any regime. The 2×2 directional accuracy for all five models is:

| Model | Low corr, low vol | Low corr, high vol | High corr, low vol | High corr, high vol |
|-------|-----:|-----:|-----:|-----:|
| Random walk | 51.7% | 45.2% | 45.5% | 46.8% |
| AR(1) | 52.2% | 53.0% | 52.8% | 50.5% |
| Linear regression | 51.1% | 48.8% | 50.8% | 48.7% |
| Ridge | 53.3% | 53.0% | 48.4% | 51.7% |
| Lasso | 53.5% | 52.4% | 48.4% | 51.4% |

Every value is between 45% and 54%. No model has a clear edge in any cell, and the random walk direction is below 50% in three of four cells. The volatility ordering from the MAE tables does not carry over: for Ridge and Lasso the worst cell is high correlation with low volatility, and AR(1) is flat. Because correlation and volatility move together, their marginal orderings coincide and are small, about 1 to 5 percentage points, and the metric cannot assign the difference to one or the other. On a metric that does not scale with volatility, there is little sign skill to attribute in any regime (Figure 7).

![Figure 7. Directional accuracy by model and regime.](../figures/09_directional_accuracy.png)

### Penalty robustness

To check that the Ridge and Lasso results do not depend on the chosen penalty, both were rerun on SPY across a penalty grid. The ratio of high-regime to low-regime MAE is flat.

| Model | α values | High/low MAE ratio |
|-------|----------|--------------------|
| Ridge | 0.1, 1.0, 10.0 | 1.70, 1.71, 1.72 |
| Lasso | 1×10⁻⁴, 5×10⁻⁴, 1×10⁻³ | 1.71, 1.72, 1.72 |

The regime gap does not depend on the penalty. These ratios are for SPY alone, so they differ in level from the pooled five-asset figures.

---

## Discussion

Two statements hold at once. On error size, the correlation effect is a volatility effect. Errors are about 60% larger in the high-correlation regime, but the effect disappears once volatility is controlled with a lagged proxy, and the double sort shows the correlation effect changing sign across volatility levels. This matches earlier work on how correlation is measured: estimated correlation rises with volatility, so a correlation-regime effect can be a volatility effect (7). That work examined cross-country contagion; the same bias applies here in a cross-sector, forecasting setting.

The volatility side should not be overstated either. The surviving volatility term is measured on return error, and since the forecasts are near zero, that error is close to move size, so the link is partly mechanical. This is why the analysis relies on directional accuracy, which does not scale with move size. On that metric, accuracy is between 45% and 54% in every cell, and neither correlation nor volatility produces a clean ordering. There is little short-horizon sign skill in any regime, which is consistent with the out-of-sample predictability literature (4, 5).

The usable point is narrow. Volatility, observable the day before, tracks how large errors will be, and correlation adds nothing beyond it. Large errors are not the same as lost skill, and on a scale-free basis the models are near a coin flip in every regime. A single headline accuracy number is misleading, but the variable that matters for error size is volatility, not correlation.

### Limitations

Correlation and volatility cannot be fully separated in this sample, since they move together and the cells that would separate them are the smallest. One volatility proxy is used; a different proxy such as VIX or a GARCH estimate could shift the coefficients but is unlikely to reverse the sign of the result. The models are linear and short-horizon; nonlinear models could behave differently, though they face the same noisy data. The sample is U.S. equity ETFs from 2015 to 2026. The regime-test p-values overstate certainty because the observations overlap; the regression with corrected standard errors is the reliable test.

---

## Conclusion

A correlation-regime effect that looks strong turns out to be a volatility effect. Return errors are 58% to 62% larger in the high-correlation regime, with p < 0.001 across five models and two tests, but the effect does not survive a lagged volatility control: the correlation term drops to zero and loses significance while volatility stays significant. On directional accuracy, which does not scale with move size, the models are near a coin flip in every regime. The result generalizes to other regime studies. When a variable such as correlation is sorted on, it can stand in for volatility, and a small p-value on an error metric does not separate the two. The check is to add a lagged volatility control and to test on a metric that move size cannot inflate. Here, both remove the effect.

---

## Acknowledgments

The author thanks Dr. Madjid Tavana for guidance on this project. The author used Claude (Anthropic), an AI assistant, to help write and debug the Python analysis code, run the statistical analyses, generate the figures, and draft and revise the manuscript. All results were reproduced from the code, and the author is responsible for the final content. The data, code, and figures are available at github.com/zikobob/stock-research.

---

## References

1\. Hamilton, James D. "A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle." *Econometrica*, vol. 57, no. 2, 1989, pp. 357-384. doi.org/10.2307/1912559

2\. Ang, Andrew, et al. "International Asset Allocation with Regime Shifts." *The Review of Financial Studies*, vol. 15, no. 4, 2002, pp. 1137-1187. doi.org/10.1093/rfs/15.4.1137

3\. Ang, Andrew, et al. "Asymmetric Correlations of Equity Portfolios." *Journal of Financial Economics*, vol. 63, no. 3, 2002, pp. 443-494. doi.org/10.1016/S0304-405X(02)00068-5

4\. Welch, Ivo, et al. "A Comprehensive Look at the Empirical Performance of Equity Premium Prediction." *The Review of Financial Studies*, vol. 21, no. 4, 2008, pp. 1455-1508. doi.org/10.1093/rfs/hhm014

5\. Campbell, John Y., et al. "Predicting Excess Stock Returns Out of Sample: Can Anything Beat the Historical Average?" *The Review of Financial Studies*, vol. 21, no. 4, 2008, pp. 1509-1531. doi.org/10.1093/rfs/hhm055

6\. Rapach, David E., et al. "Out-of-Sample Equity Premium Prediction: Combination Forecasts and Links to the Real Economy." *The Review of Financial Studies*, vol. 23, no. 2, 2010, pp. 821-862. doi.org/10.1093/rfs/hhp063

7\. Forbes, Kristin J., et al. "No Contagion, Only Interdependence: Measuring Stock Market Comovements." *The Journal of Finance*, vol. 57, no. 5, 2002, pp. 2223-2261. doi.org/10.1111/0022-1082.00494

8\. Cont, Rama. "Empirical Properties of Asset Returns: Stylized Facts and Statistical Issues." *Quantitative Finance*, vol. 1, no. 2, 2001, pp. 223-236. doi.org/10.1088/1469-7688/1/2/304

9\. Gu, Shihao, et al. "Empirical Asset Pricing via Machine Learning." *The Review of Financial Studies*, vol. 33, no. 5, 2020, pp. 2223-2273. doi.org/10.1093/rfs/hhaa009

10\. Engle, Robert F. "Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation." *Econometrica*, vol. 50, no. 4, 1982, pp. 987-1008. doi.org/10.2307/1912773

11\. Bollerslev, Tim. "Generalized Autoregressive Conditional Heteroskedasticity." *Journal of Econometrics*, vol. 31, no. 3, 1986, pp. 307-327. doi.org/10.1016/0304-4076(86)90063-1

12\. Andersen, Torben G., et al. "Modeling and Forecasting Realized Volatility." *Econometrica*, vol. 71, no. 2, 2003, pp. 579-625. doi.org/10.1111/1468-0262.00418

13\. Newey, Whitney K., et al. "A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix." *Econometrica*, vol. 55, no. 3, 1987, pp. 703-708. doi.org/10.2307/1913610

14\. Diebold, Francis X., et al. "Comparing Predictive Accuracy." *Journal of Business & Economic Statistics*, vol. 13, no. 3, 1995, pp. 253-263. doi.org/10.1080/07350015.1995.10524599

15\. Pesaran, M. Hashem, et al. "A Simple Nonparametric Test of Predictive Performance." *Journal of Business & Economic Statistics*, vol. 10, no. 4, 1992, pp. 461-465. doi.org/10.1080/07350015.1992.10509922
