"""
Build a single self-contained HTML page for the equity research portfolio.

Reads the processed data and the computed metrics, embeds every chart inline as
a base64 data URI, and writes one standalone file that opens anywhere with no
server and no external assets. Regenerate with:

    python portfolio/build_report_site.py
"""
from __future__ import annotations

import base64
import os
import sys

import pandas as pd

# Allow running as a plain script (python portfolio/build_report_site.py) as well
# as a module (python -m portfolio.build_report_site).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from portfolio.src import config
from portfolio.src import quant_analysis as qa
from portfolio.src import report_generator as rg
from portfolio.src import portfolio_summary as ps
from portfolio.src.data_engine import load_processed

OUT_DIR = os.path.join(config.PACKAGE_ROOT, "site")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "portfolio_report.html")


def chart_uri(filename: str) -> str:
    """Return a base64 data URI for a chart PNG."""
    path = os.path.join(config.CHARTS_DIR, filename)
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def pct(x: float, dp: int = 1) -> str:
    return f"{x * 100:.{dp}f}%"


def signed_pct(x: float, dp: int = 1) -> str:
    return f"{x * 100:+.{dp}f}%"


# --------------------------------------------------------------------------- #
# Gather data
# --------------------------------------------------------------------------- #
def gather() -> dict:
    data = load_processed()
    lr = data["log_returns"]
    metrics = qa.compute_metrics_table(lr)
    corr = qa.correlation_matrix(lr)
    pca = qa.pca_common_factor(lr)
    stats = ps.portfolio_statistics(lr)
    sectors = ps.sector_exposure()
    bench = ps._vs_benchmark(stats, lr)

    pred_path = os.path.join(config.PROCESSED_DIR, "prediction_metrics.csv")
    pred = pd.read_csv(pred_path) if os.path.exists(pred_path) else None

    return {
        "metrics": metrics, "corr": corr, "pca": pca, "stats": stats,
        "sectors": sectors, "bench": bench, "pred": pred,
        "window": (lr.index.min().date(), lr.index.max().date()),
    }


# --------------------------------------------------------------------------- #
# HTML fragments
# --------------------------------------------------------------------------- #
def kpi_tiles(stats: dict, bench: dict) -> str:
    excess = stats["ann_return"] - bench["bench_ann_return"]
    tiles = [
        ("Annualized return", pct(stats["ann_return"]),
        f"SPY {pct(bench['bench_ann_return'])}", "gain" if excess >= 0 else "loss",
        f"{signed_pct(excess)} vs benchmark"),
        ("Volatility", pct(stats["ann_volatility"]),
        f"SPY {pct(bench['bench_ann_vol'])}", "neutral", "annualized risk"),
        ("Sharpe ratio", f"{stats['sharpe']:.2f}",
        f"SPY {bench['bench_sharpe']:.2f}",
        "gain" if stats["sharpe"] >= bench["bench_sharpe"] else "loss",
        "return per unit of risk"),
        ("Beta vs SPY", f"{stats['beta']:.2f}", "market = 1.00", "neutral",
        "market sensitivity"),
        ("Max drawdown", pct(stats["max_drawdown"]),
        f"SPY {pct(bench['bench_max_dd'])}", "loss", "worst peak-to-trough"),
        ("Diversification ratio", f"{stats['diversification_ratio']:.2f}",
        f"avg corr {stats['avg_pairwise_corr']:.2f}", "gain",
        "risk cut by spreading out"),
    ]
    cells = []
    for label, value, sub, tone, note in tiles:
        cells.append(f"""<div class="tile">
      <div class="tile-label">{label}</div>
      <div class="tile-value {tone}">{value}</div>
      <div class="tile-sub">{sub}</div>
      <div class="tile-note">{note}</div>
    </div>""")
    return '<div class="tiles">' + "\n".join(cells) + "</div>"


