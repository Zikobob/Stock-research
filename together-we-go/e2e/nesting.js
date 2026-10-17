// Looks for a button inside another button (or a link inside a link) on every screen. A browser lets you do it, React warns about it
// ("<button> cannot contain a nested <button>"), and keyboards and screen readers cannot use such a control properly.
const { BASE, ROUTES, start, nestedControls } = require('./lib');

(async () => {
  const failures = [];
  let screens = 0;
  const audit = async (page, where) => {
    screens++;
    for (const f of await nestedControls(page)) failures.push(`FAIL  ${where}: ${f}`);
  };

  const { b, p, errors } = await start({ beforeSignIn: (page) => audit(page, 'the sign-in screen') });
  const open = async (path) => {
    await p.goto(BASE + '/' + path, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
  };

  for (const r of [...ROUTES, 'panorama']) {
    await open(r);
    await audit(p, '/' + r);
  }

  // screens that only show something after a tap (each step waits for what it expects, so a page that did not change is not audited by mistake)
  const expect = (label) => p.getByLabel(label).first().waitFor({ state: 'visible', timeout: 5000 });
  await open('itinerary');
  await p.getByLabel(/, \d+ of \d+ in$/).first().click();
  await expect('Assign');
  await audit(p, 'an opened activity card');
  await p.getByRole('tab', { name: /Vote/ }).click();
  await expect(/^Lock in /);
  await audit(p, 'the Vote tab');
  await open('itinerary');
  await p.getByLabel('Add activity').first().click();
  await p.getByTestId('activity-name').fill('vincenzo');
  await expect(/^Da Vincenzo, /);
  await p.getByLabel('More options').click();
  await expect('Address (optional)');
  await audit(p, 'the Add Activity sheet with matches and more options');
  await open('itinerary');
  await p.getByLabel('Show filters').click();
  await audit(p, 'the Plan with filters open');
  await open('settings');
  await p.getByLabel('Advanced settings').click();
  await expect('Test connection');
  await audit(p, 'Settings with Advanced open');
  await open('personalize');
  await p.getByLabel('Skip to the end').click();
  await expect('Apply my style');
  await audit(p, 'the last page of Make it yours');
  await open('survey');
  for (let i = 0; i < 5; i++) { await p.locator('button').filter({ hasText: /\p{Extended_Pictographic}/u }).first().click(); await p.waitForTimeout(250); }
  await p.getByText('Your matches').first().waitFor({ state: 'visible', timeout: 5000 });
  await audit(p, 'the survey matches');

  console.log(failures.length ? failures.join('\n') : `PASS  no button or link sits inside another one (${screens} screens and states checked)`);

  // React itself only complains in a development build (point E2E_URL at `npx expo start --web`), so this part is skipped on the exported app
  if (await p.evaluate(() => typeof __DEV__ !== 'undefined' && __DEV__)) {
    const warned = errors.filter((e) => /cannot contain a nested|cannot be a descendant of/.test(e));
    console.log(warned.length ? warned.map((w) => `FAIL  React warned: ${w.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n') : 'PASS  React printed no invalid-nesting warnings');
  }

  // prove the check can fail: plant a button inside a button and look again
  await p.evaluate(() => {
    const outer = document.createElement('button'); outer.setAttribute('aria-label', 'planted outer');
    const inner = document.createElement('button'); inner.setAttribute('aria-label', 'planted inner');
    outer.appendChild(inner); document.body.appendChild(outer);
  });
  const seen = await nestedControls(p);
  console.log(`${seen.some((s) => s.includes('planted outer') && s.includes('planted inner')) ? 'PASS' : 'FAIL'}  the check notices a button planted inside a button`);
  await b.close();
})().catch((e) => { console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
