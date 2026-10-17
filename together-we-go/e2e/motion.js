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
const go = async (p, r) => { await p.goto(BASE + '/' + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {}); };

(async () => {
  const b = await launch();
  // ---- reduce motion ON
  const calm = await open(b, 'reduce');
  await go(calm, '');
  const headlineOpacity = await calm.getByRole('heading', { name: /to go|Living|Tomorrow|epic/ }).first().evaluate((el) => getComputedStyle(el.closest('[style*="opacity"]') || el).opacity).catch(() => 'n/a');
  check('home headline is fully visible with Reduce Motion on', headlineOpacity === '1' || headlineOpacity === 'n/a', headlineOpacity);
  check('home content shows', await vis(calm.getByText(/to go|Living|Tomorrow/)));
  await go(calm, 'settings');
  await calm.getByLabel('Advanced settings').click(); await calm.waitForTimeout(300);
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
  await go(lively, 'settings');
  await lively.getByLabel('Advanced settings').click(); await lively.waitForTimeout(300);
  check('settings offers animations normally', await vis(lively.getByText(/Flying plane, floating cards/)));
  await go(lively, 'panorama?city=paris');
  check('360 view auto-rotates by default', await vis(lively.getByLabel('Auto rotate').getByText('Auto')));
  console.log(results.join('\n'));
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
