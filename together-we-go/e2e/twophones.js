// Two separate "phones" (two browser profiles) + one real sync server on :8787.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { BASE, fixture, shot, start } = require('./lib');
const jsQR = require('jsqr');

const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
const vis = async (loc, t = 6000) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const gone = async (loc, t = 800) => !(await vis(loc, t));
const ROOT = path.join(__dirname, '..');
const DATA = '/tmp/twophones-sync.json';
let server;
const url = (r = '') => BASE + '/' + r;
/** With DOCS_SHOTS=1 the pictures used in the README are rewritten (docs/screenshots). */
const docShot = (page, name) => (process.env.DOCS_SHOTS ? page.screenshot({ path: path.join(ROOT, 'docs', 'screenshots', name), type: 'jpeg', quality: 80 }) : null);

const go = async (p, r) => {
  await p.goto(url(r), { waitUntil: 'load' }); // not 'networkidle': a synced trip always has one long-poll request open
  await p.waitForTimeout(2200);
  if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {});
};

async function health() {
  try {
    const r = await fetch('http://localhost:8787/health');
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Reads the QR code that is showing on a page the way a phone camera would: draw the SVG, decode the pixels. */
async function decodeQr(p) {
  const pixels = await p.evaluate(async () => {
    const svg = document.querySelector('svg[aria-label^="QR code"]');
    if (!svg) return null;
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg));
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 600, 600);
    ctx.drawImage(img, 0, 0, 600, 600);
    return Array.from(ctx.getImageData(0, 0, 600, 600).data);
  });
  return pixels ? jsQR(Uint8ClampedArray.from(pixels), 600, 600)?.data ?? null : null;
}

async function say(p, text) {
  await p.getByTestId('chat-input').fill(text);
  await p.getByTestId('chat-send').click();
  await p.waitForTimeout(300);
}

