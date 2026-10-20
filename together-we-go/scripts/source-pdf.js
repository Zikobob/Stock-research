// Prints all hand-written source code into docs/TogetherWeGo-source-code.pdf.
//   npm run source-pdf         (needs a browser: `npx playwright-core install chromium`, or set E2E_CHROME)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', '.dist', 'shots', 'data', 'assets', 'screenshots', 'fixtures']);
const KEEP = /\.(tsx?|jsx?|json|md)$/;
const ROOT_FILES = ['README.md', 'ATTRIBUTIONS.md', 'package.json', 'app.json', 'eas.json', 'tsconfig.json', 'eslint.config.js', 'jest.config.js', 'jest.setup.js'];
const FOLDERS = ['src', 'server', 'e2e', 'scripts', 'docs'];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (KEEP.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [...ROOT_FILES.map((f) => path.join(root, f)), ...FOLDERS.flatMap((d) => walk(path.join(root, d)))].filter((f) => fs.existsSync(f));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const lines = files.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split('\n').length, 0);

const html = `<html><head><meta charset="utf-8"><style>
@page{size:Letter;margin:14mm 10mm}body{font-family:Helvetica,Arial,sans-serif;font-size:10pt}h1{font-size:22pt}
h2{font-size:10.5pt;background:#222;color:#fff;padding:3px 6px;margin:0 0 4px;page-break-after:avoid}
pre{font-family:DejaVu Sans Mono,Menlo,Consolas,monospace;font-size:6.6pt;line-height:1.25;white-space:pre-wrap;word-break:break-all;margin:0 0 10px}
.f{margin-top:6px}.toc div{font-size:8.5pt;line-height:1.5}
</style></head><body>
<h1>TogetherWeGo: complete source code</h1>
<p>FBLA Mobile Application Development 2026-27, &ldquo;Together We Go: Group Trip Planner&rdquo;. Expo SDK 57 / React Native / TypeScript, with a small Node sync server. ${files.length} files, ${lines.toLocaleString('en-US')} lines. Photos and fonts are listed in ATTRIBUTIONS.md and are not printed.</p>
<div class="toc">${files.map((f, i) => `<div>${i + 1}. ${esc(rel(f))}</div>`).join('')}</div>
${files.map((f) => `<div class="f" style="page-break-before:auto"><h2>${esc(rel(f))}</h2><pre>${esc(fs.readFileSync(f, 'utf8'))}</pre></div>`).join('\n')}
</body></html>`;

(async () => {
  const browser = await chromium.launch(process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {});
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.join(root, 'docs', 'TogetherWeGo-source-code.pdf');
  await page.pdf({
    path: out,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7px;width:100%;text-align:center">TogetherWeGo source code - page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
  });
  await browser.close();
  console.log(`Wrote ${rel(out)} (${files.length} files, ${lines} lines)`);
})();
