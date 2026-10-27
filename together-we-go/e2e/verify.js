const { fixture, start } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const tab = (p, n) => p.getByRole('tab', { name: n, exact: true }).click().then(() => p.waitForTimeout(1100));
(async () => {
  const { b, p, errors } = await start();
  // ---- Home
  // the ticket: "3" on the flip board with "Days to go" beside it; the header reads as one sentence
  check('home ticket countdown words', await vis(p.getByText('Days to go')));
  check('home countdown heading "3 days to go"', await vis(p.getByRole('heading', { name: '3 days to go' })));
  check('home up next ticket', await vis(p.getByText('Arrive at Naples Airport (NAP)')));
  check('home up next countdown stamp', await vis(p.getByLabel(/^in \d+d \d+h$/i)));
  check('home up next maps button', await vis(p.getByLabel('Open in maps')));
  check('home weather board', await vis(p.getByLabel(/(Typical weather|Forecast) in Positano\. Open the weather/)));
  check('home budget amount', await vis(p.getByText('$2,086')));
  check('home budget state stamp', await vis(p.getByLabel('On track', { exact: true })));
  check('home vote row says 2 things', await vis(p.getByLabel(/2 things to vote on/)));
  check('home crew count', await vis(p.getByLabel(/4 going\. Open the crew/)));
  await p.getByLabel(/Showing (night|day)/).click(); await p.waitForTimeout(500);
  check('day/night toggle flips', await vis(p.getByLabel(/Showing (night|day)\. Tap for/)));
  await p.getByLabel(/Invite code AML-2026/).click(); await p.waitForTimeout(500);
  check('invite code copy toast', await vis(p.getByText(/Invite code AML-2026 copied/)));
  await p.getByRole('button', { name: 'Invite', exact: true }).click(); await p.waitForTimeout(500);
  check('crew Invite button copies the code', await vis(p.getByText(/Invite code AML-2026 copied/)));
  // today's trivia: the question changes every day, so answer the first option and look for the verdict and the fact
  await p.getByLabel(/^A\. /).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.getByLabel(/^A\. /).first().click(); await p.waitForTimeout(700);
  check('trivia shows a verdict', await vis(p.getByText(/^(Correct|Not quite)$/)));
  check('trivia marks the right answer', await vis(p.getByLabel(/\. (Correct|The right answer)$/)));
  check('trivia locks the other answers', await p.getByLabel(/^B\. /).first().isDisabled().catch(() => false));
  // the podium opens the crew; the vote card takes a vote and says so (a no, so the Plan checks below still see 0 of 4)
  check('home podium', await vis(p.getByLabel(/^Crew points\. 1st/)));
  await p.getByLabel('Not for me', { exact: true }).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  check('home vote card shows an activity', await vis(p.getByText(/yes votes to lock it in/)));
  await p.getByLabel('Not for me', { exact: true }).click(); await p.waitForTimeout(600);
  check('home vote counted stamp', await vis(p.getByLabel('Vote counted', { exact: true })));
  await p.getByLabel('Customize this page').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  check('home customize link', await vis(p.getByLabel('Customize this page')));
  // ---- Plan
  await tab(p, 'Plan');
  check('plan lists confirmed dinner', await vis(p.getByText('Dinner at Da Vincenzo')));
  check('plan hides voting items', !(await vis(p.getByText('Limoncello tasting'), 600)));
  // a day with nothing confirmed (day 4 only has ideas up for a vote) is an invitation with one Add button, and the floating Add steps aside
  await p.getByRole('tab', { name: /^Day 4,/ }).click(); await p.waitForTimeout(500);
  check('an empty day invites you to add something', await vis(p.getByText('Nothing planned for Day 4')));
  check('an empty day says ideas wait on the Vote tab', await vis(p.getByText(/waiting on the Vote tab/)));
  check('only one Add button on an empty day', (await p.getByLabel('Add activity').filter({ visible: true }).count()) === 1);
  await p.getByRole('tab', { name: 'All days' }).click(); await p.waitForTimeout(400);
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
  // closing the sheet by accident keeps what was typed (a draft); it is there again when the sheet reopens
  await p.getByLabel('Close', { exact: true }).last().click({ position: { x: 20, y: 20 } }); await p.waitForTimeout(700);
  await p.getByLabel('Add activity').first().click(); await p.waitForTimeout(800);
  check('a half-typed activity survives closing the sheet', (await p.getByTestId('activity-name').inputValue()) === 'Gelato run');
  await p.getByTestId('add-activity-submit').click(); await p.waitForTimeout(1000);
  check('activity added', await vis(p.getByText('Gelato run')));
  await p.getByLabel('Add activity').first().click(); await p.waitForTimeout(800);
  check('the draft is cleared once the activity is added', (await p.getByTestId('activity-name').inputValue()) === '');
  await p.getByLabel('Close', { exact: true }).last().click({ position: { x: 20, y: 20 } }); await p.waitForTimeout(700);
  // Delete lives in the opened details of a stop (away from the reminder bell), so open the stop first
  await p.getByLabel(/^Gelato run, /).click(); await p.waitForTimeout(400);
  check('opened stop offers Assign, Directions, Done, Edit and Delete', await vis(p.getByLabel('Assign')) && await vis(p.getByLabel('Directions')) && await vis(p.getByLabel('Edit')) && await vis(p.getByLabel('Delete Gelato run')));
  await p.getByLabel('Delete Gelato run').click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Delete', exact: true }).last().click(); await p.waitForTimeout(600);
  check('activity deleted', !(await vis(p.getByText('Gelato run'), 600)));
  // reminder bell
  await p.getByLabel(/Turn reminder (on|off)/).first().click().catch(() => {}); await p.waitForTimeout(500);
  check('reminder toast', await vis(p.getByText(/Reminder (on|turned off)/)));
  // ---- Budget
  await tab(p, 'Budget');
  // the summary: money left as the big number on the ink pass, the stamp in words, per person and daily allowance in the stub
  check('budget left to spend', await vis(p.getByTestId('budget-left').filter({ hasText: '$1,914' })));
  check('budget spent line with percent', await vis(p.getByText(/Spent \$2,086 · 52%/i)));
  check('budget per person', await vis(p.getByText('$522')));
  check('budget daily allowance', await vis(p.getByText('$319')));
  // who owes who: a signed amount with a word, and a Settle up button
  check('who owes who: you owe', await vis(p.getByText(/owes \$382/)));
  check('who owes who: treasurer gets back', await vis(p.getByText(/gets back \$1,129/)));
  check('who owes who: row reads as a sentence', await vis(p.getByLabel('Priya gets back $1,129')));
  // expenses: grouped under day headings (Today / Yesterday / "Sun · Oct 11"), each a receipt line
  check('expenses grouped under day headings', await vis(p.getByText(/^(Today|Yesterday|[A-Z][a-z]{2}) · [A-Z][a-z]{2} \d{1,2}$/)));
  check('expense receipt line', await vis(p.getByLabel(/^Villa Margherita \(6 nights\), \$1,650$/)));
  await p.getByLabel(/^Villa Margherita/).click(); await p.waitForTimeout(700);
  check('expense details open', await vis(p.getByRole('button', { name: 'Delete expense' })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // changing the budget from the number itself
  await p.getByTestId('budget-cap-open').click(); await p.waitForTimeout(600);
  await p.getByTestId('budget-cap').fill('abc'); await p.getByTestId('budget-cap-save').click(); await p.waitForTimeout(300);
  check('budget cap validation', await vis(p.getByText(/Use numbers only|Enter a budget/)));
  await p.getByTestId('budget-cap').fill('4500'); await p.getByTestId('budget-cap-save').click(); await p.waitForTimeout(700);
  check('budget cap saved', await vis(p.getByText(/Budget set to \$4,500/)) && await vis(p.getByTestId('budget-left').filter({ hasText: '$2,414' })));
  await p.getByTestId('budget-cap-open').click(); await p.waitForTimeout(600);
  await p.getByTestId('budget-cap').fill('4000'); await p.getByTestId('budget-cap-save').click(); await p.waitForTimeout(700);
  await p.getByRole('tab', { name: /Local/ }).click(); await p.waitForTimeout(500);
  check('local view shows euros', await vis(p.getByText(/€/)));
  await p.getByRole('tab', { name: /^Home ·/ }).click();
  await p.getByTestId('add-expense-open').click(); await p.waitForTimeout(700);
  await p.getByTestId('add-expense').click(); await p.waitForTimeout(400);
  check('expense validation', await vis(p.getByText(/what it was for|Enter an amount|amount/i)));
  await p.getByTestId('expense-title').fill('Gelato');
  // a half-typed expense survives closing the sheet
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  await p.getByTestId('add-expense-open').click(); await p.waitForTimeout(700);
  check('half-typed expense is kept (draft)', (await p.getByTestId('expense-title').inputValue().catch(() => '')) === 'Gelato');
  check('category guessed from the words as one chip', await vis(p.getByRole('button', { name: 'Food', exact: true })));
  await p.getByTestId('expense-amount').fill('12.5');
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.getByRole('button', { name: /Attach receipt/ }).click()]);
  if (fc) { await fc.setFiles(fixture('receipt.jpg')); await p.waitForTimeout(900); }
  check('receipt attach thumbnail', !!fc && await vis(p.getByLabel(/receipt/i), 1500));
  await p.getByTestId('add-expense').click(); await p.waitForTimeout(800);
  check('expense added toast', await vis(p.getByText(/Added \$13|Added \$12/)));
  check('draft is cleared after adding', await (async () => { await p.getByTestId('add-expense-open').click(); await p.waitForTimeout(700); const v = await p.getByTestId('expense-title').inputValue().catch(() => 'x'); await p.keyboard.press('Escape'); await p.waitForTimeout(500); return v === ''; })());
  check('new expense is under Today', await vis(p.getByText(/^Today · /)));
  await p.getByLabel('Settle up').first().click().catch(async () => { await p.getByRole('button', { name: /Settle up/ }).first().click(); }); await p.waitForTimeout(600);
  check('settle sheet lists payments', await vis(p.getByText(/pays/)));
  check('settle sheet explains the fewest payments', await vis(p.getByText(/the fewest possible/)));
  await p.getByRole('button', { name: 'Mark paid' }).first().click(); await p.waitForTimeout(500);
  check('settle recorded', await vis(p.getByText(/Payment recorded/)));
  // the rest of the payments: the last one celebrates and stamps SETTLED (the sheet closes itself)
  for (let i = 0; i < 6 && await vis(p.getByRole('button', { name: 'Mark paid' }), 700); i++) { await p.getByRole('button', { name: 'Mark paid' }).first().click(); await p.waitForTimeout(700); }
  check('all settled celebration', await vis(p.getByText('All settled up')));
  check('settled stamp', await vis(p.getByLabel('Settled', { exact: true })));
  check('settle button gone once square', !(await vis(p.getByRole('button', { name: 'Settle up', exact: true }), 600)));
  await p.keyboard.press('Escape');
  // ---- Chat
  await tab(p, 'Chat');
  await p.getByTestId('chat-input').fill('Anyone up for gelato?'); await p.getByTestId('chat-send').click(); await p.waitForTimeout(500);
  check('crew message sent', await vis(p.getByText('Anyone up for gelato?')));
  check('chat shows a day heading and a clock time', await vis(p.getByText('Today', { exact: true })) && await vis(p.getByText(/^\d{1,2}:\d{2} (AM|PM)$/)));
  check('the send button is a real 44 point target', await p.getByTestId('chat-send').evaluate((el) => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
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
