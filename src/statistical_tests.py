"""
Step 6 - Statistical testing.

Tests the core research hypothesis for each model:

    H0: Prediction accuracy is independent of the correlation regime.
    H1: Prediction accuracy differs across (high vs low) correlation regimes.

We compare the distribution of absolute one-step-ahead return errors in the
high-correlation regime against the low-correlation regime using:
  - Welch's t-test (does not assume equal variance) on the mean error, and
  - the Mann-Whitney U test (non-parametric, robust to non-normal errors).

Directional accuracy is compared with a two-proportion z-test.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd
from scipy import stats

from . import config


def _two_proportion_ztest(success_a, n_a, success_b, n_b) -> tuple[float, float]:
    """Two-sided two-proportion z-test. Returns (z, p_value)."""
    p_a = success_a / n_a
    p_b = success_b / n_b
    p_pool = (success_a + success_b) / (n_a + n_b)
    se = np.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b))
    if se == 0:
        return 0.0, 1.0
    z = (p_a - p_b) / se
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    return float(z), float(p_value)


def test_model(pooled_df: pd.DataFrame, model_name: str) -> dict:
    """Run all hypothesis tests for one model's pooled errors."""
    high = pooled_df[pooled_df["regime"] == "high"]
    low = pooled_df[pooled_df["regime"] == "low"]

    high_err = high["abs_return_error"].dropna().values
    low_err = low["abs_return_error"].dropna().values

    # Welch's t-test on mean absolute error.
    t_stat, t_p = stats.ttest_ind(high_err, low_err, equal_var=False)

    # Mann-Whitney U (distribution-free).
    u_stat, u_p = stats.mannwhitneyu(high_err, low_err, alternative="two-sided")

    # Directional accuracy comparison.
    high_dir = high[high["actual_dir"] != 0]
    low_dir = low[low["actual_dir"] != 0]
    z_stat, z_p = _two_proportion_ztest(
        high_dir["correct_dir"].sum(), len(high_dir),
        low_dir["correct_dir"].sum(), len(low_dir),
    )

    # Effect size: Cohen's d for the error difference.
    pooled_sd = np.sqrt(
        ((len(high_err) - 1) * np.var(high_err, ddof=1)
         + (len(low_err) - 1) * np.var(low_err, ddof=1))
        / (len(high_err) + len(low_err) - 2)
    )
    cohens_d = (high_err.mean() - low_err.mean()) / pooled_sd if pooled_sd else np.nan

    return {
        "model": model_name,
        "n_high": len(high_err),
        "n_low": len(low_err),
        "mean_abs_err_high": float(high_err.mean()),
        "mean_abs_err_low": float(low_err.mean()),
        "median_abs_err_high": float(np.median(high_err)),
        "median_abs_err_low": float(np.median(low_err)),
        "dir_acc_high": float(high_dir["correct_dir"].mean()),
        "dir_acc_low": float(low_dir["correct_dir"].mean()),
        "t_stat": float(t_stat),
        "t_pvalue": float(t_p),
        "mannwhitney_U": float(u_stat),
        "mannwhitney_pvalue": float(u_p),
        "dir_ztest_stat": z_stat,
        "dir_ztest_pvalue": z_p,
        "cohens_d": float(cohens_d),
    }


def interpret(row: pd.Series, alpha: float = 0.05) -> str:
    """Plain-language interpretation of a test row."""
    better = "high" if row["mean_abs_err_high"] < row["mean_abs_err_low"] else "low"
    sig = row["mannwhitney_pvalue"] < alpha
    verdict = "REJECT H0" if sig else "fail to reject H0"
    return (f"{row['model']}: errors lower in {better}-corr regime; "
            f"Mann-Whitney p={row['mannwhitney_pvalue']:.4f} -> {verdict}")


def run(pooled: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = [test_model(df, model) for model, df in pooled.items()]
    results = pd.DataFrame(rows)

    config.ensure_dirs()
    path = os.path.join(config.RESULTS_DIR, "hypothesis_tests.csv")
    results.to_csv(path, index=False)

    print("[statistical_tests] Hypothesis test results (high vs low regime):")
    for _, row in results.iterrows():
        print("  " + interpret(row))
    print(f"[statistical_tests] Saved -> {path}")
    return results
