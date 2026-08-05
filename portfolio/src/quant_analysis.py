"""
Layer 2 -- Quantitative analysis module.

Computes the risk-and-return statistics that anchor every research report:

* daily and annualized return,
* annualized volatility (standard deviation of returns),
* Sharpe ratio (excess return per unit of risk),
* beta and alpha versus the market (SPY), via OLS,
* the full cross-sectional correlation matrix,
* rolling volatility and rolling correlation-to-market series,
* downside metrics (max drawdown, historical VaR/CVaR, downside deviation).

All statistics are derived from continuously compounded (log) returns produced
by the data engine. Annualization uses the square-root-of-time rule on
``config.TRADING_DAYS``.
"""
from __future__ import annotations

import os

import numpy as np
import pandas as pd
import statsmodels.api as sm

from . import config


# --------------------------------------------------------------------------- #
# Point statistics
# --------------------------------------------------------------------------- #
def annualized_return(log_ret: pd.Series) -> float:
    """Annualized continuously compounded return."""
    return float(log_ret.mean() * config.TRADING_DAYS)


def annualized_vol(log_ret: pd.Series) -> float:
    """Annualized volatility (std of returns scaled by sqrt of trading days)."""
    return float(log_ret.std(ddof=1) * np.sqrt(config.TRADING_DAYS))


def sharpe_ratio(log_ret: pd.Series,
                rf_annual: float = config.RISK_FREE_ANNUAL) -> float:
    """Annualized Sharpe ratio: excess annual return / annual volatility."""
    vol = annualized_vol(log_ret)
    if vol == 0:
        return float("nan")
    return (annualized_return(log_ret) - rf_annual) / vol


def max_drawdown(log_ret: pd.Series) -> float:
    """Worst peak-to-trough decline of the cumulative return path (negative)."""
    equity = np.exp(log_ret.cumsum())
    running_max = equity.cummax()
    drawdown = equity / running_max - 1.0
    return float(drawdown.min())


def historical_var(log_ret: pd.Series, level: float = 0.05) -> float:
    """One-day historical Value-at-Risk at ``level`` (reported as a negative)."""
    return float(np.quantile(log_ret, level))


def conditional_var(log_ret: pd.Series, level: float = 0.05) -> float:
    """One-day Conditional VaR (Expected Shortfall): mean loss beyond the VaR."""
    var = historical_var(log_ret, level)
    tail = log_ret[log_ret <= var]
    return float(tail.mean()) if len(tail) else var


def downside_deviation(log_ret: pd.Series, mar: float = 0.0) -> float:
    """Annualized downside deviation (volatility of sub-target returns only)."""
    downside = np.minimum(log_ret - mar, 0.0)
    return float(np.sqrt((downside ** 2).mean()) * np.sqrt(config.TRADING_DAYS))


def capm_beta_alpha(asset_ret: pd.Series,
                    market_ret: pd.Series) -> tuple[float, float, float]:
    """OLS of asset returns on market returns.

    Returns ``(beta, annualized_alpha, r_squared)``. Beta is market
    sensitivity; alpha is the annualized intercept (excess of what beta
    explains); R-squared is the share of variance the market explains.
    """
    df = pd.concat([asset_ret, market_ret], axis=1).dropna()
    df.columns = ["asset", "market"]
    X = sm.add_constant(df["market"])
    model = sm.OLS(df["asset"], X).fit()
    beta = float(model.params["market"])
    alpha_annual = float(model.params["const"] * config.TRADING_DAYS)
    return beta, alpha_annual, float(model.rsquared)


# --------------------------------------------------------------------------- #
# Per-asset summary table
# --------------------------------------------------------------------------- #
def compute_metrics_table(log_returns: pd.DataFrame,
                        benchmark: str = config.BENCHMARK) -> pd.DataFrame:
    """Build the master per-asset metrics table.

    One row per symbol (the benchmark included), one column per statistic.
    """
    market = log_returns[benchmark]
    rows = []
    for sym in log_returns.columns:
        r = log_returns[sym]
        beta, alpha, r2 = capm_beta_alpha(r, market)
        rows.append(
            {
                "symbol": sym,
                "ann_return": annualized_return(r),
                "ann_volatility": annualized_vol(r),
                "sharpe": sharpe_ratio(r),
                "beta": beta,
                "alpha_annual": alpha,
                "market_r2": r2,
                "max_drawdown": max_drawdown(r),
                "var_95_daily": historical_var(r, 0.05),
                "cvar_95_daily": conditional_var(r, 0.05),
                "downside_dev": downside_deviation(r),
                "corr_to_market": float(r.corr(market)),
            }
        )
    table = pd.DataFrame(rows).set_index("symbol")
    return table


