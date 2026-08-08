# Cross-Sector Correlation Regimes and Their Impact on the Predictive Accuracy of Equity Price Forecasting Models

**A quantitative study of U.S. sector ETFs (2015–2026)**

---

## Abstract

This paper examines whether the accuracy of one-day-ahead equity forecasts depends on cross-sector correlation regimes, and whether that dependence survives after controlling for volatility. Daily data from January 2015 to June 2026 cover four S&P 500 sector ETFs, technology, health care, energy, and financials, along with SPY. High, mid, and low correlation regimes are defined by quartiles of a 90-day rolling pairwise correlation. Five walk-forward models are evaluated: a random walk, an AR(1), a five-lag linear regression, and Ridge and Lasso variants.

Absolute return errors run 58% to 62% larger in the high-correlation regime (p < 0.001 across all models via t-test and Mann-Whitney tests). Sector correlation and volatility co-move substantially in this sample (r = 0.64), which complicates the interpretation of the regime result on its own. A joint regression on lagged correlation and lagged volatility resolves this: correlation loses significance (p = 0.72–0.79), volatility remains highly significant (p ≈ 6×10⁻⁶), and model fit does not improve when correlation is added. Directional accuracy stays between 45% and 54% across all regimes. The regime-dependent forecast errors observed here trace to volatility, not correlation.

<!-- Add body sections ABOVE this line, in JEI order:
     ## Introduction  ## Results  ## Discussion  ## Methods
     Use numbered in-text citations (1), (2) at the end of each sentence.
     Rebuild with:
       python paper/build_manuscript_docx.py new_paper
       python paper/build_manuscript_preview.py new_paper -->

---

## Acknowledgments

The author thanks Dr. Madjid Tavana for guidance on this project. The author used Claude (Anthropic), an AI assistant, to help write and debug the Python analysis code, run the statistical analyses, generate the figures, and draft and revise the manuscript. All results were reproduced from the code, and the author is responsible for the final content.

---

## References

<!-- JEI format: number references in the order they are first cited in the text
     (not alphabetically), no hanging indent, modified MLA8, no "https://" in URLs.
     Example:
     1. Forbes, Kristin J., and Roberto Rigobon. "No Contagion, Only
        Interdependence: Measuring Stock Market Comovements." The Journal of
        Finance, vol. 57, no. 5, 2002, pp. 2223-2261. doi.org/10.1111/0022-1082.00494 -->