def holdings_table(metrics: pd.DataFrame, weights: dict, pred: pd.DataFrame | None) -> str:
    best = {}
    if pred is not None:
        top = (pred.sort_values("directional_accuracy", ascending=False)
            .groupby("symbol").head(1).set_index("symbol"))
        best = {s: (top.loc[s, "model"], top.loc[s, "directional_accuracy"]) for s in top.index}

    rows = []
    for sym in config.TICKERS:
        r = metrics.loc[sym]
        label, _ = rg._recommendation(r)
        pill = {"BUY-tilt": "buy", "HOLD": "hold", "AVOID-tilt": "avoid"}[label]
        ret_tone = "gain" if r["ann_return"] >= 0 else "loss"
        pred_txt = f"{pct(best[sym][1])}" if sym in best else "—"
        rows.append(f"""<tr>
      <td class="mono strong">{sym}</td>
      <td>{config.COMPANIES[sym]['name']}</td>
      <td class="muted">{config.COMPANIES[sym]['sector']}</td>
      <td class="mono num">{pct(weights[sym])}</td>
      <td class="mono num {ret_tone}">{pct(r['ann_return'])}</td>
      <td class="mono num">{pct(r['ann_volatility'])}</td>
      <td class="mono num">{r['sharpe']:.2f}</td>
      <td class="mono num">{r['beta']:.2f}</td>
      <td class="mono num">{pred_txt}</td>
      <td><span class="pill {pill}">{label.replace('-tilt','')}</span></td>
    </tr>""")
    return f"""<div class="table-wrap"><table>
    <thead><tr>
      <th>Ticker</th><th>Company</th><th>Sector</th><th class="num">Weight</th>
      <th class="num">Return</th><th class="num">Vol</th><th class="num">Sharpe</th>
      <th class="num">Beta</th><th class="num">Next-day acc.</th><th>Tilt</th>
    </tr></thead>
    <tbody>{''.join(rows)}</tbody>
    </table></div>"""


def stock_cards(metrics: pd.DataFrame, pred: pd.DataFrame | None) -> str:
    market_mean = metrics.loc[config.BENCHMARK, "ann_return"]
    market_vol = metrics.loc[config.BENCHMARK, "ann_volatility"]
    best = {}
    if pred is not None:
        top = (pred.sort_values("directional_accuracy", ascending=False)
            .groupby("symbol").head(1).set_index("symbol"))
        best = {s: (top.loc[s, "model"], top.loc[s, "directional_accuracy"]) for s in top.index}

    cards = []
    for sym in config.TICKERS:
        r = metrics.loc[sym]
        info = config.COMPANIES[sym]
        label, rationale = rg._recommendation(r)
        pill = {"BUY-tilt": "buy", "HOLD": "hold", "AVOID-tilt": "avoid"}[label]
        bull = rg._bull_points(sym, r, market_mean)
        bear = rg._bear_points(sym, r, market_vol)
        bull_html = "".join(f"<li>{p}</li>" for p in bull)
        bear_html = "".join(f"<li>{p}</li>" for p in bear)
        pred_line = (f"Best next-day model: {best[sym][0]} at {pct(best[sym][1])} "
                    f"directional accuracy." if sym in best else "")
        cards.append(f"""<details class="card">
      <summary>
        <span class="card-ticker mono">{sym}</span>
        <span class="card-name">{info['name']}</span>
        <span class="card-metrics mono">{pct(r['ann_return'])} · Sharpe {r['sharpe']:.2f} · β {r['beta']:.2f}</span>
        <span class="pill {pill}">{label.replace('-tilt','')}</span>
      </summary>
      <div class="card-body">
        <p class="overview"><strong>{info['sector']} · {info['industry']}.</strong>
        {info['business']} {info['position']}</p>
        <div class="metric-grid">
          <div><span>Return</span><b class="{'gain' if r['ann_return']>=0 else 'loss'}">{pct(r['ann_return'])}</b></div>
          <div><span>Volatility</span><b>{pct(r['ann_volatility'])}</b></div>
          <div><span>Sharpe</span><b>{r['sharpe']:.2f}</b></div>
          <div><span>Beta</span><b>{r['beta']:.2f}</b></div>
          <div><span>Alpha</span><b>{signed_pct(r['alpha_annual'])}</b></div>
          <div><span>Max drawdown</span><b class="loss">{pct(r['max_drawdown'])}</b></div>
        </div>
        <div class="thesis">
          <div class="bull"><h4>Bullish</h4><ul>{bull_html}</ul></div>
          <div class="bear"><h4>Bearish</h4><ul>{bear_html}</ul></div>
        </div>
        <p class="rec">Tilt: <span class="pill {pill}">{label.replace('-tilt','')}</span> {rationale}
        {pred_line}</p>
      </div>
    </details>""")
    return "\n".join(cards)


