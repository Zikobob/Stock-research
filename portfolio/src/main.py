"""
Pipeline orchestrator for the equity research portfolio system.

Runs all five layers end to end and regenerates every dataset, chart, report,
and summary document:

    Layer 1  Data engine         -> data/raw, data/processed
    Layer 2  Quant analysis      -> data/processed metric tables
    Layer 3  Visualization       -> charts/*.png
    Layer 4  Research reports     -> reports/<TICKER>_report.md, reports/INDEX.md
    Layer 5  Portfolio summary    -> reports/PORTFOLIO_SUMMARY.md

Usage:
    python -m portfolio.src.main              # full run (downloads fresh data)
    python -m portfolio.src.main --offline    # reuse cached data/processed CSVs
"""
from __future__ import annotations

import argparse
import sys

from . import config
from . import data_engine
from . import quant_analysis
from . import visualization
from . import report_generator
from . import portfolio_summary


def run(offline: bool = False) -> None:
    print("=" * 70)
    print("EQUITY RESEARCH PORTFOLIO SYSTEM")
    print(f"Universe: {', '.join(config.TICKERS)}  |  Benchmark: {config.BENCHMARK}")
    print("=" * 70)

    # Layer 1 -- data
    if offline:
        print("Layer 1 | Data engine (offline: loading cached processed data)")
        datasets = data_engine.load_processed()
    else:
        datasets = data_engine.run()

    # Layer 2 -- analytics
    analysis = quant_analysis.run(datasets["log_returns"])

    # Layer 3 -- charts
    visualization.run(datasets, analysis)

    # Layer 4 -- per-stock reports
    report_generator.run(analysis)

    # Layer 5 -- portfolio summary
    portfolio_summary.run(datasets, analysis)

    print("=" * 70)
    print("Done. Outputs in: data/, charts/, reports/")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Equity research portfolio pipeline")
    parser.add_argument("--offline", action="store_true",
                        help="reuse cached data/processed CSVs instead of downloading")
    args = parser.parse_args()
    try:
        run(offline=args.offline)
    except Exception as exc:  # surface a clean message for the CLI user
        print(f"\nPipeline failed: {exc}", file=sys.stderr)
        raise
