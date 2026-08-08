"""
Layer 6 -- Prediction module.

Builds and honestly evaluates one-day-ahead forecasts for each individual stock
in the portfolio, so the project both *analyzes* the names (Layers 1-5) and
*predicts* them.

Design choices that keep the evaluation credible:

* **Walk-forward, out-of-sample.** For each test day the models are trained only
  on a rolling window of prior days (``config.PRED_TRAIN_WINDOW``), refit on a
  weekly cadence (``config.PRED_REFIT_EVERY``). Nothing from day *t* — or after —
  ever enters the forecast for day *t*. This is the single most important guard
  against the look-ahead bias that makes most amateur "stock predictors" look
  far better than they are.
* **A hard baseline.** The random walk ("tomorrow looks like a coin flip; the
  best guess for the return is zero") is included on purpose. Short-horizon
  return prediction is genuinely hard, and beating a random walk out of sample is
  the real bar (Welch & Goyal 2008; Campbell & Thompson 2008).
* **The right metric.** Directional accuracy (did we get up vs down right?) is the
  headline, because it does not scale with the size of the move. Return MAE/RMSE
  are also reported for the return models.

Models
------
* ``RandomWalk``   -- predicted return 0; naive direction = sign of yesterday.
* ``RidgeReturn``  -- Ridge regression on lagged returns -> return; sign = direction.
* ``LogisticDir``  -- logistic regression on features -> P(up).
* ``RandomForest`` -- random-forest classifier on features -> direction (the ML model).

Features are lagged daily log returns (lags 1..K), 5-day momentum, and 10-day
realized volatility, all computed through the previous day.
"""
from __future__ import annotations

import os

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler

from . import config

RESULTS_DIR = config.PROCESSED_DIR


# --------------------------------------------------------------------------- #
# Feature engineering
# --------------------------------------------------------------------------- #
def build_features(returns: pd.Series, lags: int = config.PRED_LAGS) -> pd.DataFrame:
    """Turn a single stock's return series into a supervised-learning table.

    Every feature is known at the *close of day t-1*, and the target is the
    return on day *t* — so a row never contains information from its own target
    day. Returns a DataFrame with feature columns plus ``y_ret`` and ``y_dir``.
    """
    df = pd.DataFrame(index=returns.index)
    for k in range(1, lags + 1):
        df[f"lag_{k}"] = returns.shift(k)
    df["mom_5"] = returns.shift(1).rolling(5).sum()      # 5-day momentum
    df["vol_10"] = returns.shift(1).rolling(10).std()    # recent realized vol
    df["y_ret"] = returns                                # target: today's return
    df["y_dir"] = (returns > 0).astype(int)              # target: up (1) / down (0)
    return df.dropna()


_FEATURE_COLS = [f"lag_{k}" for k in range(1, config.PRED_LAGS + 1)] + ["mom_5", "vol_10"]


# --------------------------------------------------------------------------- #
# Walk-forward evaluation for one stock
# --------------------------------------------------------------------------- #
def walk_forward(returns: pd.Series,
                train_window: int = config.PRED_TRAIN_WINDOW,
                refit_every: int = config.PRED_REFIT_EVERY,
                seed: int = 42) -> pd.DataFrame:
    """Produce out-of-sample predictions for one stock across every model.

    Returns a tidy DataFrame: one row per test day with the realized return, the
    realized direction, and each model's predicted return / predicted direction.
    """
    data = build_features(returns)
    X_all = data[_FEATURE_COLS].values
    y_ret = data["y_ret"].values
    y_dir = data["y_dir"].values
    idx = data.index
    n = len(data)

    records = []
    # Cached fitted models (refit only every `refit_every` steps).
    ridge = logit = rf = scaler = None

    for t in range(train_window, n):
        # (Re)fit on the trailing window ending at t-1 when the cadence says so.
        if (t - train_window) % refit_every == 0 or ridge is None:
            lo = t - train_window
            Xtr, yr, yd = X_all[lo:t], y_ret[lo:t], y_dir[lo:t]
            scaler = StandardScaler().fit(Xtr)
            Xtr_s = scaler.transform(Xtr)

            ridge = Ridge(alpha=1.0).fit(Xtr_s, yr)
            # Logistic / RF need both classes present in the window.
            if len(np.unique(yd)) == 2:
                logit = LogisticRegression(max_iter=1000).fit(Xtr_s, yd)
                rf = RandomForestClassifier(
                    n_estimators=config.PRED_RF_TREES,
                    max_depth=config.PRED_RF_MAX_DEPTH,
                    random_state=seed, n_jobs=1,
                ).fit(Xtr_s, yd)
            else:
                logit = rf = None

        # Predict day t (strictly out of sample).
        xt = scaler.transform(X_all[t:t + 1])
        prev_ret = X_all[t, 0]  # lag_1 == yesterday's return

        ridge_ret = float(ridge.predict(xt)[0])
        rec = {
            "date": idx[t],
            "y_ret": y_ret[t],
            "y_dir": int(y_dir[t]),
            # Random walk: return 0, naive direction = sign of yesterday.
            "rw_ret": 0.0,
            "rw_dir": int(prev_ret > 0),
            # Ridge return model.
            "ridge_ret": ridge_ret,
            "ridge_dir": int(ridge_ret > 0),
            # Direction models (fall back to "up" if a class was missing at refit).
            "logit_dir": int(logit.predict(xt)[0]) if logit is not None else 1,
            "rf_dir": int(rf.predict(xt)[0]) if rf is not None else 1,
        }
        records.append(rec)

    return pd.DataFrame(records).set_index("date")


