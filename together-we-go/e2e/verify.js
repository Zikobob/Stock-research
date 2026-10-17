const { fixture, start } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const tab = (p, n) => p.getByRole('tab', { name: n, exact: true }).click().then(() => p.waitForTimeout(1100));
(async () => {
  const { b, p, errors } = await start();
  // ---- Home
  check('home headline countdown', await vis(p.getByText(/days to go/i)));
  check('home weather tile', await vis(p.getByLabel(/Weather in Positano/)));
  check('home budget card', await vis(p.getByText('$2,086')));
  check('home quick tile Vote (2)', await vis(p.getByLabel('Vote (2)')));
  await p.getByLabel(/Showing (night|day)/).click(); await p.waitForTimeout(500);
  check('day/night toggle flips', await vis(p.getByLabel(/Showing (night|day)\. Tap for/)));
  await p.getByLabel(/Invite code AML-2026/).click(); await p.waitForTimeout(500);
  check('invite code copy toast', await vis(p.getByText(/Invite code AML-2026 copied/)));
  // ---- Plan
  await tab(p, 'Plan');
  check('plan lists confirmed dinner', await vis(p.getByText('Dinner at Da Vincenzo')));
  check('plan hides voting items', !(await vis(p.getByText('Limoncello tasting'), 600)));
  await p.getByLabel('Show filters').click(); await p.waitForTimeout(300); // the kind and length filters start folded away
  await p.getByRole('button', { name: /Food$/ }).first().click().catch(() => {}); await p.waitForTimeout(400);
  check('category filter hides hike', !(await vis(p.getByText('Path of the Gods hike'), 600)));
  await p.getByRole('button', { name: 'All', exact: true }).first().click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /^Under 1 hour/ }).click(); await p.waitForTimeout(400);
  check('time filter under 1 hour keeps the 30-minute check-in', await vis(p.getByText('Check-in — Villa Margherita')));
  check('time filter under 1 hour hides the 2-hour dinner', !(await vis(p.getByText('Dinner at Da Vincenzo'), 600)));
  await p.getByRole('button', { name: /Any length/ }).click(); await p.waitForTimeout(300);
  await p.getByRole('tab', { name: /Vote/ }).click(); await p.waitForTimeout(600);
  check('vote tab lists limoncello', await vis(p.getByText('Limoncello tasting')));
  await p.getByRole('button', { name: /Lock in Limoncello/ }).click(); await p.waitForTimeout(500);
  check('lock in toast', await vis(p.getByText(/Locked in: Limoncello/)));
  check('vote count drops to 1', await vis(p.getByRole('tab', { name: /Vote \(1\)/ })));
  await p.getByLabel(/I’m in\. 0 of 4/).first().click(); await p.waitForTimeout(400);
  check('vote pill toggles to 1/4', await vis(p.getByLabel(/I’m in\. 1 of 4/)));
  await p.getByRole('tab', { name: 'Itinerary' }).click(); await p.waitForTimeout(500);
  check('locked item now in itinerary', await vis(p.getByText('Limoncello tasting')));
  // add activity validation
  await p.getByLabel('Add activity').first().click(); await p.waitForTimeout(800);
  await p.getByTestId('add-activity-submit').click(); await p.waitForTimeout(400);
  check('add-activity validation errors', await vis(p.getByText(/Enter a place/)));
  await p.getByTestId('activity-name').fill('Gelato run');
  await p.getByTestId('add-activity-submit').click(); await p.waitForTimeout(1000);
  check('activity added', await vis(p.getByText('Gelato run')));
  await p.getByLabel('Delete Gelato run').click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Delete', exact: true }).last().click(); await p.waitForTimeout(600);
  check('activity deleted', !(await vis(p.getByText('Gelato run'), 600)));
  // reminder bell
  await p.getByLabel(/Turn reminder (on|off)/).first().click().catch(() => {}); await p.waitForTimeout(500);
  check('reminder toast', await vis(p.getByText(/Reminder (on|turned off)/)));
  // ---- Budget
  await tab(p, 'Budget');
  check('budget per person', await vis(p.getByText('$522')));
  check('budget daily allowance', await vis(p.getByText('$319')));
  check('who owes who: treasurer gets back', await vis(p.getByText(/gets back \$1,129/)));
  await p.getByRole('tab', { name: /Local/ }).click(); await p.waitForTimeout(500);
  check('local view shows euros', await vis(p.getByText(/€/)));
  await p.getByRole('tab', { name: /^Home ·/ }).click();
  await p.getByTestId('add-expense-open').click(); await p.waitForTimeout(700);
  await p.getByTestId('add-expense').click(); await p.waitForTimeout(400);
  check('expense validation', await vis(p.getByText(/what it was for|Enter an amount|amount/i)));
  await p.getByTestId('expense-title').fill('Gelato');
  await p.getByTestId('expense-amount').fill('12.5');
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.getByRole('button', { name: /Attach receipt/ }).click()]);
  if (fc) { await fc.setFiles(fixture('receipt.jpg')); await p.waitForTimeout(900); }
  check('receipt attach thumbnail', !!fc && await vis(p.getByLabel(/receipt/i), 1500));
  await p.getByTestId('add-expense').click(); await p.waitForTimeout(800);
  check('expense added toast', await vis(p.getByText(/Added \$13|Added \$12/)));
  await p.getByLabel('Settle up').first().click().catch(async () => { await p.getByRole('button', { name: /Settle up/ }).first().click(); }); await p.waitForTimeout(600);
  check('settle sheet lists payments', await vis(p.getByText(/pays/)));
  await p.getByRole('button', { name: 'Mark paid' }).first().click(); await p.waitForTimeout(500);
  check('settle recorded', await vis(p.getByText(/Payment recorded/)));
  await p.keyboard.press('Escape');
  // ---- Chat
  await tab(p, 'Chat');
  await p.getByTestId('chat-input').fill('Anyone up for gelato?'); await p.getByTestId('chat-send').click(); await p.waitForTimeout(500);
  check('crew message sent', await vis(p.getByText('Anyone up for gelato?')));
  await p.getByRole('tab', { name: 'Scout AI' }).click(); await p.waitForTimeout(500);
  await p.getByTestId('chat-input').fill('Who owes who?'); await p.getByTestId('chat-send').click(); await p.waitForTimeout(2200);
  check('scout ai answers offline', await vis(p.getByText(/owes|gets|square/i)));
  check('ai message not in crew tab', await (async () => { await p.getByRole('tab', { name: 'Crew' }).click(); await p.waitForTimeout(500); return !(await vis(p.getByText('Who owes who?'), 600)); })());
  // ---- More
  await tab(p, 'More');
  for (const [label, expect] of [['Crew & roles', /Invite code|CREW/i], ['Flights & arrivals', /Flights/i], ['Packing list', /Packing/i], ['Trip recap', /Recap/i]]) {
    await p.getByRole('button', { name: new RegExp(label) }).first().click(); await p.waitForTimeout(1000);
    check(`more → ${label}`, await vis(p.getByText(expect)));
    await p.goBack(); await p.waitForTimeout(900);
    if (!(await vis(p.getByText('Maya Chen'), 800))) { await tab(p, 'More'); }
  }
  console.log(results.join('\n'));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 500)); process.exit(1); });
