const { BASE, launch } = require('./lib');
// The phone's "Reduce Motion" setting is respected: nothing hidden, nothing animating, and Settings says why.
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
const vis = async (loc, t = 3000) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);

async function open(b, reducedMotion) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).click();
  await p.waitForTimeout(500);
  await p.getByLabel('Use the demo account').click();
  await p.getByTestId('sign-in').click();
  await p.waitForTimeout(2500);
  if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {});
  return p;
}
// The hero photo's transform as numbers: `scale` is the slow zoom, `shift` is how far the scroll has slid it (parallax).
const heroMotion = (p) =>
  p.getByTestId('hero-photo').evaluate((el) => {
    const t = getComputedStyle(el).transform;
    if (t === 'none') return { scale: 1, shift: 0 };
    const m = t.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    return { scale: m[0], shift: m[5] };
  });
const scrollHome = (p, y) =>
  p.evaluate((dy) => {
    const el = [...document.querySelectorAll('*')].find((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 40);
    if (el) el.scrollBy(0, dy);
  }, y);
const go = async (p, r) => { await p.goto(BASE + '/' + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {}); };

(async () => {
  const b = await launch();
  // ---- reduce motion ON
  const calm = await open(b, 'reduce');
  await go(calm, '');
  const headlineOpacity = await calm.getByRole('heading', { name: /to go|Living|Tomorrow|epic/ }).first().evaluate((el) => getComputedStyle(el.closest('[style*="opacity"]') || el).opacity).catch(() => 'n/a');
  check('home headline is fully visible with Reduce Motion on', headlineOpacity === '1' || headlineOpacity === 'n/a', headlineOpacity);
  check('home content shows', await vis(calm.getByText(/to go|Living|Tomorrow/)));
  // the photo does not zoom, and does not slide when the page scrolls
  const still0 = await heroMotion(calm);
  await calm.waitForTimeout(2500);
  await scrollHome(calm, 260); await calm.waitForTimeout(500);
  const still1 = await heroMotion(calm);
  check('home photo does not zoom with Reduce Motion on', still0.scale === 1 && still1.scale === 1, JSON.stringify([still0, still1]));
  check('home photo does not drift against the scroll with Reduce Motion on', still1.shift === 0, JSON.stringify(still1));
  await go(calm, 'settings');
  check('settings says why animations are off', await vis(calm.getByText(/Reduce Motion setting is on/)));
  await go(calm, 'panorama?city=paris');
  check('360 view starts paused', await vis(calm.getByLabel('Auto rotate').getByText('Paused')));
  const before = await calm.getByText(/360° ·/).first().textContent();
  await calm.waitForTimeout(4000);
  const after = await calm.getByText(/360° ·/).first().textContent();
  check('360 view does not turn by itself', before === after, `${before} -> ${after}`);
  await calm.getByLabel('Auto rotate').click();
  check('tapping Auto explains why it stays off', await vis(calm.getByText(/Animations are off/)));
  await calm.getByLabel('Look right').click();
  await calm.waitForTimeout(150);
  const turned = await calm.getByText(/360° ·/).first().textContent();
  check('the arrows still turn the view at once', turned !== before, `${before} -> ${turned}`);

  // ---- reduce motion OFF: the same screens animate
  const lively = await open(b, 'no-preference');
  await go(lively, '');
  const move0 = await heroMotion(lively);
  await lively.waitForTimeout(2500);
  await scrollHome(lively, 260); await lively.waitForTimeout(600);
  const move1 = await heroMotion(lively);
  check('home photo zooms slowly by default', move1.scale > move0.scale && move1.scale <= 1.08, JSON.stringify([move0, move1]));
  check('home photo drifts against the scroll by default', move1.shift > 0, JSON.stringify(move1));
  await go(lively, 'settings');
  check('settings offers animations normally', await vis(lively.getByText(/Flipping numbers, floating cards/)));
  await go(lively, 'panorama?city=paris');
  check('360 view auto-rotates by default', await vis(lively.getByLabel('Auto rotate').getByText('Auto')));
  console.log(results.join('\n'));
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