def figure(uri: str, title: str, caption: str) -> str:
    return f"""<figure class="fig">
    <div class="plate"><img src="{uri}" alt="{title}" loading="lazy"></div>
    <figcaption><b>{title}.</b> {caption}</figcaption>
  </figure>"""


# --------------------------------------------------------------------------- #
# Page assembly
# --------------------------------------------------------------------------- #
def build() -> str:
    d = gather()
    m, stats, bench, pca = d["metrics"], d["stats"], d["bench"], d["pca"]
    w = stats["weights"]
    start, end = d["window"]

    figs = [
        figure(chart_uri("01_normalized_prices.png"), "Growth of $1",
            "Each stock and the benchmark rebased to $1 at the start, so the lines compare total growth, not share price."),
        figure(chart_uri("05_risk_return_scatter.png"), "Risk versus return",
            "Volatility on the horizontal axis, return on the vertical. Higher and to the left is better; marker size scales with the Sharpe ratio."),
        figure(chart_uri("03_correlation_heatmap.png"), "Correlation",
            "How closely each pair of stocks moves together. JPMorgan is the odd one out, which makes it the book's main diversifier."),
        figure(chart_uri("06_portfolio_allocation.png"), "Allocation",
            "The equal weights by company, and the same weights added up by sector. The book leans toward technology."),
        figure(chart_uri("04_rolling_volatility.png"), "Rolling volatility",
            "A 60-day moving estimate of each stock's risk, so you can see it rise and fall through time rather than as one average."),
        figure(chart_uri("07_drawdowns.png"), "Drawdowns",
            "How far each stock sat below its own previous peak. The deep troughs show how much you would have had to stomach to hold on."),
        figure(chart_uri("09_prediction_accuracy.png"), "Prediction accuracy",
            "Next-day up-or-down hit rate for every model and stock. Green is above a coin flip, red below. Almost everything hugs 50%."),
        figure(chart_uri("10_prediction_vs_coinflip.png"), "Edge over a coin flip",
            "The best model's accuracy for each stock, shown as points above 50%. The best case is only about three points."),
    ]

    excess = stats["ann_return"] - bench["bench_ann_return"]

    body = f"""<title>Model Equity Book</title>
<div class="page">

  <header class="masthead">
    <div class="mast-top">
      <div class="wordmark">Equity Research <span>· Model Portfolio</span></div>
      <button id="theme" class="theme-btn" type="button" aria-label="Toggle theme">◐</button>
    </div>
    <h1>An eight-stock book, analyzed and back-tested for prediction</h1>
    <p class="dek">Five years of daily data ({start} to {end}) for eight large-cap
    companies, benchmarked against the S&amp;P 500. The pages below measure what the
    portfolio earned, what it risked, how the holdings move together, and whether
    their next-day moves can be predicted at all.</p>
    <p class="disclaimer">Educational project. Not investment advice. Past
    performance does not predict future results.</p>
  </header>

  <section>
    <h2>How the book did</h2>
    <p class="lead">The portfolio returned {pct(stats['ann_return'])} a year against
    the benchmark's {pct(bench['bench_ann_return'])}, or {signed_pct(excess)} more,
    but it did so by carrying more risk: a beta of {stats['beta']:.2f} and a
    {pct(stats['ann_volatility'])} volatility against SPY's {pct(bench['bench_ann_vol'])}.
    Spreading money across eight names that do not move in lockstep cut the risk
    from a weighted-average {pct(stats['wavg_standalone_vol'])} down to the
    {pct(stats['ann_volatility'])} above.</p>
    {kpi_tiles(stats, bench)}
  </section>

  <section>
    <h2>Holdings</h2>
    <p>Equal weight across the eight companies. Return, volatility, Sharpe, and
    beta come from the five-year daily history. The last column is the best
    next-day directional accuracy any model reached for that stock.</p>
    {holdings_table(m, w, d['pred'])}
  </section>

  <section>
    <h2>The charts</h2>
    <div class="fig-grid">
      {''.join(figs)}
    </div>
  </section>

  <section>
    <h2>Company notes</h2>
    <p>Open a card for the business description, the key numbers, and a bullish
    and bearish case. The Buy, Hold, or Avoid tilt is a plain rule on the Sharpe
    ratio, not a valuation and not advice.</p>
    <div class="cards">
      {stock_cards(m, d['pred'])}
    </div>
  </section>

  <section class="pred-note">
    <h2>Can these stocks be predicted?</h2>
    <p>Short answer: barely. For each stock the project trains models on past data
    only and asks them to call the next day up or down. Across all of them the
    accuracy sits near 50%, and the best result is about 53%. That is what you
    should expect from an efficient market, and the strict train-only-on-the-past
    setup is what keeps the number honest instead of flattering.</p>
    <p>A single factor explains {pct(pca['pc1_share'], 0)} of the day-to-day
    movement across the eight names, which is another way of seeing why they are
    hard to diversify and hard to time separately: much of what moves one moves
    all of them.</p>
  </section>

  <footer>
    <h2>Method, in brief</h2>
    <ul class="method">
      <li>Prices are daily adjusted close from free public Yahoo Finance data,
      converted to log returns.</li>
      <li>Returns and volatility are annualized on 252 trading days; the Sharpe
      ratio assumes a {pct(config.RISK_FREE_ANNUAL, 0)} risk-free rate.</li>
      <li>Portfolio volatility uses the full covariance matrix, so the
      diversification benefit is measured rather than assumed.</li>
      <li>Beta and alpha come from an OLS regression against SPY.</li>
      <li>Predictions are one day ahead and walk-forward: every forecast uses
      only data from before the day it predicts.</li>
    </ul>
    <p class="disclaimer">Educational project. Nothing here is investment advice,
    a recommendation, or a solicitation.</p>
  </footer>
</div>

<script>
  (function () {{
    var btn = document.getElementById('theme');
    if (!btn) return;
    btn.addEventListener('click', function () {{
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark'
        || (root.getAttribute('data-theme') !== 'light'
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
    }});
  }})();
</script>
"""
    return STYLE + body


