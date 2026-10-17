const { BASE, start } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const go = async (p, r) => { await p.goto(BASE + '/' + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {}); };
(async () => {
  let { b, p, errors } = await start();
  // ---- Crew hub
  await go(p, 'crew');
  await p.getByLabel(/Diego Alvarez, Food Lead/).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Navigator' }).last().click().catch(() => {}); await p.waitForTimeout(500);
  check('role change toast', await vis(p.getByText(/Diego is now Navigator/)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.getByLabel(/Fornillo \(quiet, pebbles\)/).click().catch(() => {}); await p.waitForTimeout(500);
  check('poll vote registers', await vis(p.getByLabel(/Fornillo \(quiet, pebbles\), .*your vote/)));
  await p.getByLabel('Add task').click(); await p.waitForTimeout(400);
  check('empty task error', await vis(p.getByText(/enter|task|empty|required/i)));
  await p.getByLabel('New task').fill('Buy sunscreen'); await p.getByLabel('Add task').click(); await p.waitForTimeout(500);
  check('task added', await vis(p.getByText('Buy sunscreen')));
  await p.getByRole('button', { name: /New code/ }).click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /^(Create|New code|Confirm|Yes)/ }).last().click().catch(() => {}); await p.waitForTimeout(600);
  // add member validation
  await p.getByText('+ Add').first().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Add member' }).click(); await p.waitForTimeout(400);
  check('add member validation', await vis(p.getByText(/name/i).filter({ hasText: /enter|required|letters/i })) || await vis(p.getByText(/Enter .*name|required/i)));
  await p.keyboard.press('Escape');
  // ---- Flights
  await go(p, 'flights');
  check('flights Sam shows no flight', await vis(p.getByText('No flight added yet')));
  await p.getByTestId('add-flight').click(); await p.waitForTimeout(700);
  await p.getByRole('button', { name: 'Save flight' }).click(); await p.waitForTimeout(400);
  check('flight validation', await vis(p.getByText(/required|enter|airline/i)));
  await p.getByPlaceholder('ANA').fill('Delta'); await p.getByPlaceholder('NH 175').fill('DL 99'); await p.getByPlaceholder('JFK').fill('XXX');
  await p.getByRole('button', { name: 'Save flight' }).click(); await p.waitForTimeout(400);
  check('unknown IATA rejected', await vis(p.getByText(/airport|IATA|recogni/i)));
  await p.getByPlaceholder('JFK').fill('BOS');
  await p.getByRole('button', { name: 'Save flight' }).click(); await p.waitForTimeout(900);
  check('flight saved', await vis(p.getByText(/Flight saved/)) || await vis(p.getByText('Delta DL 99')));
  // ---- Packing
  await go(p, 'packing');
  await p.getByRole('button', { name: /Split the rest fairly/ }).click(); await p.waitForTimeout(700);
  check('packing split toast', await vis(p.getByText(/Assigned \d+ item/)));
  await p.getByRole('tab', { name: 'Mine' }).click(); await p.waitForTimeout(500);
  check('mine filter shows my items', await vis(p.getByText(/Me$/)));
  // ---- Recap
  await go(p, 'recap');
  check('recap story card', await vis(p.getByLabel(/Story card/)));
  await p.getByRole('button', { name: /Share story card/ }).click(); await p.waitForTimeout(700);
  check('share sheet opens', await vis(p.getByText(/WhatsApp/)));
  await p.keyboard.press('Escape');
  // ---- How it works + help
  await go(p, 'how-it-works');
  check('how it works rubric map', await vis(p.getByText(/Rubric/i)));
  // ---- Language
  await go(p, 'settings');
  await p.getByRole('button', { name: /Español/ }).click(); await p.waitForTimeout(700);
  await go(p, ''); // settings has no tab bar: look at the tabs on Home
  await p.getByRole('tab', { name: 'Inicio' }).waitFor({ timeout: 3000 }).then(() => check('language switches tabs', true)).catch(() => check('language switches tabs', false));
  await go(p, 'settings');
  await p.getByRole('button', { name: /English/ }).click().catch(() => {}); await p.waitForTimeout(600);
  // ---- Demo timeline: in progress -> Today card
  await go(p, 'settings');
  await p.getByLabel('Advanced settings').click(); await p.waitForTimeout(400); // the demo timeline is folded under Advanced
  await p.mouse.move(195, 500); await p.mouse.wheel(0, 1500); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /in progress/i }).first().click().catch(() => {}); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Rebuild|Reset|Confirm|Apply/ }).last().click().catch(() => {}); await p.waitForTimeout(800);
  await go(p, '');
  check('active trip headline', await vis(p.getByText(/living it/i)));
  check('today card on home', await vis(p.getByText(/Today · Day \d of 6/)));
  // ---- Join
  await go(p, 'join');
  await p.getByRole('button', { name: /^Join/ }).first().click().catch(() => {});
  await p.getByPlaceholder(/ABC|TKY|code/i).first().fill('SEO-5521').catch(() => {});
  await p.getByRole('button', { name: /Join trip|Join$/ }).last().click().catch(() => {}); await p.waitForTimeout(1200);
  check('join SEO-5521', await vis(p.getByText(/Seoul/)));
  console.log(results.join('\n'));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 600)); process.exit(1); });
