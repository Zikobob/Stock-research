# Equity Research Portfolio System

A Python project that studies eight large-cap stocks the way a research analyst
would. It downloads their price history, measures how much each one returned and
how much risk it carried, draws the charts, writes a short research note on every
company, combines them into a portfolio view, and then tries to predict each
stock's next-day move to see whether that is even possible.

> Educational project. None of this is investment advice, and past performance
> does not predict future results.

The universe is eight companies across four sectors, benchmarked against SPY:
Apple, Microsoft, and Nvidia (technology); Amazon and Tesla (consumer
discretionary); Alphabet and Meta (communication services); and JPMorgan
(financials).

## What it produces

| Output | Location |
|---|---|
| Price/volume/adjusted-close CSV for each stock | `data/raw/<TICKER>.csv` |
| Aligned master price, volume, and log-return tables | `data/processed/master_*.csv` |
| Metric tables: returns, volatility, Sharpe, beta, correlation, rolling stats | `data/processed/*.csv` |
| Ten charts (PNG) | `charts/` |
| A research note for each company | `reports/<TICKER>_report.md` |
| Company index and leaderboard | `reports/INDEX.md` |
| Portfolio-level summary | `reports/PORTFOLIO_SUMMARY.md` |
| Prediction study | `reports/PREDICTION_REPORT.md` |
| Notebook walk-through | `notebooks/equity_research.ipynb` |

## Quick start

```bash
pip install -r requirements.txt          # from the repo root
python -m portfolio.src.main             # full run (downloads ~5y of daily data once)
python -m portfolio.src.main --offline   # reuse the cached CSVs instead of downloading
```

To step through it interactively:

```bash
jupyter notebook portfolio/notebooks/equity_research.ipynb
```

Any single layer also runs on its own, for example
`python -m portfolio.src.quant_analysis`.

## How it is organized

```
portfolio/
├── src/
│   ├── config.py            # every setting, plus the company descriptions
│   ├── data_engine.py       # (1) fetch, clean, align, log returns  -> CSVs
│   ├── quant_analysis.py    # (2) returns, volatility, Sharpe, beta, correlation, rolling
│   ├── visualization.py     # (3) the chart deck
│   ├── report_generator.py  # (4) per-stock research notes and index
│   ├── portfolio_summary.py # (5) weighted return, diversification, sector risk
│   ├── prediction.py        # (6) walk-forward next-day forecasting and scoring
│   └── main.py              # runs all six layers in order
├── notebooks/
│   ├── equity_research.ipynb   # narrative walk-through (already executed)
│   └── build_notebook.py       # regenerates the notebook
├── data/{raw,processed}/    # datasets
├── charts/                  # PNG charts
└── reports/                 # research notes and summaries
```

### 1. Data engine
Pulls daily open/high/low/close, volume, and adjusted close from free Yahoo
Finance data. It fills isolated gaps, lines every stock up on the same trading
calendar, and converts prices to log returns. There are two ways to fetch the
data: the `yfinance` library, and a small `requests` client that talks to
Yahoo's public chart API directly (with retry and backoff). If one is blocked,
the other still works.

### 2. Quantitative analysis
For each stock it computes annualized return and volatility, the Sharpe ratio,
beta and alpha against SPY from an OLS regression, R-squared, correlation to the
market, maximum drawdown, historical VaR and CVaR, and downside deviation. It
also builds the full correlation matrix and 60-day rolling volatility and
rolling correlation-to-market series.

### 3. Visualization
Ten charts that share one visual style, so a given stock keeps the same color
everywhere: normalized prices (growth of one dollar), a return comparison, the
correlation heatmap, rolling volatility, a risk-versus-return scatter, portfolio
allocation by name and by sector, drawdown curves, rolling correlation to the
market, and the two prediction charts.

### 4. Research reports
Every note has four sections: company overview, quantitative performance, risk
analysis, and an investment thesis with a bullish case, a bearish case, and a
rules-based Buy, Hold, or Avoid tilt. The bull and bear points and the tilt come
straight from the computed numbers, so each claim traces back to a statistic.

### 5. Portfolio summary
Portfolio return and volatility come from the full covariance matrix, not a
weighted average of the individual volatilities, so the diversification benefit
is measured properly. The summary also reports the diversification ratio, the
average pairwise correlation, a concentration measure (the Herfindahl index and
the effective number of holdings), the sector breakdown, portfolio beta and
alpha, and a short discussion of correlation risk.

### 6. Prediction
This is where the project goes from describing the stocks to forecasting them.
For each name it builds one-day-ahead models trained only on prior data: a
random-walk baseline, a Ridge regression on the returns, and logistic-regression
and random-forest classifiers for direction (all from scikit-learn). The
features are lagged returns, momentum, and recent volatility. The main score is
directional accuracy, the share of days the up-or-down call is right, which does
not get easier just because a move is large.

The result is honest. Accuracy lands near 50%, with the best stock around 53%,
barely ahead of the random walk. That is the expected outcome for efficient
short-horizon markets, and the walk-forward design is what keeps the number
real: it blocks the look-ahead bias that makes naive predictors look far better
than they are. Full write-up in
[`reports/PREDICTION_REPORT.md`](reports/PREDICTION_REPORT.md).

## Configuration

Every setting lives in [`src/config.py`](src/config.py): the list of companies
and their descriptions, the benchmark, the history window (5 years), the rolling
window (60 days), the assumed risk-free rate (4%), the portfolio weights (equal
by default), and the Sharpe thresholds behind the Buy/Hold/Avoid tilt. Change a
value and re-run `python -m portfolio.src.main --offline`.

## Methodology notes

- Log returns are used throughout, because they add across time and sit closer to
  a normal distribution than simple returns.
- Annualization uses the square-root-of-time rule on 252 trading days.
- Portfolio volatility uses the covariance matrix, `sqrt(wᵀΣw)`, so the
  diversification benefit it reports is real rather than assumed.
- Beta and alpha come from an OLS regression of each stock's returns on the
  market's.
- The Buy/Hold/Avoid tilt is a transparent rule on the Sharpe ratio. It is not a
  valuation, and it is not advice.

## Dependencies

pandas, numpy, matplotlib, seaborn, yfinance, statsmodels, scikit-learn, and
scipy, plus jupyter and nbformat for the notebook. The full list is in the
repository-root [`requirements.txt`](../requirements.txt).

## Disclaimer

This is an educational project. Nothing here is investment advice, a
recommendation, or a solicitation. Do your own research.