# --------------------------------------------------------------------------- #
# Styles
# --------------------------------------------------------------------------- #
STYLE = """<style>
:root{
  --bg:#eceef1; --surface:#ffffff; --surface-2:#f5f6f8; --ink:#191e25;
  --muted:#5b636e; --line:#dbdfe5; --accent:#8f6410; --accent-2:#b6842a;
  --gain:#137a4e; --loss:#bb3f2c;
  --mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,Helvetica,Arial,sans-serif;
}
:root:not([data-theme="light"]){}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#0e1116; --surface:#161b22; --surface-2:#1b212a; --ink:#e7ebf0;
    --muted:#97a1ad; --line:#28303b; --accent:#d9a441; --accent-2:#e3b969;
    --gain:#41bd83; --loss:#e26c55;
  }
}
:root[data-theme="dark"]{
  --bg:#0e1116; --surface:#161b22; --surface-2:#1b212a; --ink:#e7ebf0;
  --muted:#97a1ad; --line:#28303b; --accent:#d9a441; --accent-2:#e3b969;
  --gain:#41bd83; --loss:#e26c55;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
  line-height:1.6;-webkit-font-smoothing:antialiased}
.page{max-width:1080px;margin:0 auto;padding:0 20px 80px}
h1,h2,h3,h4{text-wrap:balance;line-height:1.2}
section{padding:38px 0;border-top:1px solid var(--line)}
section h2{font-size:1.5rem;margin:0 0 6px;letter-spacing:-0.01em}
p{margin:0 0 14px;max-width:68ch}
.num{text-align:right}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}
.strong{font-weight:700}
.gain{color:var(--gain)} .loss{color:var(--loss)}

/* Masthead */
.masthead{padding:34px 0 30px}
.mast-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
.wordmark{font-family:var(--mono);font-weight:700;letter-spacing:0.02em;
  text-transform:uppercase;font-size:0.82rem}
.wordmark span{color:var(--accent);font-weight:500}
.theme-btn{background:var(--surface);border:1px solid var(--line);color:var(--ink);
  width:38px;height:38px;border-radius:8px;cursor:pointer;font-size:1rem}
.theme-btn:hover{border-color:var(--accent)}
.masthead h1{font-size:2.5rem;margin:0 0 14px;letter-spacing:-0.02em}
.dek{font-size:1.1rem;color:var(--muted);max-width:64ch}
.disclaimer{font-size:0.82rem;color:var(--muted);border-left:2px solid var(--accent);
  padding-left:12px;margin-top:18px}
.lead,.masthead h1{max-width:none}
.lead{font-size:1.05rem}

/* KPI tiles */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:18px 18px 16px}
.tile-label{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;
  color:var(--muted);margin-bottom:8px}
.tile-value{font-family:var(--mono);font-size:1.9rem;font-weight:600;
  font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.tile-value.neutral{color:var(--ink)}
.tile-sub{font-family:var(--mono);font-size:0.82rem;color:var(--muted);margin-top:4px}
.tile-note{font-size:0.78rem;color:var(--muted);margin-top:8px;
  padding-top:8px;border-top:1px solid var(--line)}

/* Table */
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;margin-top:8px}
table{width:100%;border-collapse:collapse;font-size:0.9rem;min-width:720px}
thead th{background:var(--surface-2);text-align:left;padding:12px 14px;
  font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);
  border-bottom:1px solid var(--line);white-space:nowrap}
thead th.num{text-align:right}
tbody td{padding:11px 14px;border-bottom:1px solid var(--line)}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:var(--surface-2)}

/* Pills */
.pill{font-family:var(--mono);font-size:0.68rem;font-weight:700;text-transform:uppercase;
  letter-spacing:0.04em;padding:3px 8px;border-radius:999px;white-space:nowrap}
.pill.buy{background:color-mix(in srgb,var(--gain) 18%,transparent);color:var(--gain)}
.pill.hold{background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)}
.pill.avoid{background:color-mix(in srgb,var(--loss) 16%,transparent);color:var(--loss)}

/* Figures */
.fig-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:8px}
.fig{margin:0}
.plate{background:#ffffff;border:1px solid var(--line);border-radius:10px;
  padding:10px;overflow:hidden}
.plate img{display:block;width:100%;height:auto;border-radius:4px}
figcaption{font-size:0.85rem;color:var(--muted);margin-top:10px}
figcaption b{color:var(--ink)}

/* Cards */
.cards{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  overflow:hidden}
.card summary{display:flex;align-items:center;gap:14px;padding:14px 18px;cursor:pointer;
  list-style:none;flex-wrap:wrap}
.card summary::-webkit-details-marker{display:none}
.card summary:hover{background:var(--surface-2)}
.card-ticker{font-weight:700;font-size:1rem;min-width:56px}
.card-name{flex:1;min-width:140px}
.card-metrics{font-size:0.82rem;color:var(--muted)}
.card[open] summary{border-bottom:1px solid var(--line)}
.card-body{padding:18px}
.overview{color:var(--ink)}
.overview strong{color:var(--accent)}
.metric-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:16px 0}
.metric-grid div{background:var(--surface-2);border-radius:8px;padding:10px;text-align:center}
.metric-grid span{display:block;font-size:0.68rem;text-transform:uppercase;
  letter-spacing:0.04em;color:var(--muted);margin-bottom:4px}
.metric-grid b{font-family:var(--mono);font-size:1rem;font-variant-numeric:tabular-nums}
.thesis{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:6px}
.thesis h4{margin:0 0 6px;font-size:0.9rem}
.thesis .bull h4{color:var(--gain)} .thesis .bear h4{color:var(--loss)}
.thesis ul{margin:0;padding-left:18px;font-size:0.88rem;color:var(--muted)}
.thesis li{margin-bottom:5px}
.rec{margin-top:16px;font-size:0.9rem;color:var(--muted);
  padding-top:14px;border-top:1px solid var(--line)}

.pred-note{background:var(--surface-2);border-radius:14px;padding:30px 26px;
  border-top:1px solid var(--line)}

/* Footer */
footer{padding-top:38px;border-top:1px solid var(--line);margin-top:20px}
.method{font-size:0.9rem;color:var(--muted);padding-left:18px}
.method li{margin-bottom:6px}

@media (max-width:760px){
  .masthead h1{font-size:1.9rem}
  .tiles{grid-template-columns:1fr 1fr}
  .fig-grid{grid-template-columns:1fr}
  .metric-grid{grid-template-columns:repeat(3,1fr)}
  .thesis{grid-template-columns:1fr}
}
</style>
"""


if __name__ == "__main__":
    html = build()
    with open(OUT, "w") as f:
        f.write(html)
    kb = os.path.getsize(OUT) / 1024
    print(f"wrote {os.path.relpath(OUT, config.PACKAGE_ROOT)} ({kb:.0f} KB)")
