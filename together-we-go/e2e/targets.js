// Fitts's law: everything you tap should be big enough to hit. Visits every screen and lists each control smaller than 44 x 44 points.
// (A phone's own switch keeps the size the platform gives it, so switches are not counted.)
const { BASE, start, ROUTES } = require('./lib');
const MIN = 44;
// the 360° screen is not in the list of every screen (the overflow test skips it) but its controls must be big enough too
const all = [...ROUTES, 'panorama'];
const routes = process.env.E2E_ONLY ? all.filter((r) => process.env.E2E_ONLY.split(',').includes(r)) : all;

const audit = (min) => {
  const SEL = 'button, a[href], [role=button], [role=link], [role=tab], [role=radio], [role=menuitem], input:not([type=hidden]):not([role=switch]):not([type=checkbox]), textarea, select';
  const seen = new Set();
  const out = [];
  let count = 0;
  for (const el of document.querySelectorAll(SEL)) {
    const rc = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (rc.width < 1 || rc.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    // a control inside a scroller that is clipped away entirely is not on screen
    if (el.closest('[aria-hidden=true]')) continue;
    count++;
    if (Math.round(rc.width) >= min && Math.round(rc.height) >= min) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 36);
    const key = `${name}|${Math.round(rc.width)}x${Math.round(rc.height)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`"${name}" is ${Math.round(rc.width)} x ${Math.round(rc.height)}`);
  }
  return { count, out };
};

(async () => {
  const { b, p } = await start();
  let bad = 0;
  let total = 0;
  for (const r of routes) {
    await p.goto(BASE + '/' + r, { waitUntil: 'load' });
    await p.waitForTimeout(1300);
    if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {});
    const res = await p.evaluate(audit, MIN);
    total += res.count;
    if (res.out.length) {
      bad++;
      console.log(`FAIL  /${r}  ${res.out.slice(0, 6).join(' | ')}${res.out.length > 6 ? ` (+${res.out.length - 6} more)` : ''}`);
    }
  }
  console.log(bad ? `${bad} screens have controls smaller than ${MIN} x ${MIN}` : `PASS  all ${total} controls on ${routes.length} screens are at least ${MIN} x ${MIN}`);
  await b.close();
})().catch((e) => { console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
