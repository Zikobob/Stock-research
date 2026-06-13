"""
Step 5 - Evaluation metrics.

Computes Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and
directional accuracy for every model, broken down by correlation regime
(high vs low vs mid) and pooled across the asset universe.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

from . import config


def attach_regime(forecast: pd.DataFrame, regimes: pd.DataFrame) -> pd.DataFrame:
    """Join the regime label onto a forecast frame by date (inner join)."""
    merged = forecast.join(regimes["regime"], how="inner")
    return merged


def _metrics(df: pd.DataFrame) -> dict[str, float]:
    """MAE / RMSE on price plus directional accuracy for one group of rows."""
    err = df["actual_price"] - df["pred_price"]
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err ** 2)))

    # Return-space errors are scale-free and comparable across assets.
    ret_err = df["actual_return"] - df["pred_return"]
    mae_ret = float(np.mean(np.abs(ret_err)))
    rmse_ret = float(np.sqrt(np.mean(ret_err ** 2)))

    # Directional accuracy: ignore zero-return days (no true direction).
    valid = df["actual_dir"] != 0
    if valid.sum() > 0:
        dir_acc = float(
            (df.loc[valid, "pred_dir"] == df.loc[valid, "actual_dir"]).mean()
        )
    else:
        dir_acc = np.nan

    return {
        "n": int(len(df)),
        "MAE_price": mae,
        "RMSE_price": rmse,
        "MAE_return": mae_ret,
        "RMSE_return": rmse_ret,
        "Directional_Accuracy": dir_acc,
    }


def evaluate_pooled(
    universe_forecasts: dict[str, dict[str, pd.DataFrame]],
    regimes: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    """Evaluate every model pooled across all assets, split by regime.

    Returns:
      summary  - long-form table: model x regime x metrics
      pooled   - dict {model_name: pooled-with-regime DataFrame of per-day,
                 per-asset prediction errors} for downstream statistical tests.
    """
    # Collect model names from the first ticker.
    any_ticker = next(iter(universe_forecasts))
    model_names = list(universe_forecasts[any_ticker].keys())

    summary_rows = []
    pooled: dict[str, pd.DataFrame] = {}

    for model in model_names:
        frames = []
        for tk, model_dict in universe_forecasts.items():
            f = attach_regime(model_dict[model], regimes).copy()
            f["ticker"] = tk
            # Scale-free absolute return error for cross-asset pooling/tests.
            f["abs_return_error"] = (f["actual_return"] - f["pred_return"]).abs()
            f["sq_return_error"] = (f["actual_return"] - f["pred_return"]) ** 2
            f["correct_dir"] = (
                (f["pred_dir"] == f["actual_dir"]) & (f["actual_dir"] != 0)
            ).astype(int)
            frames.append(f)

        pooled_df = pd.concat(frames)
        pooled[model] = pooled_df

        # Overall + per regime metrics.
        for regime_label in ["all", "high", "low", "mid"]:
            if regime_label == "all":
                sub = pooled_df
            else:
                sub = pooled_df[pooled_df["regime"] == regime_label]
            if len(sub) == 0:
                continue
            m = _metrics(sub)
            m.update({"model": model, "regime": regime_label})
            summary_rows.append(m)

    summary = pd.DataFrame(summary_rows)
    cols = ["model", "regime", "n", "MAE_price", "RMSE_price",
            "MAE_return", "RMSE_return", "Directional_Accuracy"]
    summary = summary[cols].sort_values(["model", "regime"]).reset_index(drop=True)
    return summary, pooled


def per_asset_summary(
    universe_forecasts: dict[str, dict[str, pd.DataFrame]],
    regimes: pd.DataFrame,
) -> pd.DataFrame:
    """Per-asset, per-model, per-regime metrics (detailed breakdown)."""
    rows = []
    for tk, model_dict in universe_forecasts.items():
        for model, f in model_dict.items():
            merged = attach_regime(f, regimes)
            for regime_label in ["all", "high", "low"]:
                sub = (merged if regime_label == "all"
                       else merged[merged["regime"] == regime_label])
                if len(sub) == 0:
                    continue
                m = _metrics(sub)
                m.update({"ticker": tk, "model": model, "regime": regime_label})
                rows.append(m)
    df = pd.DataFrame(rows)
    cols = ["ticker", "model", "regime", "n", "MAE_price", "RMSE_price",
            "MAE_return", "RMSE_return", "Directional_Accuracy"]
    return df[cols]


def save_outputs(summary: pd.DataFrame, per_asset: pd.DataFrame) -> dict[str, str]:
    config.ensure_dirs()
    paths = {
        "summary": os.path.join(config.RESULTS_DIR, "metrics_by_regime.csv"),
        "per_asset": os.path.join(config.RESULTS_DIR, "metrics_per_asset.csv"),
    }
    summary.to_csv(paths["summary"], index=False)
    per_asset.to_csv(paths["per_asset"], index=False)
    return paths


def run(universe_forecasts, regimes) -> dict:
    summary, pooled = evaluate_pooled(universe_forecasts, regimes)
    per_asset = per_asset_summary(universe_forecasts, regimes)
    paths = save_outputs(summary, per_asset)

    print("[evaluation] Pooled metrics by model and regime:")
    print(summary.to_string(index=False))
    for name, p in paths.items():
        print(f"[evaluation] Saved {name} -> {p}")

    return {"summary": summary, "pooled": pooled, "per_asset": per_asset}
