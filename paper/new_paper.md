# Cross-Sector Correlation Regimes and Their Impact on the Predictive Accuracy of Equity Price Forecasting Models

**A quantitative study of U.S. sector ETFs (2015–2026)**

---

## Abstract

This paper examines whether the accuracy of one-day-ahead equity forecasts depends on cross-sector correlation regimes, and whether that dependence survives after controlling for volatility. Daily data from January 2015 to June 2026 cover four S&P 500 sector ETFs, technology, health care, energy, and financials, along with SPY. High, mid, and low correlation regimes are defined by quartiles of a 90-day rolling pairwise correlation. Five walk-forward models are evaluated: a random walk, an AR(1), a five-lag linear regression, and Ridge and Lasso variants.

Absolute return errors run 58% to 62% larger in the high-correlation regime (p < 0.001 across all models via t-test and Mann-Whitney tests). Sector correlation and volatility co-move substantially in this sample (r = 0.64), which complicates the interpretation of the regime result on its own. A joint regression on lagged correlation and lagged volatility resolves this: correlation loses significance (p = 0.72–0.79), volatility remains highly significant (p ≈ 6×10⁻⁶), and model fit does not improve when correlation is added. Directional accuracy stays between 45% and 54% across all regimes. The regime-dependent forecast errors observed here trace to volatility, not correlation.

<!-- Add the next section here (for example: ## Introduction). Then rebuild with
     python paper/build_manuscript_docx.py new_paper
     python paper/build_manuscript_preview.py new_paper -->
