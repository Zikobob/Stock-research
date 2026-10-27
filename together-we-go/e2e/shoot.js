// Takes pictures of screens so the design can be looked at (by a person or by Claude reading the PNGs).
//
//   node e2e/shoot.js --routes=explore,itinerary --modes=light,dark --themes=amalfi --out=/tmp/shots
//
//   --routes   screens to shoot, comma separated (default: the five tabs). "explore" is Home; "first" is the very first screen (use it with --signed-out). Add :tap=Label to click a button first,
//              for example  itinerary:tap=Add activity   (the click is on whatever has that accessible name).
//   --themes   amalfi,sunset,lagoon,rose,midnight,classic (default amalfi)
//   --modes    light,dark (default light); the browser's own colour scheme is set to match, and the app is told to follow it
//   --out      folder for the PNGs (default e2e/shots)
//   --dist     the exported web app to serve (default e2e/.dist); build it with: npx expo export --platform web --output-dir e2e/.dist
//   --pages    shots per screen, scrolling down between them (default 1)
//   --width / --height   the phone, default 390 x 844
//   --scale    text size setting, 1 / 1.12 / 1.25 (default 1)
//   --keep-tour   leave the first-run tour open
//   --jpg         write small JPEG files (for documentation) instead of PNG
//   --signed-out  do not sign in: shoot the first-run slides and sign-in
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { serve } = require('./serve');

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : process.argv.includes(`--${name}`) ? 'true' : fallback;
};
const list = (name, fallback) => String(arg(name, fallback)).split(',').filter(Boolean);

const dist = path.resolve(arg('dist', path.join(__dirname, '.dist')));
const out = path.resolve(arg('out', path.join(__dirname, 'shots')));
const routes = list('routes', 'explore,itinerary,budget,chat,profile');
const themes = list('themes', 'amalfi');
const modes = list('modes', 'light');
const pages = Number(arg('pages', '1'));
const width = Number(arg('width', '390'));
const height = Number(arg('height', '844'));
const scale = Number(arg('scale', '1'));
const jpg = process.argv.includes('--jpg');
const signedOut = process.argv.includes('--signed-out');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = await serve(dist, 0);
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch(process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {});
  for (const theme of themes) {
    for (const mode of modes) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: jpg ? 1.5 : 2, isMobile: true, hasTouch: true, colorScheme: mode });
      await ctx.addInitScript(([t, m]) => localStorage.setItem('togetherwego-appearance', JSON.stringify({ theme: t, corners: 'rounded', mode: m })), [theme, mode]);
      const p = await ctx.newPage();
      const errors = [];
      p.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.location().url.includes(':8787') && errors.push(m.text().slice(0, 300)));
      p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 300)));
      await p.goto(base + '/', { waitUntil: 'networkidle' });
      await p.waitForTimeout(1800);
      if (!signedOut) {
        if (await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).first().click(); await p.waitForTimeout(800); }
        await p.getByLabel('Use the demo account').click();
        await p.getByTestId('sign-in').click();
        await p.waitForTimeout(2800);
        if (scale !== 1) await p.evaluate((sc) => { const j = JSON.parse(localStorage.getItem('togetherwego-v1')); j.state.settings.textScale = sc; localStorage.setItem('togetherwego-v1', JSON.stringify(j)); }, scale);
        if (!process.argv.includes('--keep-tour') && (await p.getByRole('button', { name: 'Skip' }).count())) { await p.getByRole('button', { name: 'Skip' }).first().click(); await p.waitForTimeout(600); }
      }
      for (const spec of routes) {
        const [route, ...opts] = spec.split(':');
        await p.goto(route === 'first' ? `${base}/` : `${base}/${route}`, { waitUntil: 'load' });
        await p.waitForTimeout(1800);
        for (const o of opts) {
          if (o.startsWith('tap=')) { await p.getByLabel(o.slice(4)).first().click(); await p.waitForTimeout(900); }
        }
        const name = `${theme}-${mode}-${route.replace(/\//g, '_')}${opts.length ? '-' + opts.join('-').replace(/\W+/g, '_') : ''}`;
        for (let i = 0; i < pages; i++) {
          await p.screenshot(jpg ? { path: path.join(out, `${name}${pages > 1 ? '-' + (i + 1) : ''}.jpg`), type: 'jpeg', quality: 82 } : { path: path.join(out, `${name}${pages > 1 ? '-' + (i + 1) : ''}.png`) });
          if (i < pages - 1) {
            const moved = await p.evaluate(() => {
              const el = [...document.querySelectorAll('*')].find((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 40);
              if (!el) return false;
              el.scrollBy(0, el.clientHeight * 0.85);
              return true;
            });
            if (!moved) break;
            await p.waitForTimeout(600);
          }
        }
      }
      if (errors.length) console.log(`console errors for ${theme}/${mode}:\n  ` + [...new Set(errors)].join('\n  '));
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  console.log(`pictures are in ${out}`);
})().catch((e) => {
  console.error('CRASH', e.message.slice(0, 600));
  process.exit(1);
});
