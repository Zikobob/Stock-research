"""
Render a manuscript-style PDF preview (Times New Roman, double-spaced, centered
bold headings, title page, page numbers top-right, affiliation footer) via
headless Chromium. This mirrors the style of the .docx produced by
build_manuscript_docx.py so the look can be verified visually.

Run: python paper/build_manuscript_preview.py
Output: paper/research_paper_manuscript.pdf
"""

from __future__ import annotations

import glob
import os

import markdown
from playwright.sync_api import sync_playwright

import build_paper_html as bp  # reuse preprocess() + embed_images()

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, "research_paper.md")
HTML = os.path.join(HERE, "_manuscript.html")
PDF = os.path.join(HERE, "research_paper.pdf")

AUTHOR = "Aarav Vaidha"
MENTOR = "Guidance from [Mentor / Advisor]"
TITLE = ("Cross-Sector Correlation Regimes and Their Impact on the Predictive "
         "Accuracy of Equity Price Forecasting Models")
KEYWORDS = ("cross-sector correlation, realized volatility, regime analysis, "
            "out-of-sample forecasting, return predictability, volatility "
            "confound, Newey–West standard errors")
AFFIL = ("¹Aarav Vaidha, MOT Charter High School, 1275 Cedar Lane Rd, "
         "Middletown, DE 19709, USA. aaravvaidha69@gmail.com")

CSS = """
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', Times, serif; font-size: 12pt;
       line-height: 2.0; color: #000; margin: 0; }
p { text-indent: 0.5in; margin: 0; text-align: left; }
h1, h2 { font-size: 12pt; font-weight: bold; text-align: center; margin: 1em 0 .3em; }
h3, h4 { font-size: 12pt; font-weight: bold; text-align: left; margin: 1em 0 .2em; }
blockquote { margin: .5em 0 .5em .5in; }
blockquote p { text-indent: 0; }
table { border-collapse: collapse; margin: .6em auto; font-size: 10.5pt;
        line-height: 1.15; }
th, td { border: 1px solid #444; padding: 3px 7px; text-align: right; }
th:first-child, td:first-child { text-align: left; }
thead th { background: #2f5d50; color: #fff; }
tbody tr:nth-child(even) { background: #eef2f0; }
figure { text-align: center; margin: 1em 0; page-break-inside: avoid; }
figure img { max-width: 90%; height: auto; }
figcaption { text-indent: 0; font-size: 11pt; text-align: left; margin-top: .2em; }
code { font-family: 'Courier New', monospace; font-size: 10.5pt; }
pre { text-indent: 0; background: #f5f5f5; padding: .5em; overflow-x: auto; }
.eq { text-align: center; text-indent: 0; margin: .6em 0; }
.titlepage { page-break-after: always; }
.titlepage .tl { text-align: left; }
.titlepage .gap { height: 2.4in; }
.titlepage .ctr { text-align: center; }
.titlepage .kw { text-indent: 0; margin-top: 2em; }
a { color: #000; text-decoration: underline; }
"""

TITLE_PAGE = f"""
<div class="titlepage">
  <p class="tl">{TITLE}</p>
  <div class="gap"></div>
  <p class="ctr">{TITLE}</p>
  <p class="ctr">{AUTHOR}<sup>1</sup></p>
  <p class="ctr"><b>{MENTOR}</b></p>
  <p class="kw"><b>Keywords:</b> {KEYWORDS}</p>
</div>
"""


def build_html() -> None:
    with open(MD, encoding="utf-8") as f:
        text = f.read()
    text = text[text.index("## Abstract"):]  # drop leading title/subtitle
    body = markdown.markdown(bp.preprocess(text),
                             extensions=["tables", "fenced_code", "sane_lists"])
    body = bp.embed_images(body)
    html = (f'<!doctype html><html><head><meta charset="utf-8">'
            f"<style>{CSS}</style></head><body>{TITLE_PAGE}{body}</body></html>")
    with open(HTML, "w", encoding="utf-8") as f:
        f.write(html)


def render() -> None:
    exe = None
    for pat in ("/opt/pw-browsers/chromium-*/chrome-linux/chrome",):
        hits = sorted(glob.glob(pat))
        if hits:
            exe = hits[-1]
    header = ('<div style="font-family:Times New Roman; font-size:10pt; '
              'width:100%; text-align:right; padding:0 0.6in;">'
              '<span class="pageNumber"></span></div>')
    footer = ('<div style="font-family:Times New Roman; font-size:9pt; '
              'width:100%; padding:4px 1in 0; border-top:1px solid #000;">'
              + AFFIL + "</div>")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe)
        pg = b.new_page()
        pg.goto("file://" + HTML, wait_until="networkidle")
        pg.pdf(path=PDF, format="Letter", print_background=True,
               display_header_footer=True,
               header_template=header, footer_template=footer,
               margin={"top": "1in", "bottom": "1in", "left": "1in", "right": "1in"})
        b.close()
    print(f"Wrote {PDF} ({os.path.getsize(PDF)/1024:.0f} KB)")


if __name__ == "__main__":
    build_html()
    render()
    try:
        os.remove(HTML)
    except OSError:
        pass
