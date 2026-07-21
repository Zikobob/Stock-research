"""
Render research_paper.md to a self-contained, print-to-PDF-ready HTML file.

- Converts a few inline LaTeX snippets to Unicode so no MathJax/CDN is needed
  (the file stays fully self-contained and works offline).
- Embeds all figures as base64 in a Figures appendix.
- Academic styling with print CSS (open in a browser -> Print -> Save as PDF).

Run:  python paper/build_paper_html.py
"""

from __future__ import annotations

import base64
import os
import re

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MD_PATH = os.path.join(HERE, "research_paper.md")
FIG_DIR = os.path.join(ROOT, "figures")
OUT_PATH = os.path.join(HERE, "research_paper.html")

# Figures in display order with captions.
FIGURES = [
    ("01_cumulative_returns.png", "Growth of $1 invested per asset."),
    ("02_return_series.png", "Daily log returns by asset."),
    ("03_correlation_heatmap.png", "Full-sample return correlation matrix."),
    ("04_rolling_corr_regimes.png",
     "Rolling average cross-sector correlation with high/low regime shading."),
    ("05_regime_timeline.png", "Correlation regime classification over time."),
    ("06_pca_analysis.png",
     "PCA explained variance (scree) and rolling PC1 co-movement."),
    ("07_prediction_vs_actual.png",
     "Predicted vs actual SPY price (linear regression, last 250 days)."),
    ("08_error_distribution.png",
     "Absolute return-error distribution: high vs low correlation regime."),
    ("09_directional_accuracy.png",
     "Directional accuracy by model and regime."),
    ("10_corr_vs_vol_scatter.png",
     "Correlation and volatility are collinear (r = 0.64)."),
    ("11_double_sort.png",
     "2x2 double sort: volatility dominates, not correlation."),
]

# Minimal LaTeX -> Unicode replacements (order matters).
LATEX_REPLACEMENTS = [
    (r"\$\$\s*r_t = \\ln\\!\\left\(\\frac\{P_t\}\{P_\{t-1\}\}\\right\)\.\s*\$\$",
     "<p class='eq'>r<sub>t</sub> = ln( P<sub>t</sub> / P<sub>t&minus;1</sub> )</p>"),
    (r"\$\$\s*\\hat\{P\}_t = P_\{t-1\}\\,e\^\{\\hat\{r\}_t\}\.?\s*\$\$",
     "<p class='eq'>P&#770;<sub>t</sub> = P<sub>t&minus;1</sub> &middot; e<sup>r&#770;<sub>t</sub></sup></p>"),
    (r"\$\$\s*\|\\text\{error\}\|_t = b_0 \+ b_1\\,\\text\{corr\}_\{t-1\} \+ b_2\\,\\text\{vol\}_\{t-1\} \+ e_t\.\s*\$\$",
     "<p class='eq'>|error|<sub>t</sub> = b<sub>0</sub> + b<sub>1</sub>&middot;corr<sub>t&minus;1</sub> + b<sub>2</sub>&middot;vol<sub>t&minus;1</sub> + e<sub>t</sub></p>"),
    (r"\$\\hat\{P\}_t = P_\{t-1\}\\,e\^\{\\hat\{r\}_t\}\$",
     "P&#770;<sub>t</sub> = P<sub>t&minus;1</sub>&middot;e<sup>r&#770;<sub>t</sub></sup>"),
    (r"\$\\hat\{P\}_t = P_\{t-1\}\$", "P&#770;<sub>t</sub> = P<sub>t&minus;1</sub>"),
    (r"\$r_t\$", "r<sub>t</sub>"),
    (r"\$r_\{t-1\}\$", "r<sub>t&minus;1</sub>"),
    (r"\$r_\{t-1\},\\dots,r_\{t-5\}\$",
     "r<sub>t&minus;1</sub>, &hellip;, r<sub>t&minus;5</sub>"),
    (r"\$b_1\$", "b<sub>1</sub>"),
    (r"\$H_0\$", "H<sub>0</sub>"),
    (r"\$t\$", "t"),
    (r"\$r = 0\.64\$", "r = 0.64"),
    (r"\$p \\approx 0\.72\\text\{–\}0\.79\$", "p &asymp; 0.72&ndash;0.79"),
    (r"\*t\*", "<em>t</em>"),
    (r"\*t−1\*", "<em>t&minus;1</em>"),
]


def preprocess(md_text: str) -> str:
    for pat, rep in LATEX_REPLACEMENTS:
        md_text = re.sub(pat, rep, md_text)
    # Any stray inline math delimiters -> strip the $ to avoid raw TeX.
    md_text = md_text.replace("$", "")
    return md_text


def _embed_one(alt: str, src: str) -> str:
    """Return a self-contained <figure> for one image, or '' if missing."""
    fname = os.path.basename(src)
    path = os.path.join(FIG_DIR, fname)
    if not os.path.exists(path):
        return ""
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    # Bold a leading "Figure N." label in the caption.
    m = re.match(r"(Figure\s+\d+\.)\s*(.*)", alt, re.S)
    caption = (f"<strong>{m.group(1)}</strong> {m.group(2)}" if m else alt)
    return (f'<figure><img src="data:image/png;base64,{b64}" alt="{fname}">'
            f'<figcaption>{caption}</figcaption></figure>')


