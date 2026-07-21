"""
Render research_paper.html to a print-quality PDF using headless Chromium.

Run:  python paper/build_pdf.py

Requires the `playwright` Python package. It uses whatever Chromium build is
available; if the default download is missing, set CHROME_EXECUTABLE to a
Chromium/Chrome binary path (this environment ships one under /opt/pw-browsers).
Falls back to browsers Playwright manages itself.
"""

from __future__ import annotations

import glob
import os

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(HERE, "research_paper.html")
PDF_PATH = os.path.join(HERE, "research_paper.pdf")


def _find_chromium() -> str | None:
    """Locate a Chromium/Chrome binary, preferring an env override."""
    env = os.environ.get("CHROME_EXECUTABLE")
    if env and os.path.exists(env):
        return env
    # Common pre-installed location in this environment.
    for pat in (
        "/opt/pw-browsers/chromium-*/chrome-linux/chrome",
        "/opt/pw-browsers/chromium-*/chrome-linux/headless_shell",
    ):
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[-1]
    return None  # let Playwright use its managed browser


def main() -> None:
    exe = _find_chromium()
    with sync_playwright() as p:
        launch_kwargs = {"executable_path": exe} if exe else {}
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page()
        page.goto("file://" + HTML_PATH, wait_until="networkidle")
        page.pdf(
            path=PDF_PATH,
            format="A4",
            print_background=True,
            margin={"top": "18mm", "bottom": "18mm",
                    "left": "16mm", "right": "16mm"},
        )
        browser.close()
    print(f"Wrote {PDF_PATH} ({os.path.getsize(PDF_PATH) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
