// Prints SQL for a demo club (code DEMO01): 3 admins + 12 members, all with password "demo1234".
// Use on an EMPTY local database:  npm run seed   (see README). Prices match the built-in demo market.
const PRICES = { SPY: 520, QQQ: 450, VTI: 265, AAPL: 190, MSFT: 420, NVDA: 120, DIS: 105, NKE: 95, KO: 62, MCD: 290, COST: 800, JPM: 200 };
const SYMS = Object.keys(PRICES);
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
const q = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const insert = (t, o) => `INSERT INTO ${t} (${Object.keys(o).join(',')}) VALUES (${Object.values(o).map(q).join(',')});`;
const now = Math.floor(Date.now() / 1000), START = 10000000;
const out = [];

out.push(insert('club', { id: 1, name: 'Demo Investment Club', code: 'DEMO01', code_on: 1, need_approval: 0, season: 1, settings: '{}', created: now - 40 * 86400 }));
const people = [['Ms. Rivera', 'owner'], ['Treasurer Tom', 'admin'], ['Vice Vee', 'admin'],
  ...['Maya', 'Diego', 'Priya', 'Noah', 'Ana', 'Sam', 'Jordan', 'Lee', 'Riley', 'Kai', 'Zoe', 'Omar'].map((n) => [n, 'member'])];
for (const [i, [name, role]] of people.entries()) {
  const salt = `demo-salt-${i}`;
  out.push(insert('users', { id: i + 1, name, salt, hash: await hash('demo1234', salt), role, status: 'active', created: now - 39 * 86400 }));
}

// Each portfolio: a few positions bought at a price near today's demo price, one filled order per position.
const CLASS_ID = people.length + 1;
let orderId = 1;
const holdings = {}, tail = []; // positions/orders go after their portfolio rows (foreign keys)
const build = (pfId, userId, n, maxFrac) => {
  let cash = START; holdings[pfId] = [];
  for (const sym of [...SYMS].sort(() => rnd() - 0.5).slice(0, n)) {
    const px = Math.round(PRICES[sym] * (0.9 + rnd() * 0.2) * 100);
    const shares = Math.max(1, Math.floor((START * maxFrac * rnd()) / px));
    const cost = shares * px;
    if (cost > cash) continue;
    cash -= cost;
    holdings[pfId].push({ sym, shares, cost });
    tail.push(insert('positions', { portfolio_id: pfId, symbol: sym, shares, cost_cents: cost }));
    tail.push(insert('orders', { id: orderId++, portfolio_id: pfId, user_id: userId, symbol: sym, side: 'buy', shares, type: 'market', status: 'filled', fill_cents: px, created: now - 20 * 86400, filled: now - 20 * 86400 }));
  }
  return cash;
};
const cashes = {};
for (let i = 1; i <= people.length; i++) {
  cashes[i] = build(i, i, 2 + Math.floor(rnd() * 3), 0.18);
  out.push(insert('portfolios', { id: i, user_id: i, season: 1, cash_cents: cashes[i], start_cents: START }));
}
cashes[CLASS_ID] = build(CLASS_ID, 1, 4, 0.1);
out.push(insert('portfolios', { id: CLASS_ID, user_id: null, season: 1, cash_cents: cashes[CLASS_ID], start_cents: START }));

out.push(...tail);

// Class requests: executed ones match the class holdings so "best pitches" has data.
const reqs = holdings[CLASS_ID].map((h, i) => ({ sym: h.sym, who: 4 + i, fill: Math.round(h.cost / h.shares) }));
const thesis = ['Strong earnings and a growing product line.', 'Broad diversification at a tiny fee.', 'Brand we all use every day.', 'Steady dividend and low risk.'];
reqs.forEach((r, i) => out.push(insert('requests', { id: i + 1, user_id: r.who, season: 1, symbol: r.sym, side: 'buy', shares: holdings[CLASS_ID][i].shares, type: 'market', thesis: thesis[i], risk: 'Prices can fall.', status: 'executed', decided_by: 1, created: now - 22 * 86400, expires: now - 15 * 86400, fill_cents: r.fill, executed: now - 20 * 86400 })));
const n = reqs.length;
out.push(insert('requests', { id: n + 1, user_id: 9, season: 1, symbol: 'NKE', side: 'buy', amount_cents: 500000, type: 'market', thesis: 'Sneaker sales should rebound with the new season.', risk: 'Weak China demand.', status: 'open', created: now - 3600, expires: now + 6 * 86400 }));
out.push(insert('requests', { id: n + 2, user_id: 10, season: 1, symbol: 'DIS', side: 'buy', shares: 20, type: 'market', thesis: 'Streaming is finally profitable.', status: 'rejected', decided_by: 2, note: 'Too much media exposure already.', created: now - 5 * 86400, expires: now + 2 * 86400 }));
out.push(insert('comments', { request_id: n + 1, user_id: 5, body: 'What is the P/E compared to Adidas?', created: now - 1800 }));
out.push(insert('comments', { request_id: n + 1, user_id: 9, body: 'Roughly 25, a bit above its average.', created: now - 900 }));

// 30 weekdays of snapshots (a gentle random walk; the demo only, real snapshots come from the site itself)
let cls = START, spy = PRICES.SPY * 100, mine = {};
const days = [];
for (let d = 45; d >= 0; d--) { const t = new Date((now - d * 86400) * 1000); if (![0, 6].includes(t.getUTCDay())) days.push(t.toISOString().slice(0, 10)); }
for (const day of days.slice(-30)) {
  spy = Math.round(spy * (1 + (rnd() - 0.48) * 0.012)); cls = Math.round(cls * (1 + (rnd() - 0.46) * 0.012));
  out.push(insert('snapshots', { portfolio_id: CLASS_ID, day, equity_cents: cls, spy_cents: spy }));
  for (let i = 1; i <= people.length; i++) { mine[i] = Math.round((mine[i] || START) * (1 + (rnd() - 0.47) * 0.015)); out.push(insert('snapshots', { portfolio_id: i, day, equity_cents: mine[i], spy_cents: spy })); }
}
const feed = ['Maya joined the club', 'Diego joined the club', 'Class portfolio: bought 30 VTI at $262.10', 'Noah asked the class to buy NKE'];
feed.forEach((t, i) => out.push(insert('activity', { ts: now - (feed.length - i) * 7200, season: 1, text: t })));
console.log(out.join('\n'));
