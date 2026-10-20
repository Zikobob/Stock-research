// All API routes in one file. Plain functions, plain SQL (always with ? placeholders).
import { getQuotes, getQuote, getHistory, search, overview, health } from './market.js';
import * as T from './trade.js';

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => new HttpError(status, msg);
const cents = (dollars) => (dollars == null || Number.isNaN(dollars) ? null : Math.round(dollars * 100));
const nowSec = () => Math.floor(Date.now() / 1000);
const SYMBOL = /^[A-Z]{1,5}(\.[A-Z])?$/;

// ---------- crypto ----------
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const rand = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
async function hashPassword(password, salt) { // Workers cap PBKDF2 at 100,000 iterations
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret || 'dev-only-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0 O 1 I
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

// ---------- small helpers ----------
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const one = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).first();
const all = async (env, sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
const run = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).run();
const st = (env, sql, ...b) => env.DB.prepare(sql).bind(...b);

async function limit(env, key, max, seconds = 600) { // simple counter in KV
  const k = 'rl:' + key, n = Number(await env.KV.get(k)) || 0;
  if (n >= max) throw bad('Too many tries. Wait a few minutes and try again.', 429);
  await env.KV.put(k, String(n + 1), { expirationTtl: Math.max(60, seconds) });
}
const text = (v, min, max, what) => {
  const s = String(v ?? '').trim();
  if (s.length < min || s.length > max) throw bad(`${what} must be ${min === max ? min : `${min}-${max}`} characters`);
  return s;
};

async function getClub(env) {
  const c = await one(env, 'SELECT * FROM club WHERE id = 1');
  return c && { ...c, s: { ...T.DEFAULTS, ...JSON.parse(c.settings) } };
}
const act = (env, club, msg) => run(env, 'INSERT INTO activity (ts, season, text) VALUES (?, ?, ?)', nowSec(), club.season, msg);
const isAdmin = (u) => u.role === 'owner' || u.role === 'admin';

// ---------- sessions ----------
async function login(env, ctx, userId) {
  const token = rand();
  await run(env, 'INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)', await hmac(env.SESSION_SECRET, token), userId, nowSec() + 14 * 86400);
  const secure = ctx.url.protocol === 'https:' ? '; Secure' : '';
  ctx.cookie = `ct=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 86400}${secure}`;
}
async function sessionUser(env, req) {
  const m = /(?:^|;\s*)ct=([a-f0-9]{64})/.exec(req.headers.get('Cookie') || '');
  if (!m) return null;
  return one(env, `SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
                   WHERE s.token = ? AND s.expires > ? AND u.status = 'active'`, await hmac(env.SESSION_SECRET, m[1]), nowSec());
}

// ---------- portfolio math ----------
async function addUser(env, club, name, password, role, status) {
  const salt = rand(16);
  try {
    const r = await run(env, 'INSERT INTO users (name, salt, hash, role, status, created) VALUES (?, ?, ?, ?, ?, ?)', name, salt, await hashPassword(password, salt), role, status, nowSec());
    if (status === 'active') await newPersonal(env, club, r.meta.last_row_id);
    return r.meta.last_row_id;
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw bad('That display name is taken');
    throw e;
  }
}
const newPersonal = (env, club, userId) => run(env, 'INSERT INTO portfolios (user_id, season, cash_cents, start_cents) VALUES (?, ?, ?, ?)', userId, club.season, club.s.startCents, club.s.startCents);
const personalOf = (env, club, userId) => one(env, 'SELECT * FROM portfolios WHERE user_id = ? AND season = ?', userId, club.season);
const classOf = (env, club) => one(env, 'SELECT * FROM portfolios WHERE user_id IS NULL AND season = ?', club.season);

/** Total value (cash + holdings) for many portfolios using one batch of cached quotes. */
async function equities(env, pfs) {
  if (!pfs.length) return {};
  const rows = await all(env, `SELECT portfolio_id, symbol, shares, cost_cents FROM positions WHERE portfolio_id IN (${pfs.map(() => '?').join()})`, ...pfs.map((p) => p.id));
  const quotes = await getQuotes(env, rows.map((r) => r.symbol));
  const out = Object.fromEntries(pfs.map((p) => [p.id, p.cash_cents]));
  for (const r of rows) out[r.portfolio_id] += Math.round(r.shares * (cents(quotes[r.symbol]?.price) ?? Math.round(r.cost_cents / r.shares)));
  return out;
}

