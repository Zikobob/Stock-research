"""
Step 4 - Predictive modeling framework.

All models produce one-step-ahead forecasts in a walk-forward fashion: for each
day t in the evaluation window, the model is fit only on data available up to
t-1 (a trailing rolling window) and then predicts the return / price at t. This
avoids look-ahead bias and yields a full out-of-sample prediction series that
can be tagged by correlation regime.

Models
------
Model A - Naive random walk:
    P_{t+1} = P_t  (i.e. predicted return = 0). For directional accuracy we use
    the sign of the most recent return (a momentum-style naive direction).

Model B - Linear regression / AR(1):
    r_t regressed on its own lagged returns (lags 1..N_LAGS). With N_LAGS=1
    this is exactly an AR(1) model.

Extensions - Ridge and Lasso regression:
    Same lagged-return design matrix with L2 / L1 regularization.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge, Lasso

from . import config


def _build_lag_matrix(returns: pd.Series, n_lags: int) -> tuple[np.ndarray, np.ndarray, pd.Index]:
    """Construct (X, y, index) where X holds lagged returns and y the target.

    Row t uses returns[t-1 .. t-n_lags] to predict returns[t].
    """
    r = returns.values
    idx = returns.index
    X, y, target_idx = [], [], []
    for t in range(n_lags, len(r)):
        X.append(r[t - n_lags:t][::-1])  # lag1, lag2, ... lagN
        y.append(r[t])
        target_idx.append(idx[t])
    return np.array(X), np.array(y), pd.Index(target_idx)


def _walk_forward_regression(
    returns: pd.Series,
    prices: pd.Series,
    estimator_factory,
    n_lags: int,
    fit_window: int,
) -> pd.DataFrame:
    """Generic walk-forward one-step-ahead forecaster for a regression model.

    `estimator_factory` is a zero-arg callable returning a fresh sklearn
    estimator (so each refit starts clean).

    Returns a DataFrame indexed by prediction date with columns:
        actual_return, pred_return, actual_price, pred_price,
        actual_dir, pred_dir
    """
    X, y, target_idx = _build_lag_matrix(returns, n_lags)

    rows = []
    # Need `fit_window` samples before the first forecast.
    for i in range(fit_window, len(y)):
        X_train = X[i - fit_window:i]
        y_train = y[i - fit_window:i]

        model = estimator_factory()
        model.fit(X_train, y_train)

        x_pred = X[i].reshape(1, -1)
        pred_return = float(model.predict(x_pred)[0])

        date = target_idx[i]
        actual_return = y[i]
        # Price on the previous trading day -> base for the price forecast.
        prev_price = prices.loc[:date].iloc[-2]
        actual_price = prices.loc[date]
        pred_price = prev_price * np.exp(pred_return)

        rows.append({
            "date": date,
            "actual_return": actual_return,
            "pred_return": pred_return,
            "actual_price": actual_price,
            "pred_price": pred_price,
            "actual_dir": np.sign(actual_return),
            "pred_dir": np.sign(pred_return),
        })

    out = pd.DataFrame(rows).set_index("date")
    return out


def naive_random_walk(
    returns: pd.Series,
    prices: pd.Series,
    n_lags: int,
    fit_window: int,
) -> pd.DataFrame:
    """Random-walk forecast: predicted return = 0, so P_hat_{t} = P_{t-1}.

    Aligned to the same evaluation index as the regression models (same lags
    and fit window are skipped) so all models are compared on identical dates.
    Directional forecast uses the sign of the previous day's return.
    """
    X, y, target_idx = _build_lag_matrix(returns, n_lags)

    rows = []
    for i in range(fit_window, len(y)):
        date = target_idx[i]
        actual_return = y[i]
        prev_price = prices.loc[:date].iloc[-2]
        actual_price = prices.loc[date]

        pred_return = 0.0
        pred_price = prev_price  # exp(0) = 1
        # Naive direction = previous day's return sign.
        prev_return = X[i][0]  # lag-1 return

        rows.append({
            "date": date,
            "actual_return": actual_return,
            "pred_return": pred_return,
            "actual_price": actual_price,
            "pred_price": pred_price,
            "actual_dir": np.sign(actual_return),
            "pred_dir": np.sign(prev_return),
        })

    return pd.DataFrame(rows).set_index("date")


def forecast_all_models(
    returns: pd.Series,
    prices: pd.Series,
    n_lags: int | None = None,
    fit_window: int | None = None,
) -> dict[str, pd.DataFrame]:
    """Run every model for a single asset and return a dict of forecast frames."""
    n_lags = n_lags or config.N_LAGS
    fit_window = fit_window or config.FIT_WINDOW

    models = {
        "RandomWalk": naive_random_walk(returns, prices, n_lags, fit_window),
        "LinearRegression": _walk_forward_regression(
            returns, prices, lambda: LinearRegression(), n_lags, fit_window
        ),
        "Ridge": _walk_forward_regression(
            returns, prices,
            lambda: Ridge(alpha=config.RIDGE_ALPHA), n_lags, fit_window
        ),
        "Lasso": _walk_forward_regression(
            returns, prices,
            lambda: Lasso(alpha=config.LASSO_ALPHA, max_iter=10000),
            n_lags, fit_window
        ),
    }
    # AR(1): linear regression restricted to a single lag.
    models["AR1"] = _walk_forward_regression(
        returns, prices, lambda: LinearRegression(), 1, fit_window
    )
    return models


def forecast_universe(
    returns: pd.DataFrame,
    prices: pd.DataFrame,
    tickers: list[str] | None = None,
) -> dict[str, dict[str, pd.DataFrame]]:
    """Run all models for every ticker.

    Returns nested dict: {ticker: {model_name: forecast_frame}}.
    """
    tickers = tickers or config.ALL_TICKERS
    results: dict[str, dict[str, pd.DataFrame]] = {}
    for tk in tickers:
        print(f"[models] Forecasting {tk} ...")
        results[tk] = forecast_all_models(returns[tk], prices[tk])
    return results
