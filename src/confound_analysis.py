"""
Confound analysis: correlation vs. volatility.

High cross-sector correlation is collinear with high volatility, so a critic
can argue the main result ("errors larger in high-correlation regimes") merely
reflects bigger price moves, not a correlation effect per se. This module
addresses that directly and *honestly* -- it reports whatever the data show.

It performs three analyses, all using information strictly available at t-1:

  1. A volatility proxy: 90-day realized (annualized) volatility of SPY,
     computed through day t-1.

  2. OLS regressions of the daily mean absolute return-forecast error on the
     LAGGED average correlation and the LAGGED volatility proxy:
         |error_t| = b0 + b1*corr_{t-1} + b2*vol_{t-1} + e
     Reported with Newey-West (HAC) standard errors, because the series are
     highly persistent and OLS standard errors would otherwise be understated.
     We report the corr-only, vol-only, and joint specifications so the
     shrinkage of b1 when volatility is added is visible.

  3. A 2x2 double sort: Low/High correlation (25th/75th pct) x Low/High
     volatility (median split). The critical cell comparison is
     high-vol/low-corr vs high-vol/high-corr, which isolates the correlation
     effect with volatility held high.

Additionally, an alpha-robustness check re-runs Ridge/Lasso over a small grid
of penalties to show the regime finding does not hinge on the exact alpha.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.linear_model import Ridge, Lasso

from . import config, models


# --------------------------------------------------------------------------- #
# Volatility proxy
# --------------------------------------------------------------------------- #
def realized_volatility(spy_returns: pd.Series, window: int = 90) -> pd.Series:
    """Annualized rolling realized volatility of SPY through day t.

    (The caller lags this by one day to make it a t-1 predictor.)
    """
    vol = spy_returns.rolling(window).std(ddof=0) * np.sqrt(252)
    vol.name = "realized_vol"
    return vol.dropna()


# --------------------------------------------------------------------------- #
# Error panels
# --------------------------------------------------------------------------- #
def per_asset_error_panel(
    universe_forecasts: dict, model: str
) -> pd.DataFrame:
    """Long panel of per-asset, per-day errors for one model.

    Columns: date (index), ticker, abs_err (|return error|), correct_dir,
    valid_dir (1 if actual direction is non-zero).
    """
    frames = []
    for tk, model_dict in universe_forecasts.items():
        f = model_dict[model].copy()
        out = pd.DataFrame(index=f.index)
        out["ticker"] = tk
        out["abs_err"] = (f["actual_return"] - f["pred_return"]).abs()
        out["valid_dir"] = (f["actual_dir"] != 0).astype(int)
        out["correct_dir"] = (
            (f["pred_dir"] == f["actual_dir"]) & (f["actual_dir"] != 0)
        ).astype(int)
        frames.append(out)
    return pd.concat(frames, sort=False)


def daily_mean_error(panel: pd.DataFrame) -> pd.DataFrame:
    """Collapse the per-asset panel to one row per day (cross-asset mean)."""
    g = panel.groupby(level=0)
    daily = pd.DataFrame({
        "mean_abs_err": g["abs_err"].mean(),
        "dir_acc": g.apply(
            lambda d: d["correct_dir"].sum() / max(d["valid_dir"].sum(), 1),
            include_groups=False,
        ),
    })
    return daily


# --------------------------------------------------------------------------- #
# Regression: |error| ~ lagged corr + lagged vol
# --------------------------------------------------------------------------- #
def _zscore(s: pd.Series) -> pd.Series:
    return (s - s.mean()) / s.std(ddof=0)


def confound_regressions(
    universe_forecasts: dict,
    corr_lag: pd.Series,
    vol_lag: pd.Series,
    model_names: list[str],
    hac_lags: int = 21,
) -> pd.DataFrame:
    """Run corr-only, vol-only, and joint HAC regressions per model."""
    rows = []
    for model in model_names:
        panel = per_asset_error_panel(universe_forecasts, model)
        daily = daily_mean_error(panel)

        df = pd.concat(
            [daily["mean_abs_err"], corr_lag.rename("corr"),
             vol_lag.rename("vol")], axis=1
        ).dropna()

        y = df["mean_abs_err"].values
        corr_z = _zscore(df["corr"])
        vol_z = _zscore(df["vol"])

        # Corr only
        m1 = sm.OLS(y, sm.add_constant(corr_z.values)).fit(
            cov_type="HAC", cov_kwds={"maxlags": hac_lags})
        # Vol only
        m2 = sm.OLS(y, sm.add_constant(vol_z.values)).fit(
            cov_type="HAC", cov_kwds={"maxlags": hac_lags})
        # Joint
        X = sm.add_constant(np.column_stack([corr_z.values, vol_z.values]))
        m3 = sm.OLS(y, X).fit(cov_type="HAC", cov_kwds={"maxlags": hac_lags})

        rows.append({
            "model": model,
            "n": int(len(df)),
            "corr_vol_correlation": float(np.corrcoef(df["corr"], df["vol"])[0, 1]),
            "b_corr_only": m1.params[1],
            "p_corr_only": m1.pvalues[1],
            "r2_corr_only": m1.rsquared,
            "b_vol_only": m2.params[1],
            "p_vol_only": m2.pvalues[1],
            "r2_vol_only": m2.rsquared,
            "b_corr_joint": m3.params[1],
            "p_corr_joint": m3.pvalues[1],
            "b_vol_joint": m3.params[2],
            "p_vol_joint": m3.pvalues[2],
            "r2_joint": m3.rsquared,
        })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# 2x2 double sort
# --------------------------------------------------------------------------- #
def double_sort(
    universe_forecasts: dict,
    corr_lag: pd.Series,
    vol_lag: pd.Series,
    model_names: list[str],
) -> tuple[pd.DataFrame, dict]:
    """2x2 sort on lagged correlation (quartiles) x lagged volatility (median).

    Returns (long_result_table, thresholds).
    """
    low_c = corr_lag.quantile(config.LOW_REGIME_QUANTILE)
    high_c = corr_lag.quantile(config.HIGH_REGIME_QUANTILE)
    med_v = vol_lag.quantile(0.50)

    corr_bin = pd.Series(index=corr_lag.index, dtype=object)
    corr_bin[corr_lag <= low_c] = "low_corr"
    corr_bin[corr_lag >= high_c] = "high_corr"
    vol_bin = pd.Series(
        np.where(vol_lag >= med_v, "high_vol", "low_vol"), index=vol_lag.index
    )

    rows = []
    for model in model_names:
        panel = per_asset_error_panel(universe_forecasts, model)
        # Map each observation's date to its regime bins.
        panel = panel.copy()
        panel["corr_bin"] = corr_bin.reindex(panel.index.get_level_values(0)).values
        panel["vol_bin"] = vol_bin.reindex(panel.index.get_level_values(0)).values
        panel = panel.dropna(subset=["corr_bin", "vol_bin"])

        for cbin in ["low_corr", "high_corr"]:
            for vbin in ["low_vol", "high_vol"]:
                cell = panel[(panel["corr_bin"] == cbin) & (panel["vol_bin"] == vbin)]
                if len(cell) == 0:
                    continue
                valid = cell["valid_dir"].sum()
                rows.append({
                    "model": model,
                    "corr": cbin,
                    "vol": vbin,
                    "n_obs": int(len(cell)),
                    "MAE_return": float(cell["abs_err"].mean()),
                    "dir_acc": float(cell["correct_dir"].sum() / max(valid, 1)),
                })
    thresholds = {"low_corr": float(low_c), "high_corr": float(high_c),
                  "median_vol": float(med_v)}
    return pd.DataFrame(rows), thresholds


# --------------------------------------------------------------------------- #
# Alpha robustness
# --------------------------------------------------------------------------- #
def alpha_robustness(
    returns: pd.DataFrame,
    prices: pd.DataFrame,
    regimes: pd.DataFrame,
    ridge_alphas=(0.1, 1.0, 10.0),
    lasso_alphas=(1e-4, 5e-4, 1e-3),
) -> pd.DataFrame:
    """Re-run Ridge/Lasso over an alpha grid; report high/low regime MAE ratio.

    Uses the market ticker (SPY) to keep the check fast; the paper reports the
    ratio of mean absolute return error in the high vs low regime for each
    alpha, showing the regime effect is not an artifact of the chosen penalty.
    """
    reg = regimes["regime"]
    tk = config.MARKET_TICKER
    r, p = returns[tk], prices[tk]

    def ratio_for(factory):
        f = models._walk_forward_regression(
            r, p, factory, config.N_LAGS, config.FIT_WINDOW)
        f = f.join(reg, how="inner")
        f["abs_err"] = (f["actual_return"] - f["pred_return"]).abs()
        hi = f[f["regime"] == "high"]["abs_err"].mean()
        lo = f[f["regime"] == "low"]["abs_err"].mean()
        return hi, lo, hi / lo

    rows = []
    for a in ridge_alphas:
        hi, lo, ratio = ratio_for(lambda a=a: Ridge(alpha=a))
        rows.append({"model": "Ridge", "alpha": a, "mae_high": hi,
                     "mae_low": lo, "high_low_ratio": ratio})
    for a in lasso_alphas:
        hi, lo, ratio = ratio_for(
            lambda a=a: Lasso(alpha=a, max_iter=10000))
        rows.append({"model": "Lasso", "alpha": a, "mae_high": hi,
                     "mae_low": lo, "high_low_ratio": ratio})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# Runner
# --------------------------------------------------------------------------- #
def run() -> dict:
    config.ensure_dirs()

    prices = pd.read_csv(
        os.path.join(config.PROCESSED_DATA_DIR, "prices_clean.csv"),
        index_col=0, parse_dates=True)
    returns = pd.read_csv(
        os.path.join(config.PROCESSED_DATA_DIR, "log_returns.csv"),
        index_col=0, parse_dates=True)
    regimes = pd.read_csv(
        os.path.join(config.PROCESSED_DATA_DIR, "regimes.csv"),
        index_col=0, parse_dates=True)

    # Lagged predictors (strictly t-1 information).
    corr_lag = regimes["avg_pairwise_corr"].shift(1)
    vol = realized_volatility(returns[config.MARKET_TICKER],
                              window=config.ROLLING_CORR_WINDOW)
    vol_lag = vol.shift(1)

    print("[confound] Re-running walk-forward forecasts ...")
    universe_forecasts = models.forecast_universe(returns, prices)
    model_names = list(universe_forecasts[config.MARKET_TICKER].keys())

    # 1-2. Regressions
    reg_table = confound_regressions(universe_forecasts, corr_lag, vol_lag,
                                     model_names)
    reg_path = os.path.join(config.RESULTS_DIR, "confound_regression.csv")
    reg_table.to_csv(reg_path, index=False)

    # 3. Double sort
    ds_table, thr = double_sort(universe_forecasts, corr_lag, vol_lag,
                                model_names)
    ds_path = os.path.join(config.RESULTS_DIR, "double_sort.csv")
    ds_table.to_csv(ds_path, index=False)

    # Alpha robustness
    ar_table = alpha_robustness(returns, prices, regimes)
    ar_path = os.path.join(config.RESULTS_DIR, "alpha_robustness.csv")
    ar_table.to_csv(ar_path, index=False)

    # Save the lagged predictors for the figure / reproducibility.
    predictors = pd.concat([corr_lag.rename("corr_lag"),
                            vol_lag.rename("vol_lag")], axis=1).dropna()
    predictors.to_csv(os.path.join(config.PROCESSED_DATA_DIR,
                                   "lagged_predictors.csv"))

    # Figures (imported here to avoid a hard matplotlib dependency on import).
    from . import visualization as viz
    viz.plot_corr_vol_scatter(predictors)
    viz.plot_double_sort(ds_table, model="LinearRegression")

    print("\n[confound] === Regression (HAC SE) ===")
    print(reg_table.to_string(index=False))
    print("\n[confound] === Double sort thresholds ===")
    print(thr)
    print("\n[confound] === Double sort ===")
    print(ds_table.to_string(index=False))
    print("\n[confound] === Alpha robustness ===")
    print(ar_table.to_string(index=False))
    print(f"\n[confound] corr-vol correlation: "
          f"{reg_table['corr_vol_correlation'].iloc[0]:.3f}")

    return {
        "regression": reg_table,
        "double_sort": ds_table,
        "thresholds": thr,
        "alpha_robustness": ar_table,
        "predictors": predictors,
    }


if __name__ == "__main__":
    run()