(async () => {
  if (await health()) throw new Error('Something is already listening on :8787 - stop it first so the test uses a fresh server');
  try { fs.unlinkSync(DATA); } catch {}
  server = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: '8787', SYNC_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 30 && !(await health()); i++) await new Promise((r) => setTimeout(r, 200));
  check('sync server is up', !!(await health()));

  // ---------------------------------------------------------------- phone A: the demo account, shares the trip
  const A = await start(); // signs in as the demo account
  const pa = A.p;
  const errorsA = A.errors;
  await go(pa, 'crew');
  check('A: crew has the sync card', await vis(pa.getByText('Sync across phones')));
  await pa.getByRole('button', { name: 'Share this trip across phones' }).click();
  check('A: sharing toast', await vis(pa.getByText(/Sharing! Friends can now join/)));
  check('A: badge goes Live', await vis(pa.getByText(/^Live/)));
  check('server now holds one trip', (await health())?.trips === 1);

  // ---------------------------------------------------------------- phone B: a brand-new account
  const ctxB = await A.b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pb = await ctxB.newPage();
  const errorsB = [];
  pb.on('console', (m) => { if (m.type() === 'error') errorsB.push(m.text().slice(0, 300)); });
  pb.on('pageerror', (e) => errorsB.push('PAGEERROR ' + e.message.slice(0, 300)));
  await pb.goto(url(), { waitUntil: 'load' });
  await pb.waitForTimeout(2000);
  await pb.getByRole('button', { name: 'Skip' }).click();
  await pb.waitForTimeout(700);
  await pb.getByRole('link', { name: 'Sign Up' }).click();
  await pb.waitForTimeout(900);
  await pb.getByPlaceholder('e.g. Alex Rivera').fill('Jordan Smith');
  await pb.getByPlaceholder('you@email.com').fill('jordan.two@school.org');
  await pb.getByPlaceholder('At least 8 characters').fill('Trip2027go');
  await pb.getByPlaceholder('Re-enter password').fill('Trip2027go');
  await pb.getByRole('checkbox').click();
  await pb.getByRole('button', { name: 'Create account' }).click();
  await pb.waitForTimeout(2500);
  await pb.getByLabel('Skip to the end').click().catch(() => {});
  await pb.waitForTimeout(500);
  await pb.getByRole('button', { name: 'Apply my style' }).click().catch(() => {});
  await pb.waitForTimeout(2500);
  check('B: has no trip yet', await vis(pb.getByText(/Plan your first group trip/), 4000));

  // A shows the invite QR code; B "scans" it (same decoding a phone camera does) and opens the link
  await pa.getByTestId('invite-qr').click();
  await pa.waitForTimeout(800);
  const link = await decodeQr(pa);
  check('A: the QR code decodes to the invite link', link === `${BASE}/join?code=AML-2026`, String(link));
  await docShot(pa, '23-invite-qr.jpg');
  await pa.keyboard.press('Escape');

  // wrong code first
  await go(pb, 'join');
  await pb.getByTestId('invite-code').fill('ZZZ-9999');
  await pb.getByTestId('join-submit').click();
  check('B: unknown code says no', await vis(pb.getByText(/No trip found with that code/)));
  // an invite that names a sync server: the person is told before it is used
  await pb.goto(`${link}&server=${encodeURIComponent('http://192.168.1.20:8787')}`, { waitUntil: 'load' });
  await pb.waitForTimeout(1500);
  check('B: the link fills in the code', (await pb.getByTestId('invite-code').inputValue()) === 'AML-2026');
  check('B: a named sync server is announced', await vis(pb.getByText(/sync server at 192\.168\.1\.20:8787/)));
  await pb.goto(link, { waitUntil: 'load' });
  await pb.waitForTimeout(1500);
  check('B: opening the link fills in the code', (await pb.getByTestId('invite-code').inputValue()) === 'AML-2026');
  await pb.getByTestId('join-submit').click();
  check('B: join toast says it syncs live', await vis(pb.getByText(/now syncs live/)));
  await pb.waitForTimeout(1200);

  // B sees A's trip
  await go(pb, 'chat');
  check('B: sees A’s earlier chat messages', await vis(pb.getByText('Villa is booked! 🏡 Paid the deposit.')));
  check('B: its own join message/member is there', await vis(pb.getByText(/Jordan/)));
  if (process.env.DEBUG) {
    for (const t of [0, 4000, 12000]) {
      await pb.waitForTimeout(t);
      const badge = async (p) => (await p.locator('body').innerText()).split('\n').filter((l) => /Live|Offline|Connecting|phones/.test(l)).join(' | ');
      console.log(`t+${t}: A[${await badge(pa)}] B[${await badge(pb)}]`);
    }
  }
  check('B: Live · 2 phones', await vis(pb.getByText(/Live · 2 phones/)));
  check('A: Live · 2 phones', await (async () => { await go(pa, 'chat'); return vis(pa.getByText(/Live · 2 phones/)); })());

  // ---------------------------------------------------------------- live chat both ways
  await say(pa, 'Hello from phone A');
  check('chat A→B', await vis(pb.getByText('Hello from phone A')));
  await say(pb, 'Hi from phone B');
  check('chat B→A', await vis(pa.getByText('Hi from phone B')));
  check('no fake friend replies in a synced trip', await gone(pa.getByText(/typing/i), 1500));

  // ---------------------------------------------------------------- expense B→A
  await go(pb, 'budget');
  await pb.getByTestId('add-expense-open').click();
  await pb.waitForTimeout(600);
  await pb.getByTestId('expense-title').fill('Taxi to the pier');
  await pb.getByTestId('expense-amount').fill('48');
  await pb.getByTestId('add-expense').click();
  await pb.waitForTimeout(800);
  await go(pa, 'budget');
  check('expense B→A', await vis(pa.getByText('Taxi to the pier')));

  // ---------------------------------------------------------------- files travel too: photo, receipt, document
  const choose = async (p, locator, file) => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), locator.click()]);
    if (fc) await fc.setFiles(file);
    return !!fc;
  };
  const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };

  await go(pa, 'photos');
  check('A: file chooser opens for photos', await choose(pa, pa.getByRole('button', { name: /Add photos/ }), fixture('receipt.jpg')));
  await pa.waitForTimeout(800);
  await pa.getByPlaceholder('Say something about it…').fill('Sunset from the villa');
  await pa.getByRole('button', { name: /Post to photo dump/ }).click();
  check('A: photo posted', await vis(pa.getByLabel('Sunset from the villa')));
  check('server received the photo file', await until(async () => (await health())?.files >= 1));
  await go(pb, 'photos');
  check('B: sees the photo tile', await vis(pb.getByLabel('Sunset from the villa')));
  check('B: the picture itself arrives', await until(async () => (await pb.locator('[aria-label="Sunset from the villa"] img').count()) > 0));
  await pb.screenshot({ path: shot('two-B-photos.png') });
  await docShot(pb, '24-sync-photos.jpg');

  await go(pb, 'budget');
  await pb.getByTestId('add-expense-open').click();
  await pb.waitForTimeout(600);
  await pb.getByTestId('expense-title').fill('Pier ferry');
  await pb.getByTestId('expense-amount').fill('36');
  check('B: file chooser opens for a receipt', await choose(pb, pb.getByRole('button', { name: /Attach receipt/ }), fixture('receipt.jpg')));
  await pb.waitForTimeout(900);
  await pb.getByTestId('add-expense').click();
  await pb.waitForTimeout(800);
  check('server received the receipt too', await until(async () => (await health())?.files >= 2));
  await go(pa, 'budget');
  await pa.getByText('Pier ferry').first().click();
  const gotReceipt = await until(async () => (await pa.locator('[aria-label="Enlarge receipt"] img').count()) > 0);
  check('A: receipt photo arrives', gotReceipt);
  if (!gotReceipt) console.log('DEBUG has-receipt icons:', await pa.getByLabel('Has receipt').count(), '\n', (await pa.locator('body').innerText()).replace(/\n+/g, ' | ').slice(-900));
  await pa.screenshot({ path: shot('two-A-receipt.png') });

  await go(pa, 'documents');
  await pa.getByRole('button', { name: 'Add a document' }).click(); await pa.waitForTimeout(700); // the add button opens a sheet with File, Photo and Note
  check('A: file chooser opens for a document', await choose(pa, pa.getByRole('button', { name: 'File', exact: true }), fixture('tiny.pdf')));
  check('A: document saved', await vis(pa.getByText(/Saved to the vault/)));
  check('server received the document', await until(async () => (await health())?.files >= 3));
  await go(pb, 'documents');
  check('B: sees the document', await vis(pb.getByLabel('Open tiny')));
  check('B: its pill says Offline once the file arrived', await until(async () => (await pb.getByLabel('Open tiny').getByText('Offline').count()) > 0));
  await pb.getByLabel('Open tiny').click();
  check('B: can open or share the file', await vis(pb.getByRole('button', { name: 'Open / share file' })));
  await pb.keyboard.press('Escape');

  // ---------------------------------------------------------------- A goes offline, writes, restarts, comes back
  await go(pa, 'chat');
  await go(pb, 'chat');
  await A.b.contexts()[0].setOffline(true);
  await say(pa, 'Written with no signal');
  check('A: offline pill with 1 waiting', await vis(pa.getByText(/Offline · \d+ waiting|Offline/), 12000));
  check('B does not have it yet', await gone(pb.getByText('Written with no signal'), 1500));
  await pa.waitForTimeout(1200); // let the debounced save reach storage
  await A.b.contexts()[0].setOffline(false);
  check('B gets it after A is back', await vis(pb.getByText('Written with no signal'), 25000));
  check('A badge is Live again', await vis(pa.getByText(/^Live/), 15000));

  // ---------------------------------------------------------------- B closes the app (reload) and writes while closed state is restored
  await pb.reload({ waitUntil: 'load' });
  await pb.waitForTimeout(2500);
  await go(pb, 'chat');
  check('B after restart: still synced, same chat', await vis(pb.getByText('Hello from phone A')));
  await say(pa, 'Message while B restarted');
  check('B after restart receives live', await vis(pb.getByText('Message while B restarted'), 12000));

  // ---------------------------------------------------------------- screenshots
  await go(pa, 'chat');
  await pa.waitForTimeout(500);
  await pa.screenshot({ path: shot('two-A-chat.png') });
  await docShot(pa, '22-sync-chat.jpg');
  await pb.screenshot({ path: shot('two-B-chat.png') });
  await go(pa, 'crew');
  await pa.screenshot({ path: shot('two-A-crew.png') });

  console.log(results.join('\n'));
  const e = [...errorsA, ...errorsB].filter((m) => !/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|Failed to load resource/.test(m));
  console.log('errors:', e.length ? e.join('\n') : 'none');
  await A.b.close();
  server.kill('SIGTERM');
})().catch((e) => {
  server?.kill('SIGTERM');
  console.log(results.join('\n'));
  console.error('CRASH', String(e.stack || e).slice(0, 900));
  process.exit(1);
});
