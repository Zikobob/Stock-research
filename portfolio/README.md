# Equity Research Portfolio System

A college-level, institutional-style equity research desk in miniature. It
collects free public market data, computes the risk-and-return statistics a
buy-side analyst actually uses, renders a publication-quality chart deck,
writes a structured research note for every holding, and rolls the names up
into a portfolio-level view.

> **Educational research project. Nothing here is investment advice.** Past
> performance and historical statistics do not guarantee future results.

**Universe (8 large caps across 4 GICS sectors) + SPY benchmark:**
AAPL · MSFT · NVDA (Information Technology) · AMZN · TSLA (Consumer
Discretionary) · GOOGL · META (Communication Services) · JPM (Financials).

---

## What it produces

| Output | Location |
|---|---|
| Per-stock price/volume/adj-close CSVs | `data/raw/<TICKER>.csv` |
| Master aligned price / volume / log-return matrices | `data/processed/master_*.csv` |
| Metric tables (returns, vol, Sharpe, beta, correlation, rolling) | `data/processed/*.csv` |
| Eight publication-quality charts (PNG) | `charts/` |
| A structured research note per company | `reports/<TICKER>_report.md` |
| Company index / leaderboard | `reports/INDEX.md` |
| Portfolio-level summary | `reports/PORTFOLIO_SUMMARY.md` |
| Interactive walk-through | `notebooks/equity_research.ipynb` |

## Quick start

```bash
pip install -r requirements.txt          # from the repo root
python -m portfolio.src.main             # full pipeline (downloads ~5y of daily data once)
python -m portfolio.src.main --offline   # reuse cached data/processed CSVs
```

Or explore interactively:

```bash
jupyter notebook portfolio/notebooks/equity_research.ipynb
```

Each layer is also runnable on its own:

```bash
python -m portfolio.src.data_engine       # Layer 1
python -m portfolio.src.quant_analysis    # Layer 2
python -m portfolio.src.visualization     # Layer 3
python -m portfolio.src.report_generator  # Layer 4
python -m portfolio.src.portfolio_summary # Layer 5
```

## Architecture — five layers

```
portfolio/
├── src/
│   ├── config.py            # every tunable parameter + company metadata
│   ├── data_engine.py       # (1) fetch, clean, align, log returns  -> CSVs
│   ├── quant_analysis.py    # (2) returns, vol, Sharpe, beta, corr, rolling
│   ├── visualization.py     # (3) eight consistent PNG charts
│   ├── report_generator.py  # (4) per-stock research notes + index
│   ├── portfolio_summary.py # (5) weighted return, diversification, sector risk
│   └── main.py              # orchestrates all five layers
├── notebooks/
│   ├── equity_research.ipynb   # narrative walk-through (executed)
│   └── build_notebook.py       # regenerates the notebook
├── data/{raw,processed}/    # datasets
├── charts/                  # PNG deck
└── reports/                 # Markdown research notes + summaries
```

### 1. Data engine
Daily OHLCV and adjusted close from free public Yahoo Finance data. Series are
forward-filled for isolated gaps, aligned onto a common trading calendar, and
converted to continuously compounded (log) returns. Two fetch backends are
provided — the `yfinance` library and a dependency-light `requests` client
against Yahoo's public v8 chart API (with retry/backoff) — so the download is
robust to either being unavailable.

### 2. Quantitative analysis
Per asset: annualized return and volatility, Sharpe ratio, CAPM beta/alpha and
R² vs SPY (OLS), correlation to market, max drawdown, historical VaR/CVaR, and
downside deviation. Plus the full correlation matrix and 60-day **rolling**
volatility and **rolling** correlation-to-market series.

### 3. Visualization
One house style across the deck (stable per-name colours, consistent DPI/labels):
normalized prices (growth of $1), return comparison, correlation heatmap,
rolling volatility, risk-vs-return scatter, portfolio allocation (by name and by
sector), drawdown curves, and rolling correlation to the market.

### 4. Research reports
Each note has four sections — **A. Company overview**, **B. Quantitative
performance**, **C. Risk analysis**, **D. Investment thesis** (bullish case,
bearish case, and a rules-based Buy/Hold/Avoid *tilt*). The bull/bear points and
the tilt are generated mechanically from the computed statistics, so every
sentence traces back to a number.

### 5. Portfolio summary
Weighted return and volatility computed from the full **covariance matrix** (so
cross-asset diversification is captured, not just a weighted average of
standalone vols), plus the diversification ratio, average pairwise correlation,
Herfindahl concentration / effective number of holdings, sector-exposure
breakdown, portfolio beta/alpha, and a correlation-risk discussion.

## Configuration

Everything tunable lives in [`src/config.py`](src/config.py): the universe and
its company metadata, the benchmark, the history window (`5y`), the rolling
window (60 days), the assumed risk-free rate (4%), the portfolio weights
(default equal-weight), and the Sharpe thresholds for the recommendation engine.
Change a value there and re-run `python -m portfolio.src.main --offline`.

## Methodology notes

- **Log returns** are used throughout — additive across time and closer to
  normal than simple returns.
- **Square-root-of-time** annualization on 252 trading days.
- **Portfolio volatility** uses the covariance matrix (`√(wᵀΣw)`), not a naïve
  weighted average, so the reported diversification benefit is real.
- **Beta/alpha** come from an OLS regression of asset returns on market returns.
- The **recommendation is rules-based** (a transparent Sharpe screen), not a
  fundamental valuation and not advice.

## Dependencies

`pandas`, `numpy`, `matplotlib`, `seaborn`, `yfinance`, `statsmodels`,
`scikit-learn`, `scipy`, plus `jupyter`/`nbformat` for the notebook. See the
repository-root [`requirements.txt`](../requirements.txt).

## Disclaimer

This is an educational research project. Nothing here is investment advice, a
recommendation, or a solicitation. Do your own research.
