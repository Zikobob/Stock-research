"""
End-to-end pipeline runner.

Executes every stage of the study in order and writes all datasets, figures,
and result tables to disk:

    python -m src.main

Stages:
  1. Data collection      -> data/raw/
  2. Data processing      -> data/processed/
  3. Correlation analysis -> data/processed/, results/
  4. Forecasting          -> (in memory)
  5. Evaluation           -> results/
  6. Statistical testing  -> results/
  7. Visualization        -> figures/
  8. Summary statistics   -> results/
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

from . import (
    config,
    data_collection,
    data_processing,
    correlation_analysis,
    models,
    evaluation,
    statistical_tests,
    visualization,
)


def summary_statistics(returns: pd.DataFrame) -> pd.DataFrame:
    """Descriptive statistics of daily returns (annualized where relevant)."""
    desc = pd.DataFrame({
        "mean_daily": returns.mean(),
        "std_daily": returns.std(),
        "annual_return": returns.mean() * 252,
        "annual_volatility": returns.std() * np.sqrt(252),
        "sharpe_naive": (returns.mean() * 252) / (returns.std() * np.sqrt(252)),
        "skew": returns.skew(),
        "kurtosis": returns.kurtosis(),
        "min": returns.min(),
        "max": returns.max(),
    })
    return desc


def main() -> None:
    np.random.seed(config.RANDOM_SEED)
    config.ensure_dirs()

    print("=" * 70)
    print("CROSS-SECTOR CORRELATION REGIMES & FORECASTING ACCURACY")
    print("=" * 70)

    # 1. Data collection
    raw = data_collection.run()

    # 2. Processing
    prices, returns = data_processing.run(raw)

    # 8a. Summary statistics (saved early; depends only on returns)
    desc = summary_statistics(returns)
    desc_path = os.path.join(config.RESULTS_DIR, "summary_statistics.csv")
    desc.to_csv(desc_path)
    print(f"[summary] Saved descriptive statistics -> {desc_path}")

    # 3. Correlation / regime analysis
    corr = correlation_analysis.run(returns)
    regimes = corr["regimes"]

    # 4. Forecasting
    universe_forecasts = models.forecast_universe(returns, prices)

    # 5. Evaluation
    eval_out = evaluation.run(universe_forecasts, regimes)

    # 6. Statistical testing
    statistical_tests.run(eval_out["pooled"])

    # 7. Visualization
    visualization.run(
        returns=returns,
        regimes=regimes,
        pca_static=corr["pca_static"],
        pca_rolling=corr["pca_rolling"],
        universe_forecasts=universe_forecasts,
        pooled=eval_out["pooled"],
        summary=eval_out["summary"],
    )

    print("=" * 70)
    print("PIPELINE COMPLETE. Outputs in data/, results/, and figures/.")
    print("=" * 70)


if __name__ == "__main__":
    main()
