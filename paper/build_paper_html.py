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


def figures_html() -> str:
    blocks = ["<hr><h2 id='figures'>Figures</h2>"]
    for i, (fname, cap) in enumerate(FIGURES, 1):
        path = os.path.join(FIG_DIR, fname)
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        blocks.append(
            f"<figure><img src='data:image/png;base64,{b64}' alt='{fname}'>"
            f"<figcaption><strong>Figure {i}.</strong> {cap} "
            f"<code>{fname}</code></figcaption></figure>"
        )
    return "\n".join(blocks)


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
@media print {
  body { font-size: 11.5pt; max-width: 100%; padding: 0; }
  h2 { page-break-after: avoid; }
  figure, table, pre, blockquote { page-break-inside: avoid; }
  a { color: var(--ink); text-decoration: none; }
}
"""


def main() -> None:
    with open(MD_PATH, encoding="utf-8") as f:
        md_text = f.read()

    body = markdown.markdown(
        preprocess(md_text),
        extensions=["tables", "fenced_code", "sane_lists"],
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cross-Sector Correlation Regimes and Equity Forecasting Accuracy</title>
<style>{CSS}</style></head>
<body>
{body}
{figures_html()}
</body></html>"""

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(html)
    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Wrote {OUT_PATH} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
