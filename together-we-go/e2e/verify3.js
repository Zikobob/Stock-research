const { BASE, launch, shot } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  await p.getByRole('button', { name: 'Skip' }).click(); await p.waitForTimeout(700);
  // sign-up → survey prompt
  await p.getByRole('link', { name: 'Sign Up' }).click(); await p.waitForTimeout(900);
  await p.getByPlaceholder('e.g. Alex Rivera').fill('Jordan Smith'); await p.getByPlaceholder('you@email.com').fill('jordan@school.org');
  await p.getByPlaceholder('At least 8 characters').fill('Trip2027go'); await p.getByPlaceholder('Re-enter password').fill('Trip2027go');
  await p.getByRole('checkbox').click(); await p.getByRole('button', { name: 'Create account' }).click(); await p.waitForTimeout(2500);
  check('new account lands in Make it yours', await vis(p.getByRole('heading', { name: /make it yours/i })));
  await p.getByRole('button', { name: 'Let’s go' }).click(); await p.waitForTimeout(600);
  // the look step: picking a theme repaints this screen at once (the accent of the step bar and the button plate change)
  await p.getByRole('radio', { name: 'Tomato theme' }).click(); await p.waitForTimeout(500);
  check('the Look step marks the chosen theme', (await p.getByRole('radio', { name: 'Tomato theme' }).getAttribute('aria-checked')) === 'true');
  await p.getByRole('radio', { name: 'Grape theme' }).click(); await p.waitForTimeout(400);
  check('Grape switches the mode to Dark', (await p.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')) === 'true');
  await p.getByRole('radio', { name: 'Light' }).click(); await p.getByRole('radio', { name: 'Tomato theme' }).click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForTimeout(500);
  // picking no interest never blocks
  await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForTimeout(500);
  check('no interest picked still moves on to the layout step', await vis(p.getByRole('radio', { name: 'Money layout' })));
  await p.getByRole('radio', { name: 'Party layout' }).click(); await p.waitForTimeout(300);
  check('a layout can be chosen', (await p.getByRole('radio', { name: 'Party layout' }).getAttribute('aria-checked')) === 'true');
  await p.getByRole('button', { name: 'Back', exact: true }).click(); await p.waitForTimeout(500);
  await p.getByRole('checkbox', { name: 'Beaches' }).click();
  await p.getByLabel('Skip to the end').click(); await p.waitForTimeout(600);
  // the last page lists every answer; tapping a row opens that step, and "Back to summary" (or the back arrow) returns
  check('last page lists the answers as tappable rows', await vis(p.getByLabel(/Change interests, now Beaches/)));
  check('the layout chosen on the way is listed', await vis(p.getByLabel(/Change home layout, now Party/)));
  await p.getByLabel('Change interests').click(); await p.waitForTimeout(500);
  check('a summary row opens its step', await vis(p.getByRole('checkbox', { name: 'Nightlife' })));
  await p.getByRole('checkbox', { name: 'Nightlife' }).click();
  await p.getByRole('button', { name: 'Back to summary' }).click(); await p.waitForTimeout(600);
  check('"Back to summary" returns with the change applied', await vis(p.getByLabel(/Change interests, now Nightlife, Beaches/)));
  await p.getByLabel('Change look').click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Back', exact: true }).click(); await p.waitForTimeout(600);
  check('the back arrow also returns to the summary', await vis(p.getByLabel(/Change look, now Tomato/)));
  await p.getByRole('button', { name: 'Apply my style' }).click();
  check('a short "Building your trip HQ" moment plays', await vis(p.getByRole('heading', { name: /Building your trip HQ/ }), 2500));
  await p.waitForTimeout(5500);
  const saved = await p.evaluate(() => localStorage.getItem('togetherwego-appearance'));
  check('theme saved', /sunset/.test(saved || ''), saved);
  check('still signed in after reload (no trip card)', await vis(p.getByText(/Plan your first group trip/)));
  check('no-trip home has create/join', await vis(p.getByRole('button', { name: /Create trip/ })));
  await p.close();
  // tour for the demo user
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p2.goto(BASE + '/', { waitUntil: 'networkidle' }); await p2.waitForTimeout(2000);
  await p2.getByRole('button', { name: 'Skip' }).click(); await p2.waitForTimeout(700);
  await p2.getByLabel('Use the demo account').click(); await p2.getByTestId('sign-in').click(); await p2.waitForTimeout(2500);
  check('guided tour shows on first run', await vis(p2.getByText(/at a glance/i)));
  for (let i = 0; i < 4; i++) { await p2.getByRole('button', { name: 'Next' }).last().click(); await p2.waitForTimeout(450); }
  check('tour last step', await vis(p2.getByRole('button', { name: 'Got it' })));
  await p2.getByRole('button', { name: 'Got it' }).click(); await p2.waitForTimeout(700);
  check('tour closes', !(await vis(p2.getByText(/at a glance/i), 500)));
  await p2.reload({ waitUntil: 'networkidle' }); await p2.waitForTimeout(2500);
  check('tour does not return', !(await vis(p2.getByRole('button', { name: 'Got it' }), 800)));
  // Settings can put on a new look too: pick, Apply look, and the app restarts in it without signing anyone out
  await p2.goto(BASE + '/settings', { waitUntil: 'load' }); await p2.waitForTimeout(1500);
  await p2.getByRole('radio', { name: 'Tomato theme' }).click(); await p2.waitForTimeout(300);
  await p2.getByRole('button', { name: 'Apply look' }).click(); await p2.waitForTimeout(4500);
  check('Apply look in Settings saves the new theme', /sunset/.test((await p2.evaluate(() => localStorage.getItem('togetherwego-appearance'))) || ''));
  check('the app is back on Home, still signed in, after the restart', await vis(p2.getByRole('tab', { name: 'Home', exact: true })));
  // midnight theme screenshot set
  await p2.evaluate(() => localStorage.setItem('togetherwego-appearance', JSON.stringify({ theme: 'midnight', corners: 'bubbly' })));
  await p2.reload({ waitUntil: 'networkidle' }); await p2.waitForTimeout(2500);
  await p2.screenshot({ path: shot('v3-midnight-home.png') });
  for (const t of ['Plan', 'Budget', 'Chat', 'More']) { await p2.getByRole('tab', { name: t, exact: true }).click(); await p2.waitForTimeout(1100); await p2.screenshot({ path: shot(`v3-midnight-${t}.png`) }); }
  console.log(results.join('\n')); console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 600)); process.exit(1); });