def embed_images(html: str) -> str:
    """Replace inline <img src="../figures/..."> tags with embedded figures.

    Markdown renders a standalone image as <p><img ...></p>; we swap the <img>
    for a self-contained <figure> and unwrap the surrounding <p>.
    """
    def repl(match: "re.Match") -> str:
        tag = match.group(0)
        alt = (re.search(r'alt="([^"]*)"', tag) or [None, ""])
        src = (re.search(r'src="([^"]*)"', tag) or [None, ""])
        alt_v = alt.group(1) if hasattr(alt, "group") else ""
        src_v = src.group(1) if hasattr(src, "group") else ""
        return _embed_one(alt_v, src_v) or tag

    html = re.sub(r"<img[^>]*>", repl, html)
    html = html.replace("<p><figure>", "<figure>").replace("</figure></p>", "</figure>")
    return html


CSS = """
:root { --ink:#1a1a1a; --muted:#555; --rule:#ddd; --accent:#7a1f2b; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color: var(--ink);
       max-width: 820px; margin: 0 auto; padding: 3rem 1.5rem 5rem;
       line-height: 1.6; font-size: 17px; }
h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 .3rem; }
h2 { font-size: 1.4rem; margin-top: 2.4rem; padding-bottom: .3rem;
     border-bottom: 2px solid var(--accent); }
h3 { font-size: 1.15rem; margin-top: 1.8rem; color: #333; }
p, li { color: var(--ink); }
a { color: var(--accent); }
blockquote { border-left: 3px solid var(--accent); margin: 1.2rem 0;
             padding: .3rem 1rem; background: #faf6f2; color: var(--muted);
             font-size: .95em; }
code { background: #f4f4f4; padding: .1em .35em; border-radius: 3px;
       font-family: 'SFMono-Regular', Consolas, monospace; font-size: .82em; }
pre { background: #f7f7f7; padding: 1rem; overflow-x: auto; border-radius: 6px;
      border: 1px solid var(--rule); }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1.2rem 0;
        font-size: .86em; font-family: -apple-system, Arial, sans-serif; }
th, td { border: 1px solid var(--rule); padding: .4rem .6rem; text-align: right; }
th:first-child, td:first-child { text-align: left; }
thead th { background: #f2ecec; border-bottom: 2px solid var(--accent); }
tbody tr:nth-child(even) { background: #fbfafa; }
.eq { text-align: center; font-size: 1.05em; margin: 1rem 0;
      font-family: 'Cambria Math', Georgia, serif; }
figure { margin: 1.8rem 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; height: auto; border: 1px solid var(--rule);
             border-radius: 4px; }
figcaption { font-size: .82em; color: var(--muted); margin-top: .5rem;
             text-align: left; }
hr { border: none; border-top: 1px solid var(--rule); margin: 2.5rem 0; }
strong { color: #111; }
.titlepage { text-align: center; padding: 3.5rem 0 2rem; }
.titlepage .maintitle { font-size: 1.9rem; line-height: 1.3; font-weight: 700;
  margin: 0 auto 1rem; max-width: 90%; }
.titlepage .subtitle { font-size: 1.15rem; font-style: italic; color: var(--muted);
  margin-bottom: 2.5rem; }
.titlepage .author { font-size: 1.15rem; margin-bottom: .2rem; }
.titlepage .date { color: var(--muted); margin-bottom: 2.5rem; }
.titlepage .meta { text-align: left; max-width: 640px; margin: 2rem auto 0;
  font-size: .9em; font-family: -apple-system, Arial, sans-serif; }
.titlepage .meta p { margin: .4rem 0; }
.titlepage .rule { width: 60px; border-top: 2px solid var(--accent);
  margin: 1.5rem auto; }
@media print {
  body { font-size: 11.5pt; max-width: 100%; padding: 0; }
  h2 { page-break-after: avoid; }
  figure, table, pre, blockquote { page-break-inside: avoid; }
  a { color: var(--ink); text-decoration: none; }
  .titlepage { page-break-after: always; min-height: 90vh; }
}
"""

# --- Title-page content ---------------------------------------------------- #
AUTHOR = "Aarav Vaidha"
DATE = "July 2026"
KEYWORDS = ("cross-sector correlation; realized volatility; regime analysis; "
            "out-of-sample forecasting; return predictability; "
            "Newey–West standard errors")
JEL = "C53, C58, G11, G17"

TITLE_PAGE = f"""
<div class="titlepage">
  <div class="maintitle">Cross-Sector Correlation Regimes and Their Impact on the
    Predictive Accuracy of Equity Price Forecasting Models</div>
  <div class="subtitle">A quantitative study of U.S. sector ETFs (2015&ndash;2026)</div>
  <div class="author">{AUTHOR}</div>
  <div class="date">{DATE}</div>
  <div class="rule"></div>
  <div class="meta">
    <p><strong>Keywords:</strong> {KEYWORDS}</p>
    <p><strong>JEL classification:</strong> {JEL}</p>
  </div>
</div>
"""


def main() -> None:
    with open(MD_PATH, encoding="utf-8") as f:
        md_text = f.read()

    # Drop the leading H1 + subtitle block from the body; the title page renders
    # them instead. Body begins at the Abstract.
    if "## Abstract" in md_text:
        md_text = md_text[md_text.index("## Abstract"):]

    body = markdown.markdown(
        preprocess(md_text),
        extensions=["tables", "fenced_code", "sane_lists"],
    )
    body = embed_images(body)
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cross-Sector Correlation Regimes and Equity Forecasting Accuracy</title>
<style>{CSS}</style></head>
<body>
{TITLE_PAGE}
{body}
</body></html>"""

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(html)
    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Wrote {OUT_PATH} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