/** One portfolio with prices, P/L and weights, ready for the screen. */
async function valued(env, pf) {
  const pos = await all(env, 'SELECT symbol, shares, cost_cents FROM positions WHERE portfolio_id = ? ORDER BY symbol', pf.id);
  const quotes = await getQuotes(env, pos.map((p) => p.symbol));
  let stale = false;
  const rows = pos.map((p) => {
    const q = quotes[p.symbol];
    if (!q || q.stale) stale = true;
    const price = cents(q?.price) ?? Math.round(p.cost_cents / p.shares);
    const value = Math.round(p.shares * price);
    return { symbol: p.symbol, shares: p.shares, cost_cents: p.cost_cents, price_cents: price, value_cents: value,
      day_cents: Math.round(p.shares * (cents(q?.change) || 0)), pl_cents: value - p.cost_cents };
  });
  const equity = pf.cash_cents + rows.reduce((a, r) => a + r.value_cents, 0);
  rows.forEach((r) => { r.weight = equity ? r.value_cents / equity : 0; });
  return { id: pf.id, cash_cents: pf.cash_cents, start_cents: pf.start_cents, equity_cents: equity,
    day_cents: rows.reduce((a, r) => a + r.day_cents, 0), rows, stale };
}

// ---------- orders ----------
async function rejectOrder(env, o, why) {
  await run(env, "UPDATE orders SET status = 'rejected', note = ? WHERE id = ?", why, o.id);
  if (o.request_id) await run(env, "UPDATE requests SET status = 'rejected', note = ? WHERE id = ?", 'Could not execute: ' + why, o.request_id);
}

/** Fill one open order at the given market price (cents). Checks every rule again, then writes in one batch. */
async function fillOrder(env, club, o, quoteCents) {
  const pf = await one(env, 'SELECT * FROM portfolios WHERE id = ?', o.portfolio_id);
  const pos = await one(env, 'SELECT shares, cost_cents FROM positions WHERE portfolio_id = ? AND symbol = ?', pf.id, o.symbol);
  const price = T.fillPrice(quoteCents, o.side, club.s.slippageBps);
  let res;
  try { res = o.side === 'buy' ? T.applyBuy(pos, o.shares, price, club.s.commissionCents) : T.applySell(pos, o.shares, price, club.s.commissionCents); }
  catch (e) { return rejectOrder(env, o, e.message); }
  if (pf.cash_cents + res.cashDelta < 0) return rejectOrder(env, o, 'Not enough cash');
  if (pf.user_id === null && o.side === 'buy') {
    const v = await valued(env, pf);
    const held = v.rows.find((r) => r.symbol === o.symbol)?.value_cents || 0;
    const why = T.classBuyProblem({ equity: v.equity_cents, cash: pf.cash_cents, held, costCents: -res.cashDelta }, club.s);
    if (why) return rejectOrder(env, o, why);
  }
  const t = nowSec();
  await env.DB.batch([
    st(env, 'UPDATE portfolios SET cash_cents = cash_cents + ? WHERE id = ?', res.cashDelta, pf.id),
    res.pos
      ? st(env, 'INSERT INTO positions (portfolio_id, symbol, shares, cost_cents) VALUES (?, ?, ?, ?) ON CONFLICT(portfolio_id, symbol) DO UPDATE SET shares = excluded.shares, cost_cents = excluded.cost_cents', pf.id, o.symbol, res.pos.shares, res.pos.cost_cents)
      : st(env, 'DELETE FROM positions WHERE portfolio_id = ? AND symbol = ?', pf.id, o.symbol),
    st(env, "UPDATE orders SET status = 'filled', fill_cents = ?, filled = ? WHERE id = ?", price, t, o.id),
    ...(o.request_id ? [st(env, "UPDATE requests SET status = 'executed', fill_cents = ?, executed = ? WHERE id = ?", price, t, o.request_id)] : []),
  ]);
  const who = (await one(env, 'SELECT name FROM users WHERE id = ?', o.user_id))?.name;
  await act(env, club, `${pf.user_id === null ? 'Class portfolio' : who}: ${o.side === 'buy' ? 'bought' : 'sold'} ${o.shares} ${o.symbol} at $${(price / 100).toFixed(2)}`);
}