# --------------------------------------------------------------------------- #
# Correlation & rolling structure
# --------------------------------------------------------------------------- #
def correlation_matrix(log_returns: pd.DataFrame,
                    tickers: list[str] | None = None) -> pd.DataFrame:
    """Full-sample Pearson correlation matrix across the chosen names."""
    cols = tickers or config.TICKERS
    return log_returns[cols].corr()


def rolling_volatility(log_returns: pd.DataFrame,
                    window: int = config.ROLLING_WINDOW,
                    tickers: list[str] | None = None) -> pd.DataFrame:
    """Annualized rolling volatility for each name."""
    cols = tickers or config.TICKERS
    return log_returns[cols].rolling(window).std(ddof=1) * np.sqrt(config.TRADING_DAYS)


def pca_common_factor(log_returns: pd.DataFrame,
                    tickers: list[str] | None = None) -> dict:
    """Principal-component view of shared (systematic) risk across the names.

    Standardizes each name's returns and runs PCA (scikit-learn). The first
    principal component behaves like a common "market/technology factor"; the
    share of variance it explains is a clean read on how much of the book's risk
    is systematic and therefore *not* diversifiable by holding these names
    together. Returns the explained-variance ratios and the PC1 loadings.
    """
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import StandardScaler

    cols = tickers or config.TICKERS
    X = StandardScaler().fit_transform(log_returns[cols].values)
    pca = PCA().fit(X)
    evr = pca.explained_variance_ratio_
    pc1_loadings = pd.Series(pca.components_[0], index=cols, name="PC1_loading")
    return {
        "explained_variance_ratio": evr,
        "pc1_share": float(evr[0]),
        "pc1_loadings": pc1_loadings,
    }


def rolling_corr_to_market(log_returns: pd.DataFrame,
                        window: int = config.ROLLING_WINDOW,
                        benchmark: str = config.BENCHMARK,
                        tickers: list[str] | None = None) -> pd.DataFrame:
    """Rolling correlation of each name to the market benchmark."""
    cols = tickers or config.TICKERS
    market = log_returns[benchmark]
    return pd.DataFrame(
        {sym: log_returns[sym].rolling(window).corr(market) for sym in cols}
    )


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def run(log_returns: pd.DataFrame | None = None) -> dict[str, pd.DataFrame]:
    """End-to-end Layer 2: compute every table and persist to ``results``/``processed``."""
    from .data_engine import load_processed

    print("Layer 2 | Quantitative analysis")
    if log_returns is None:
        log_returns = load_processed()["log_returns"]

    metrics = compute_metrics_table(log_returns)
    corr = correlation_matrix(log_returns)
    roll_vol = rolling_volatility(log_returns)
    roll_corr = rolling_corr_to_market(log_returns)
    pca = pca_common_factor(log_returns)

    metrics.to_csv(os.path.join(config.PROCESSED_DIR, "metrics_table.csv"))
    corr.to_csv(os.path.join(config.PROCESSED_DIR, "correlation_matrix.csv"))
    roll_vol.to_csv(os.path.join(config.PROCESSED_DIR, "rolling_volatility.csv"))
    roll_corr.to_csv(os.path.join(config.PROCESSED_DIR, "rolling_corr_to_market.csv"))
    pca["pc1_loadings"].to_csv(os.path.join(config.PROCESSED_DIR, "pca_pc1_loadings.csv"))

    print(f"  metrics_table: {metrics.shape[0]} assets x {metrics.shape[1]} metrics")
    print(f"  correlation_matrix: {corr.shape[0]}x{corr.shape[1]}")
    print(f"  PCA: PC1 explains {pca['pc1_share'] * 100:.0f}% of return variance")
    print(f"  rolling window: {config.ROLLING_WINDOW} days")

    return {
        "metrics": metrics,
        "correlation": corr,
        "rolling_vol": roll_vol,
        "rolling_corr": roll_corr,
        "pca": pca,
    }


if __name__ == "__main__":
    run()