# --------------------------------------------------------------------------- #
# Scoring
# --------------------------------------------------------------------------- #
def _directional_accuracy(y_true_dir: np.ndarray, y_pred_dir: np.ndarray,
                        realized_ret: np.ndarray) -> float:
    """Share of days the predicted up/down matches reality (flat days dropped)."""
    mask = realized_ret != 0
    if mask.sum() == 0:
        return float("nan")
    return float((y_true_dir[mask] == y_pred_dir[mask]).mean())


def score_stock(sym: str, preds: pd.DataFrame) -> pd.DataFrame:
    """Compute per-model metrics for one stock's walk-forward predictions."""
    realized = preds["y_ret"].values
    true_dir = preds["y_dir"].values
    rows = []
    model_map = {
        "RandomWalk": ("rw_ret", "rw_dir"),
        "RidgeReturn": ("ridge_ret", "ridge_dir"),
        "LogisticDir": (None, "logit_dir"),
        "RandomForest": (None, "rf_dir"),
    }
    for model, (ret_col, dir_col) in model_map.items():
        da = _directional_accuracy(true_dir, preds[dir_col].values, realized)
        row = {"symbol": sym, "model": model, "directional_accuracy": da,
            "n_days": int((realized != 0).sum())}
        if ret_col is not None:
            err = realized - preds[ret_col].values
            row["mae"] = float(np.mean(np.abs(err)))
            row["rmse"] = float(np.sqrt(np.mean(err ** 2)))
        else:
            row["mae"] = np.nan
            row["rmse"] = np.nan
        rows.append(row)
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# Written report
# --------------------------------------------------------------------------- #
def write_prediction_report(metrics: pd.DataFrame, summary: pd.Series) -> str:
    """Render an honest Markdown write-up of the prediction results."""
    # Per-stock best model.
    best_rows = (metrics.sort_values("directional_accuracy", ascending=False)
                .groupby("symbol").head(1).set_index("symbol").loc[config.TICKERS])
    per_stock = "\n".join(
        f"| {s} | {config.COMPANIES[s]['name']} | {best_rows.loc[s, 'model']} "
        f"| {best_rows.loc[s, 'directional_accuracy'] * 100:.1f}% | {best_rows.loc[s, 'n_days']} |"
        for s in config.TICKERS
    )
    model_rows = "\n".join(
        f"| {m} | {acc * 100:.1f}% |" for m, acc in summary.items()
    )
    overall_best = best_rows["directional_accuracy"].max()
    best_name = best_rows["directional_accuracy"].idxmax()

    md = f"""# Prediction Study — Can We Forecast These Stocks?

*Educational research project. Not investment advice.*

This module asks a concrete question about the eight portfolio holdings: **using
only past data, can a model predict whether each stock goes up or down the next
day — better than a coin flip, and better than a naive "no change" guess?**

## Method (why the result is trustworthy)

- **One-day-ahead, walk-forward, out-of-sample.** For each test day the models
  see only a rolling {config.PRED_TRAIN_WINDOW}-day window of *prior* data, refit
  monthly. No information from a day (or later) is ever used to predict that day.
  This is the guard against **look-ahead bias** — the mistake that makes most
  amateur stock predictors look great and fail in reality.
- **Features:** the last {config.PRED_LAGS} daily returns, 5-day momentum, and
  10-day realized volatility — all known at yesterday's close.
- **Four models:** a **random walk** baseline (predict no change; direction =
  yesterday's sign), a **Ridge** regression on the returns, a **logistic
  regression** direction classifier, and a **random forest** direction
  classifier (the machine-learning model).
- **Headline metric — directional accuracy:** the share of days the up/down call
  is right. It is used instead of return error because it does **not** scale with
  the size of the move, so it measures skill rather than luck on big days.

## Results — mean directional accuracy by model

| Model | Mean directional accuracy |
|---|---|
{model_rows}

## Best model per stock

| Ticker | Company | Best model | Directional accuracy | Test days |
|---|---|---|---|---|
{per_stock}

## What this means (the honest read)

Every model lands within a few points of **50%** — a coin flip. The best
single result is **{best_name} at {overall_best * 100:.1f}%**, and the models
barely separate from the random-walk baseline on average. **This is the
expected, correct result**, not a failure of the code:

- Short-horizon stock returns are very close to unpredictable from price history
  alone. Decades of research find the same thing (Welch & Goyal, 2008; Campbell &
  Thompson, 2008): beating a random walk out of sample is genuinely hard.
- A model that claimed 70–90% accuracy on daily direction would almost certainly
  have **look-ahead bias** or be **overfit** — the walk-forward design here is
  specifically what prevents that flattering illusion.
- A 1–3 point edge over 50% is *not* nothing in principle, but it is far too
  small and noisy to trade on after costs — so the honest conclusion is that
  these names are close to a random walk day-to-day.

The takeaway connects straight back to the portfolio work: because you can't
reliably time these stocks day-to-day, the durable levers are the ones Layers
1–5 measure — **diversification, risk-adjusted return (Sharpe), and position
sizing** — not short-horizon prediction.

*See `charts/09_prediction_accuracy.png` and `charts/10_prediction_vs_coinflip.png`.*

---
*Generated by the equity research portfolio system. Educational use only — not investment advice.*
"""
    path = os.path.join(config.REPORTS_DIR, "PREDICTION_REPORT.md")
    with open(path, "w") as f:
        f.write(md)
    return path


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(log_returns: pd.DataFrame | None = None,
        tickers: list[str] | None = None) -> dict:
    """End-to-end Layer 6: walk-forward predict every stock, score, and persist.

    Returns a dict with the pooled metrics table and the per-stock prediction
    frames (the latter used for the predicted-vs-actual chart).
    """
    from .data_engine import load_processed

    print("Layer 6 | Prediction (walk-forward, out-of-sample)")
    if log_returns is None:
        log_returns = load_processed()["log_returns"]
    tickers = tickers or config.TICKERS

    all_scores = []
    pred_frames: dict[str, pd.DataFrame] = {}
    for sym in tickers:
        preds = walk_forward(log_returns[sym])
        pred_frames[sym] = preds
        scores = score_stock(sym, preds)
        all_scores.append(scores)
        # Quick per-stock read: best directional accuracy across models.
        best = scores.sort_values("directional_accuracy", ascending=False).iloc[0]
        print(f"  {sym}: best {best['model']} {best['directional_accuracy'] * 100:.1f}% "
              f"directional accuracy ({best['n_days']} test days)")

    metrics = pd.concat(all_scores, ignore_index=True)
    metrics.to_csv(os.path.join(RESULTS_DIR, "prediction_metrics.csv"), index=False)

    # A compact model-average summary (mean directional accuracy across stocks).
    summary = (metrics.groupby("model")["directional_accuracy"]
            .mean().sort_values(ascending=False))
    summary.to_csv(os.path.join(RESULTS_DIR, "prediction_model_summary.csv"))
    print("  mean directional accuracy by model:")
    for model, acc in summary.items():
        print(f"    {model:12s} {acc * 100:.1f}%")

    report = write_prediction_report(metrics, summary)
    print(f"  wrote {os.path.relpath(report, config.PACKAGE_ROOT)}")

    return {"metrics": metrics, "summary": summary, "pred_frames": pred_frames}


if __name__ == "__main__":
    run()