/** Validate and record an order, filling it right away when the rules allow. */
async function placeOrder(env, club, pf, o) {
  if (!SYMBOL.test(o.symbol)) throw bad('Enter a stock or ETF symbol like AAPL or SPY');
  const q = await getQuote(env, o.symbol);
  if (!q) throw bad(`No price found for ${o.symbol}. Check the symbol.`);
  const px = cents(q.price);
  const shares = T.roundShares(Number(o.shares), club.s.fractional);
  if (!(shares > 0) || shares > 1e6) throw bad(club.s.fractional ? 'Enter a share amount above 0' : 'Enter a whole number of shares');
  if (o.type === 'limit' && !(o.limit_cents > 0)) throw bad('Enter a limit price');
  const have = await one(env, 'SELECT shares FROM positions WHERE portfolio_id = ? AND symbol = ?', pf.id, o.symbol);
  if (o.side === 'sell' && (have?.shares || 0) < shares) throw bad('You do not own that many shares (no short selling)');
  if (o.side === 'buy' && pf.user_id !== null && Math.round(shares * T.fillPrice(px, 'buy', club.s.slippageBps)) + club.s.commissionCents > pf.cash_cents) throw bad('Not enough cash for that order');

  const r = await run(env, 'INSERT INTO orders (portfolio_id, user_id, request_id, symbol, side, shares, type, limit_cents, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    pf.id, o.user_id, o.request_id || null, o.symbol, o.side, shares, o.type, o.type === 'limit' ? o.limit_cents : null, nowSec());
  const order = { id: r.meta.last_row_id, portfolio_id: pf.id, user_id: o.user_id, request_id: o.request_id || null, symbol: o.symbol, side: o.side, shares, type: o.type, limit_cents: o.limit_cents };
  if (canFill(order, px, q.stale, club.s)) await fillOrder(env, club, order, px);
  return one(env, 'SELECT * FROM orders WHERE id = ?', order.id);
}
/** Market open: market orders fill, limit orders fill when the price is right. Closed: only if the club chose "fill at last close". */
function canFill(o, px, stale, s) {
  const open = T.isMarketOpen();
  if (open && stale) return false;
  if (o.type === 'limit') return open && (o.side === 'buy' ? px <= o.limit_cents : px >= o.limit_cents);
  return open || s.closedBehavior === 'lastclose';
}

// ---------- the "cron": runs at most once a minute, triggered by visits (Pages has no cron) ----------
export async function tick(env) {
  if (await env.KV.get('tick')) return;
  await env.KV.put('tick', '1', { expirationTtl: 60 });
  const club = await getClub(env);
  if (!club) return;
  await run(env, "UPDATE requests SET status = 'expired', note = 'Expired before it was decided' WHERE status = 'open' AND expires < ?", nowSec());
  const orders = await all(env, "SELECT * FROM orders WHERE status = 'open'");
  if (orders.length && T.isMarketOpen()) {
    const quotes = await getQuotes(env, orders.map((o) => o.symbol));
    for (const o of orders) {
      const q = quotes[o.symbol];
      if (q && canFill(o, cents(q.price), q.stale, club.s)) await fillOrder(env, club, o, cents(q.price));
    }
  }
  const { day, minutes } = T.etParts();
  if (T.isTradingDay() && minutes >= 570 && minutes < 1080) { // keep today's closing snapshot fresh until 6pm
    const pfs = await all(env, 'SELECT * FROM portfolios WHERE season = ?', club.season);
    const eq = await equities(env, pfs);
    const spy = cents((await getQuote(env, 'SPY'))?.price);
    await env.DB.batch(pfs.map((p) => st(env, 'INSERT INTO snapshots (portfolio_id, day, equity_cents, spy_cents) VALUES (?, ?, ?, ?) ON CONFLICT(portfolio_id, day) DO UPDATE SET equity_cents = excluded.equity_cents, spy_cents = excluded.spy_cents', p.id, day, eq[p.id], spy)));
  }
}

// ---------- class requests ----------
const memberCount = async (env) => (await one(env, "SELECT COUNT(*) n FROM users WHERE status = 'active'")).n;

async function requestProblem(env, club, r) { // early feedback when a request is created
  const pf = await classOf(env, club), v = await valued(env, pf);
  const q = await getQuote(env, r.symbol);
  if (!q) return `No price found for ${r.symbol}`;
  const px = cents(q.price), held = v.rows.find((x) => x.symbol === r.symbol);
  if (r.side === 'sell') return held && (!r.shares || r.shares <= held.shares) ? null : 'The class portfolio does not hold that many shares';
  const cost = r.amount_cents ?? Math.round(r.shares * px);
  return T.classBuyProblem({ equity: v.equity_cents, cash: pf.cash_cents, held: held?.value_cents || 0, costCents: cost }, club.s);
}

async function executeRequest(env, club, r) {
  const pf = await classOf(env, club), q = await getQuote(env, r.symbol);
  const px = q && cents(q.price);
  const per = r.type === 'limit' ? r.limit_cents : px;
  let shares = r.shares;
  if (shares == null) shares = T.roundShares(r.amount_cents / T.fillPrice(per || 1, r.side, club.s.slippageBps), club.s.fractional);
  try {
    await placeOrder(env, club, pf, { symbol: r.symbol, side: r.side, shares, type: r.type, limit_cents: r.limit_cents, user_id: r.user_id, request_id: r.id });
  } catch (e) {
    await run(env, "UPDATE requests SET status = 'rejected', note = ? WHERE id = ?", 'Could not execute: ' + e.message, r.id);
  }
}

// ---------- routes ----------
const routes = {};
const route = (method, path, auth, fn) => { routes[`${method} ${path}`] = { auth, fn }; };

route('GET', '/bootstrap', 'none', async ({ env, user }) => {
  const club = await getClub(env);
  return { hasClub: !!club, club: club && { name: club.name, season: club.season, settings: club.s, needApproval: !!club.need_approval }, me: user, marketOpen: T.isMarketOpen() };
});

route('POST', '/setup', 'none', async (ctx) => {
  const { env, body, ip } = ctx;
  if (await getClub(env)) throw bad('This site is already set up', 409);
  await limit(env, 'setup:' + ip, 5);
  const name = text(body.club, 2, 40, 'Club name');
  const club = { name, season: 1, s: T.DEFAULTS };
  await run(env, 'INSERT INTO club (id, name, code, created, settings) VALUES (1, ?, ?, ?, ?)', name, newCode(), nowSec(), '{}');
  const uid = await addUser(env, club, checkName(body.name), checkPassword(body.password), 'owner', 'active');
  await run(env, 'INSERT INTO portfolios (user_id, season, cash_cents, start_cents) VALUES (NULL, 1, ?, ?)', club.s.classStartCents, club.s.classStartCents);
  await login(env, ctx, uid);
  return { ok: true };
});

const checkName = (n) => {
  const s = text(n, 2, 20, 'Display name');
  if (!/^[A-Za-z0-9 _.-]+$/.test(s)) throw bad('Use only letters, numbers, spaces, dots, dashes and underscores in your name');
  return s;
};
const checkPassword = (p) => text(p, 4, 72, 'Password or PIN');

route('POST', '/join', 'none', async (ctx) => {
  const { env, body, ip } = ctx;
  const club = await getClub(env);
  if (!club) throw bad('No club has been set up yet');
  await limit(env, 'join:' + ip, 10);
  const name = checkName(body.name), password = checkPassword(body.password);
  if (body.invite) { // admin invite link
    const inv = await one(env, 'SELECT token FROM invites WHERE token = ? AND used_by IS NULL', String(body.invite));
    if (!inv) throw bad('This invite link is not valid any more');
    const admins = (await one(env, "SELECT COUNT(*) n FROM users WHERE role IN ('owner','admin') AND status != 'removed'")).n;
    if (admins >= 3) throw bad('The club already has 3 admins');
    const id = await addUser(env, club, name, password, 'admin', 'active');
    await run(env, 'UPDATE invites SET used_by = ? WHERE token = ?', id, inv.token);
    await login(env, ctx, id);
    return { ok: true };
  }
  if (!club.code_on || String(body.code || '').trim().toUpperCase() !== club.code) throw bad('That class code is not right');
  const pending = !!club.need_approval;
  const id = await addUser(env, club, name, password, 'member', pending ? 'pending' : 'active');
  if (pending) return { ok: true, pending: true };
  await act(env, club, `${name} joined the club`);
  await login(env, ctx, id);
  return { ok: true };
});

route('POST', '/login', 'none', async (ctx) => {
  const { env, body, ip } = ctx;
  const name = String(body.name || '').trim();
  await limit(env, `login:${ip}:${name.toLowerCase()}`, 8);
  const u = await one(env, 'SELECT * FROM users WHERE name = ?', name);
  if (!u || (await hashPassword(String(body.password || ''), u.salt)) !== u.hash) throw bad('Wrong name or password', 401);
  if (u.status === 'pending') throw bad('An admin still needs to approve you', 403);
  if (u.status === 'removed') throw bad('This account was removed', 403);
  await login(env, ctx, u.id);
  return { ok: true };
});

route('POST', '/logout', 'user', async (ctx) => {
  const m = /(?:^|;\s*)ct=([a-f0-9]{64})/.exec(ctx.req.headers.get('Cookie') || '');
  if (m) await run(ctx.env, 'DELETE FROM sessions WHERE token = ?', await hmac(ctx.env.SESSION_SECRET, m[1]));
  ctx.cookie = 'ct=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  return { ok: true };
});

route('GET', '/quote', 'user', async ({ env, url }) => {
  const syms = (url.searchParams.get('symbols') || '').toUpperCase().split(',').filter((s) => SYMBOL.test(s)).slice(0, 20);
  return { quotes: await getQuotes(env, syms) };
});
route('GET', '/history', 'user', async ({ env, url }) => {
  const sym = (url.searchParams.get('symbol') || '').toUpperCase();
  if (!SYMBOL.test(sym)) throw bad('Bad symbol');
  return { points: await getHistory(env, sym, url.searchParams.get('range') || '1M') };
});
route('GET', '/search', 'user', async ({ env, url }) => ({ results: await search(env, url.searchParams.get('q') || '') }));
route('GET', '/overview', 'user', async ({ env, url }) => ({ overview: await overview(env, (url.searchParams.get('symbol') || '').toUpperCase()) }));

route('GET', '/portfolio', 'user', async ({ env, url, user }) => {
  const club = await getClub(env), cls = url.searchParams.get('kind') === 'class';
  const pf = cls ? await classOf(env, club) : await personalOf(env, club, user.id);
  const [v, orders, snaps] = await Promise.all([
    valued(env, pf),
    all(env, `SELECT o.*, u.name AS who FROM orders o JOIN users u ON u.id = o.user_id WHERE o.portfolio_id = ? ORDER BY o.id DESC LIMIT 50`, pf.id),
    all(env, 'SELECT day, equity_cents, spy_cents FROM snapshots WHERE portfolio_id = ? ORDER BY day', pf.id),
  ]);
  return { ...v, orders, snapshots: snaps, marketOpen: T.isMarketOpen() };
});

route('POST', '/order', 'user', async ({ env, body, user }) => {
  const club = await getClub(env), pf = await personalOf(env, club, user.id);
  const side = body.side === 'sell' ? 'sell' : 'buy', type = body.type === 'limit' ? 'limit' : 'market';
  const order = await placeOrder(env, club, pf, { symbol: String(body.symbol || '').toUpperCase(), side, shares: body.shares, type, limit_cents: type === 'limit' ? T.toCents(body.limit) : null, user_id: user.id });
  return { order };
});
route('POST', '/order/cancel', 'user', async ({ env, body, user }) => {
  const club = await getClub(env), pf = await personalOf(env, club, user.id);
  const r = await run(env, "UPDATE orders SET status = 'cancelled' WHERE id = ? AND portfolio_id = ? AND status = 'open'", Number(body.id), pf.id);
  if (!r.meta.changes) throw bad('That order cannot be cancelled');
  return { ok: true };
});

route('GET', '/requests', 'user', async ({ env, user }) => {
  const club = await getClub(env), members = await memberCount(env);
  const rows = await all(env, `SELECT r.*, u.name AS who,
      (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) AS ncomments,
      (SELECT COALESCE(SUM(value = 1), 0) FROM votes v WHERE v.request_id = r.id) AS up,
      (SELECT COALESCE(SUM(value = -1), 0) FROM votes v WHERE v.request_id = r.id) AS down,
      (SELECT value FROM votes v WHERE v.request_id = r.id AND v.user_id = ?) AS mine
    FROM requests r JOIN users u ON u.id = r.user_id WHERE r.season = ? ORDER BY r.id DESC LIMIT 100`, user.id, club.season);
  for (const r of rows) r.pass = T.tally([...Array(r.up).fill(1), ...Array(r.down).fill(-1)], members, club.s.quorumPct).pass;
  return { requests: rows, members };
});

route('POST', '/requests', 'user', async ({ env, body, user }) => {
  const club = await getClub(env), s = club.s;
  const day = (await one(env, 'SELECT COUNT(*) n FROM requests WHERE user_id = ? AND created > ?', user.id, nowSec() - 86400)).n;
  if (day >= s.maxRequestsPerDay) throw bad(`You can send ${s.maxRequestsPerDay} requests per day`);
  const r = {
    symbol: String(body.symbol || '').toUpperCase(), side: body.side === 'sell' ? 'sell' : 'buy', type: body.type === 'limit' ? 'limit' : 'market',
    shares: null, amount_cents: null, limit_cents: body.type === 'limit' ? T.toCents(body.limit) : null,
  };
  if (!SYMBOL.test(r.symbol)) throw bad('Enter a stock or ETF symbol like AAPL or SPY');
  if (r.type === 'limit' && !(r.limit_cents > 0)) throw bad('Enter a limit price');
  if (body.amount) { r.amount_cents = T.toCents(body.amount); if (!(r.amount_cents > 0)) throw bad('Enter a dollar amount above 0'); }
  else { r.shares = T.roundShares(Number(body.shares), s.fractional); if (!(r.shares > 0)) throw bad('Enter the number of shares or a dollar amount'); }
  const thesis = text(body.thesis, 10, 280, 'Your reason'), risk = String(body.risk || '').trim().slice(0, 140);
  const why = await requestProblem(env, club, r);
  if (why) throw bad(why);
  const t = nowSec(), voteEnds = s.decisionMode === 'vote' ? t + s.voteHours * 3600 : null;
  await run(env, `INSERT INTO requests (user_id, season, symbol, side, shares, amount_cents, type, limit_cents, thesis, risk, created, vote_ends, expires)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, club.season, r.symbol, r.side, r.shares, r.amount_cents, r.type, r.limit_cents, thesis, risk, t, voteEnds, (voteEnds || t) + (voteEnds ? 2 : 7) * 86400);
  await act(env, club, `${user.name} asked the class to ${r.side} ${r.symbol}`);
  return { ok: true };
});

route('POST', '/requests/vote', 'user', async ({ env, body, user }) => {
  const club = await getClub(env), r = await one(env, 'SELECT * FROM requests WHERE id = ?', Number(body.id));
  if (!r || r.status !== 'open') throw bad('This request is closed');
  if (club.s.decisionMode !== 'vote') throw bad('This club uses admin approval, not votes');
  if (nowSec() > r.vote_ends) throw bad('Voting has ended');
  const value = body.value === -1 ? -1 : 1;
  await run(env, 'INSERT INTO votes (request_id, user_id, value) VALUES (?, ?, ?) ON CONFLICT(request_id, user_id) DO UPDATE SET value = excluded.value', r.id, user.id, value);
  return { ok: true };
});

route('POST', '/requests/decide', 'admin', async ({ env, body, user }) => {
  const club = await getClub(env), r = await one(env, 'SELECT * FROM requests WHERE id = ?', Number(body.id));
  if (!r || r.status !== 'open') throw bad('This request is already decided');
  const note = String(body.note || '').trim().slice(0, 200);
  if (body.action === 'reject') {
    await run(env, "UPDATE requests SET status = 'rejected', decided_by = ?, note = ? WHERE id = ?", user.id, note, r.id);
    await act(env, club, `${user.name} rejected the ${r.symbol} request`);
    return { ok: true };
  }
  if (club.s.decisionMode === 'vote') {
    if (nowSec() <= r.vote_ends) throw bad('Wait until voting ends');
    const votes = (await all(env, 'SELECT value FROM votes WHERE request_id = ?', r.id)).map((v) => v.value);
    if (!T.tally(votes, await memberCount(env), club.s.quorumPct).pass) throw bad('The vote did not pass (needs quorum and more yes than no)');
  }
  await run(env, "UPDATE requests SET status = 'approved', decided_by = ?, note = ? WHERE id = ?", user.id, note, r.id);
  await act(env, club, `${user.name} approved the ${r.symbol} request`);
  await executeRequest(env, club, r);
  return { ok: true };
});

route('GET', '/comments', 'user', async ({ env, url }) => ({
  comments: await all(env, 'SELECT c.id, c.body, c.created, u.name AS who FROM comments c JOIN users u ON u.id = c.user_id WHERE c.request_id = ? ORDER BY c.id', Number(url.searchParams.get('id'))),
}));
route('POST', '/comments', 'user', async ({ env, body, user }) => {
  const r = await one(env, 'SELECT id FROM requests WHERE id = ?', Number(body.id));
  if (!r) throw bad('Request not found', 404);
  await run(env, 'INSERT INTO comments (request_id, user_id, body, created) VALUES (?, ?, ?, ?)', r.id, user.id, text(body.body, 1, 280, 'Comment'), nowSec());
  return { ok: true };
});

route('GET', '/leaderboard', 'user', async ({ env }) => {
  const club = await getClub(env);
  const people = await all(env, `SELECT p.*, u.name FROM portfolios p JOIN users u ON u.id = p.user_id WHERE p.season = ? AND u.status = 'active'`, club.season);
  const eq = await equities(env, people);
  const personal = people.map((p) => ({ name: p.name, equity_cents: eq[p.id], pct: (eq[p.id] / p.start_cents - 1) * 100 })).sort((a, b) => b.pct - a.pct);
  const done = await all(env, `SELECT r.symbol, r.side, r.fill_cents, u.name FROM requests r JOIN users u ON u.id = r.user_id WHERE r.status = 'executed' AND r.season = ?`, club.season);
  const quotes = await getQuotes(env, done.map((d) => d.symbol));
  const by = {};
  for (const d of done) {
    const now = cents(quotes[d.symbol]?.price);
    if (!now || !d.fill_cents) continue;
    const pct = (d.side === 'buy' ? now / d.fill_cents - 1 : d.fill_cents / now - 1) * 100;
    (by[d.name] ||= []).push(pct);
  }
  const pitches = Object.entries(by).map(([name, a]) => ({ name, pct: a.reduce((x, y) => x + y, 0) / a.length, count: a.length })).sort((a, b) => b.pct - a.pct);
  return { personal, pitches };
});

route('GET', '/dashboard', 'user', async ({ env, user }) => {
  const club = await getClub(env);
  const [me, cls] = await Promise.all([personalOf(env, club, user.id), classOf(env, club)]);
  const [mine, fund, board, feed, open] = await Promise.all([
    valued(env, me), valued(env, cls),
    all(env, `SELECT p.id, u.name FROM portfolios p JOIN users u ON u.id = p.user_id WHERE p.season = ? AND u.status = 'active'`, club.season),
    all(env, 'SELECT ts, text FROM activity WHERE season = ? ORDER BY id DESC LIMIT 15', club.season),
    all(env, "SELECT id, symbol, side, user_id FROM requests WHERE status = 'open' AND season = ? ORDER BY id DESC", club.season),
  ]);
  const pfs = await all(env, 'SELECT * FROM portfolios WHERE user_id IS NOT NULL AND season = ?', club.season);
  const eq = await equities(env, pfs.filter((p) => board.some((b) => b.id === p.id)));
  const ranked = Object.entries(eq).sort((a, b) => b[1] - a[1]).map(([id]) => Number(id));
  const movers = fund.rows.map((r) => ({ symbol: r.symbol, day_cents: r.day_cents, pct: r.value_cents ? (r.day_cents / (r.value_cents - r.day_cents)) * 100 : 0 })).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5);
  return { mine: { equity_cents: mine.equity_cents, day_cents: mine.day_cents, start_cents: mine.start_cents }, fund: { equity_cents: fund.equity_cents, start_cents: fund.start_cents },
    rank: ranked.indexOf(me.id) + 1, of: ranked.length, movers, open, feed, marketOpen: T.isMarketOpen() };
});

// ---------- admin ----------
route('GET', '/admin/members', 'admin', async ({ env }) => {
  const club = await getClub(env);
  return {
    code: club.code, codeOn: !!club.code_on, needApproval: !!club.need_approval, settings: club.s, season: club.season,
    members: await all(env, "SELECT id, name, role, status, created FROM users WHERE status != 'removed' ORDER BY role = 'member', name"),
    invites: (await all(env, 'SELECT token FROM invites WHERE used_by IS NULL')).map((i) => i.token),
  };
});

route('POST', '/admin/member', 'admin', async ({ env, body, user }) => {
  const club = await getClub(env), u = await one(env, 'SELECT * FROM users WHERE id = ?', Number(body.id));
  if (!u) throw bad('Member not found', 404);
  if (u.role === 'owner' && user.role !== 'owner') throw bad('Only the owner can change the owner', 403);
  if (body.action === 'approve' && u.status === 'pending') {
    await run(env, "UPDATE users SET status = 'active' WHERE id = ?", u.id);
    await newPersonal(env, club, u.id);
    await act(env, club, `${u.name} joined the club`);
    return {};
  }
  if (body.action === 'remove') {
    if (u.role !== 'member') throw bad('Admins cannot be removed here');
    await run(env, "UPDATE users SET status = 'removed' WHERE id = ?", u.id);
    await run(env, 'DELETE FROM sessions WHERE user_id = ?', u.id);
    return {};
  }
  if (body.action === 'reset') { // shows the temporary password once; the member should change it at next login (ask an admin again)
    const temp = rand(3), salt = rand(16);
    await run(env, 'UPDATE users SET salt = ?, hash = ? WHERE id = ?', salt, await hashPassword(temp, salt), u.id);
    await run(env, 'DELETE FROM sessions WHERE user_id = ?', u.id);
    return { temp };
  }
  throw bad('Unknown action');
});

route('POST', '/admin/code', 'admin', async ({ env, body }) => {
  const a = body.action;
  if (a === 'rotate') await run(env, 'UPDATE club SET code = ?, code_on = 1 WHERE id = 1', newCode());
  else if (a === 'disable' || a === 'enable') await run(env, 'UPDATE club SET code_on = ? WHERE id = 1', a === 'enable' ? 1 : 0);
  else if (a === 'approval') await run(env, 'UPDATE club SET need_approval = ? WHERE id = 1', body.value ? 1 : 0);
  else throw bad('Unknown action');
  return {};
});

route('POST', '/admin/invite', 'owner', async ({ env }) => {
  const admins = (await one(env, "SELECT COUNT(*) n FROM users WHERE role IN ('owner','admin') AND status != 'removed'")).n;
  const waiting = (await one(env, 'SELECT COUNT(*) n FROM invites WHERE used_by IS NULL')).n;
  if (admins + waiting >= 3) throw bad('A club has at most 3 admins (counting open invites)');
  const token = rand(16);
  await run(env, 'INSERT INTO invites (token, created) VALUES (?, ?)', token, nowSec());
  return { token };
});

const SETTING_RANGES = { startCents: [1e5, 1e10], classStartCents: [1e5, 1e10], slippageBps: [0, 500], commissionCents: [0, 5000], voteHours: [1, 168], quorumPct: [1, 100], maxPositionPct: [1, 100], minCashPct: [0, 100], maxRequestsPerDay: [1, 50] };
route('POST', '/admin/settings', 'admin', async ({ env, body }) => {
  const club = await getClub(env), next = { ...club.s };
  for (const [k, [lo, hi]] of Object.entries(SETTING_RANGES)) {
    if (body[k] === undefined) continue;
    const n = Number(body[k]);
    if (!Number.isFinite(n) || n < lo || n > hi) throw bad(`${k} must be between ${lo} and ${hi}`);
    next[k] = n;
  }
  if (body.fractional !== undefined) next.fractional = !!body.fractional;
  if (['queue', 'lastclose'].includes(body.closedBehavior)) next.closedBehavior = body.closedBehavior;
  if (['admin', 'vote'].includes(body.decisionMode)) next.decisionMode = body.decisionMode;
  await run(env, 'UPDATE club SET settings = ? WHERE id = 1', JSON.stringify(next));
  return {};
});

route('GET', '/admin/export', 'admin', async ({ env }) => {
  const rows = await all(env, `SELECT o.id, o.created, p.season, COALESCE(u.name, 'CLASS') AS who, o.symbol, o.side, o.shares, o.type, o.status, o.fill_cents, o.request_id
    FROM orders o JOIN portfolios p ON p.id = o.portfolio_id LEFT JOIN users u ON u.id = p.user_id ORDER BY o.id`);
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }; // blocks spreadsheet formula injection
  const csv = ['order,time_utc,season,portfolio,symbol,side,shares,type,status,fill_price,request']
    .concat(rows.map((r) => [r.id, new Date(r.created * 1000).toISOString(), r.season, r.who, r.symbol, r.side, r.shares, r.type, r.status, r.fill_cents == null ? '' : (r.fill_cents / 100).toFixed(2), r.request_id].map(cell).join(','))).join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="clubtrade-trades.csv"' } });
});

route('POST', '/admin/season', 'owner', async ({ env, body }) => {
  if (body.confirm !== 'RESET') throw bad('Type RESET to confirm');
  const club = await getClub(env);
  const next = { ...club, season: club.season + 1 };
  await run(env, "UPDATE orders SET status = 'cancelled' WHERE status = 'open'");
  await run(env, "UPDATE requests SET status = 'expired' WHERE status IN ('open','approved')");
  await run(env, 'UPDATE club SET season = ? WHERE id = 1', next.season);
  for (const u of await all(env, "SELECT id FROM users WHERE status = 'active'")) await newPersonal(env, next, u.id);
  await run(env, 'INSERT INTO portfolios (user_id, season, cash_cents, start_cents) VALUES (NULL, ?, ?, ?)', next.season, club.s.classStartCents, club.s.classStartCents);
  await act(env, next, `Season ${next.season} started`);
  return {};
});

route('GET', '/status', 'none', async ({ env }) => {
  const out = { time: new Date().toISOString(), marketOpen: T.isMarketOpen(), demoData: env.MOCK_DATA === '1' };
  try { await env.DB.prepare('SELECT 1').first(); out.database = 'ok'; } catch (e) { out.database = 'failed: ' + e.message; }
  try { await env.KV.put('ping', '1', { expirationTtl: 60 }); out.cache = 'ok'; } catch (e) { out.cache = 'failed: ' + e.message; }
  let providers = await env.KV.get('health', 'json'); // upstream checks cost API calls, so share one result for a minute
  if (!providers) { providers = env.MOCK_DATA === '1' ? [] : await health(env); await env.KV.put('health', JSON.stringify(providers), { expirationTtl: 60 }); }
  out.providers = providers;
  const good = providers.filter((p) => p.state === 'ok');
  out.diagnosis = [
    out.database === 'ok' ? 'Backend and database reachable: yes' : 'Backend and database reachable: NO. Tell the advisor the site is broken.',
    out.demoData ? 'Using built-in DEMO prices (MOCK_DATA is on). These are not real.' :
      good.length ? `Data provider reachable: yes (${good.map((p) => p.name).join(', ')}). Quotes can be up to 15 minutes delayed.` : 'Data provider reachable: NO. The site will show the last saved prices marked "stale".',
    out.marketOpen ? 'US market: open now.' : 'US market: closed now. Orders wait for the next open unless your club fills at last close.',
  ];
  return out;
});

// ---------- entry point ----------
export async function handle({ request, env, waitUntil }) {
  const url = new URL(request.url), path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const hit = routes[`${request.method} ${path}`];
  const ctx = { env, req: request, url, ip: request.headers.get('CF-Connecting-IP') || 'local', cookie: null, body: {} };
  try {
    if (!hit) throw bad('Not found', 404);
    if (request.method !== 'GET') { // CSRF: custom header can't be sent cross-site without a CORS preflight we never grant
      const origin = request.headers.get('Origin');
      if (request.headers.get('X-Requested-With') !== 'clubtrade' || (origin && origin !== url.origin)) throw bad('Bad request', 403);
      if (Number(request.headers.get('Content-Length')) > 10000) throw bad('Request too large', 413);
      ctx.body = await request.json().catch(() => ({}));
    }
    ctx.user = await sessionUser(env, request);
    if (hit.auth !== 'none' && !ctx.user) throw bad('Please sign in', 401);
    if (hit.auth === 'admin' && !isAdmin(ctx.user)) throw bad('Admins only', 403);
    if (hit.auth === 'owner' && ctx.user.role !== 'owner') throw bad('The club owner only', 403);
    if (ctx.user) waitUntil?.(tick(env).catch((e) => console.log('tick failed', e)));
    const result = await hit.fn(ctx);
    const res = result instanceof Response ? result : json(result);
    if (ctx.cookie) res.headers.append('Set-Cookie', ctx.cookie);
    return res;
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.log('error', e);
    return json({ error: 'Something went wrong on the server. Try again, then check /status.' }, 500);
  }
}
