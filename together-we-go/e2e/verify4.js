const { BASE, start } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const heading = async (p) => Number((await p.getByText(/360° ·/).first().innerText()).match(/(\d+)°$/)[1]);
(async () => {
  const { b, p, errors } = await start();
  // Home chip opens the trip's city
  await p.getByLabel('Open the 360 degree city view').click(); await p.waitForTimeout(2000);
  check('home 360° chip opens Positano', await vis(p.getByRole('heading', { name: /Positano/i })));
  check('night/day toggle exists', await vis(p.getByLabel(/(Night|Day) view\./)));
  // day/night toggle flips
  const before = await p.getByLabel(/(Night|Day) view\./).getAttribute('aria-label');
  await p.getByLabel(/(Night|Day) view\./).click(); await p.waitForTimeout(500);
  const after = await p.getByLabel(/(Night|Day) view\./).getAttribute('aria-label');
  check('toggle flips day/night', before !== after, `${before} -> ${after}`);
  // city picker
  await p.getByLabel('Paris 360 degree view').click(); await p.waitForTimeout(1500);
  check('city picker → Paris', await vis(p.getByRole('heading', { name: /Paris/i })));
  check('landmark callout shows Eiffel fact', await vis(p.getByText(/330 m tall/)));
  // arrows change heading, auto pause
  await p.getByLabel(/Auto rotate/).click();
  const h0 = await heading(p);
  await p.getByLabel('Look right').click(); await p.waitForTimeout(1200);
  const h1 = await heading(p);
  check('arrow turns the view', h1 !== h0, `${h0} -> ${h1}`);
  // drag
  await p.mouse.move(150, 300); await p.mouse.down(); await p.mouse.move(300, 300, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(600);
  check('drag turns the view', (await heading(p)) !== h1);
  // landmark jump
  await p.getByLabel('Look at Arc de Triomphe').click(); await p.waitForTimeout(1500);
  check('jump to landmark shows its fact', await vis(p.getByText(/Napoleon in 1806/)));
  // full wrap: 360° of arrows returns near start heading
  const start0 = await heading(p);
  for (let i = 0; i < 12; i++) { await p.getByLabel('Look right').click(); await p.waitForTimeout(900); }
  const end0 = await heading(p);
  const diff = Math.abs(((end0 - start0 + 540) % 360) - 180);
  check('360° wraps around (≈ full circle after 12 turns)', diff <= 25, `${start0} -> ${end0} (off by ${diff}°)`);
  console.log(`  (12 arrow turns: ${start0}° -> ${end0}°, off by ${diff}°)`);
  // destination page button
  await p.goto(BASE + '/destination/tokyo', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
  await p.getByRole('button', { name: /360° view/ }).click(); await p.waitForTimeout(1500);
  check('destination page opens Tokyo 360', await vis(p.getByRole('heading', { name: /Tokyo/i })));
  // More menu entry
  await p.goto(BASE + '/profile', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /360° City Views/ }).first().click(); await p.waitForTimeout(1500);
  check('More → 360° City Views', await vis(p.getByLabel(/360 degree view/)));
  console.log(results.join('\n')); console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
