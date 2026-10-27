const { BASE, start } = require('./lib');
(async () => {
  let { b, p } = await start();
  await p.goto(BASE + '/flights', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.getByTestId('add-flight').click(); await p.waitForTimeout(700);
  await p.getByPlaceholder('ANA').fill('Delta'); await p.getByPlaceholder('NH 175').fill('DL 99'); await p.getByPlaceholder('JFK').fill('BOS');
  await p.getByRole('button', { name: 'Save flight' }).click(); await p.waitForTimeout(900);
  const txt = await p.evaluate(() => document.body.innerText);
  console.log(txt.slice(0, 1800));
  await p.screenshot({ path: process.argv[2] || '/tmp/dbg.png' });
  await b.close();
})();
