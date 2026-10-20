// Visits every screen at two phone widths and reports anything that sticks out sideways (the "page scrolls horizontally" bug).
const { BASE, start, ROUTES: all } = require('./lib');
// E2E_ONLY=settings,profile checks just those screens (handy while working on one)
const routes = process.env.E2E_ONLY ? all.filter((r) => process.env.E2E_ONLY.split(',').includes(r)) : all;
const passes = [{ w: 390, scale: 1 }, { w: 320, scale: 1 }, { w: 360, scale: 1.25 }]; // the last one is the "larger text" setting
const SKIP = new Set(['panorama']); // the 360° scene is meant to be wider than the screen

(async () => {
  const { b, p } = await start();
  let bad = 0;
  for (const { w, scale } of passes) {
    await p.setViewportSize({ width: w, height: 760 });
    await p.evaluate((sc) => { const j = JSON.parse(localStorage.getItem('togetherwego-v1')); j.state.settings.textScale = sc; localStorage.setItem('togetherwego-v1', JSON.stringify(j)); }, scale);
    for (const r of routes) {
      if (SKIP.has(r)) continue;
      await p.goto(BASE + '/' + r, { waitUntil: 'load' });
      await p.waitForTimeout(1300);
      if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {});
      const res = await p.evaluate((vw) => {
        // not window.innerWidth: a mobile browser widens its layout viewport to fit whatever sticks out
        const doc = document.scrollingElement || document.documentElement;
        const scrollers = [...document.querySelectorAll('*')].filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowX));
        const inScroller = (el) => scrollers.some((s) => s !== el && s.contains(el));
        const clipped = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n); if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && n.getBoundingClientRect().right <= vw + 1) return true; } return false; };
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const rc = el.getBoundingClientRect();
          if (rc.width < 2 || rc.right <= vw + 1 || getComputedStyle(el).visibility === 'hidden' || inScroller(el) || clipped(el)) continue;
          out.push(`${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}] w=${Math.round(rc.width)} right=${Math.round(rc.right)}`);
          if (out.length >= 3) break;
        }
        return { pageScroll: doc.scrollWidth > vw + 1, scrollWidth: doc.scrollWidth, vw, out };
      }, w);
      if (res.pageScroll || res.out.length) { bad++; console.log(`FAIL  ${w}px x${scale} /${r}  page ${res.scrollWidth}>${res.vw}: ${res.pageScroll}  ${res.out.join(' | ')}`); }
    }
  }
  console.log(bad ? `${bad} screens overflow` : 'no screen overflows at 390 px, 320 px or with larger text');
  await b.close();
})().catch((e) => { console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
