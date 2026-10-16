// ClubTrade front end: one file, no libraries. Every user-written string goes through esc().
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (c) => (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const dir = (n) => (n >= 0 ? 'up' : 'down');
const when = (ts) => new Date(ts * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const num = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
const signed = (c) => `<span class="${dir(c)}">${c >= 0 ? '+' : '-'}${usd(Math.abs(c))}</span>`;

let boot, me, M = { range: '1M' }, timer;
const actions = {}, forms = {};

async function api(path, body) {
  const res = await fetch('/api' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'clubtrade' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'The server sent an unreadable answer. Check the status page.' }));
  if (res.status === 401 && me) { me = null; paint(); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 4500);
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  try { await actions[el.dataset.act](el); } catch (err) { toast(err.message); }
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const btn = $('button[type=submit]', f); if (btn) btn.disabled = true;
  try { await forms[f.dataset.form](Object.fromEntries(new FormData(f)), f); } catch (err) { toast(err.message); }
  if (btn) btn.disabled = false;
});

// ---------- charts: plain SVG ----------
function chart(series) { // series: [{pts:[numbers], css}]
  const all = series.flatMap((s) => s.pts), lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const line = (s) => `<polyline class="${s.css}" points="${s.pts.map((v, i) => `${(i / Math.max(1, s.pts.length - 1)) * 640},${190 - ((v - lo) / span) * 180 - 5}`).join(' ')}"/>`;
  return `<svg class="chart" viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label="Price chart">${series.map(line).join('')}</svg>`;
}

// ---------- shell ----------
const NAV = [['', 'Dashboard'], ['markets', 'Markets'], ['me', 'My Portfolio'], ['class', 'Class Portfolio'], ['requests', 'Requests'], ['board', 'Leaderboard'], ['learn', 'Learn']];
function paint() {
  const app = $('#app');
  if (!boot.hasClub) return (app.innerHTML = setupHtml());
  if (!me) return (app.innerHTML = authHtml());
  const nav = [...NAV, ...(me.role !== 'member' ? [['admin', 'Admin']] : [])];
  app.innerHTML = `<header class="top"><div class="in"><span class="brand">${esc(boot.club.name)}</span>
    <nav aria-label="Main">${nav.map(([h, t]) => `<a href="#/${h}" data-nav="${h}">${t}</a>`).join('')}</nav>
    <span class="muted">${esc(me.name)}</span>
    <button class="small" data-act="theme">Theme</button><button class="small" data-act="logout">Sign out</button></div></header>
    <main id="main"></main>`;
  route();
}
async function route(silent) {
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (!me) return paint();
  document.querySelectorAll('nav a').forEach((a) => (a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const main = $('#main'); if (!main) return;
  const view = VIEWS[name] || VIEWS[''];
  if (!silent) main.innerHTML = '<p class="muted">Loading…</p>';
  try {
    main.innerHTML = await view(arg);
  } catch (e) { main.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
window.addEventListener('hashchange', () => { if (!/^#\/invite/.test(location.hash)) route(); else paint(); });
// Refresh the live pages every 20 s, but only while the tab is visible (and never over a form being typed in).
const LIVE = new Set(['', 'me', 'class', 'board']);
setInterval(() => {
  const name = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (document.visibilityState === 'visible' && me && LIVE.has(name) && !document.activeElement?.matches?.('input,textarea,select')) route(true);
}, 20000);

// ---------- sign in / join / setup ----------
const privacy = '<p class="muted">Privacy: this site uses fake money and collects no real names, emails or birthdays. Pick a nickname.</p>';
function setupHtml() {
  return `<div class="auth"><h1>Set up your investment club</h1><p class="muted">You are the first person here, so you become the club owner.</p>
  <form class="stack card" data-form="setup">
    <label for="club">Club name</label><input id="club" name="club" required maxlength="40">
    <label for="name">Your display name (a nickname is fine)</label><input id="name" name="name" required maxlength="20">
    <label for="pw">Password or 4-digit PIN</label><input id="pw" name="password" type="password" required minlength="4" autocomplete="new-password">
    <p><button class="primary" type="submit">Create the club</button></p></form>${privacy}</div>`;
}
function authHtml() {
  const invite = (location.hash.match(/^#\/invite\/(\w+)/) || [])[1];
  if (invite) return `<div class="auth"><h1>Join as an admin</h1><form class="stack card" data-form="join">
    <input type="hidden" name="invite" value="${esc(invite)}">${nameAndPw()}<p><button class="primary" type="submit">Create my admin account</button></p></form>${privacy}</div>`;
  const tab = M.auth === 'login' ? 'login' : 'join';
  return `<div class="auth"><h1>${esc(boot.club.name)}</h1><p class="muted">Investment Club: Paper Trading. Real prices, fake money.</p>
    <div class="tabs"><button data-act="authTab" data-tab="join" aria-pressed="${tab === 'join'}">Join the club</button><button data-act="authTab" data-tab="login" aria-pressed="${tab === 'login'}">Sign in</button></div>
    <form class="stack card" data-form="${tab}">
      ${tab === 'join' ? '<label for="code">Class code</label><input id="code" name="code" required maxlength="6" autocapitalize="characters" autocomplete="off">' : ''}
      ${nameAndPw(tab === 'login')}
      <p><button class="primary" type="submit">${tab === 'join' ? 'Join' : 'Sign in'}</button></p></form>${privacy}</div>`;
}
const nameAndPw = (existing) => `<label for="name">Display name</label><input id="name" name="name" required maxlength="20" autocomplete="username">
  <label for="pw">Password or 4-digit PIN</label><input id="pw" name="password" type="password" required minlength="4" autocomplete="${existing ? 'current-password' : 'new-password'}">`;

actions.authTab = (el) => { M.auth = el.dataset.tab; paint(); };
actions.theme = () => {
  const dark = document.documentElement.dataset.theme !== 'dark' && !(document.documentElement.dataset.theme === undefined && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* storage may be blocked */ }
};
actions.logout = async () => { await api('/logout', {}); me = null; location.hash = ''; paint(); };
const afterAuth = async (r) => {
  if (r.pending) { M.auth = 'login'; paint(); return toast('Request sent. An admin must approve you before you can sign in.'); }
  location.hash = ''; boot = await api('/bootstrap'); me = boot.me; paint();
};
forms.setup = async (d) => afterAuth(await api('/setup', d));
forms.join = async (d) => afterAuth(await api('/join', d));
forms.login = async (d) => afterAuth(await api('/login', d));

// ---------- shared pieces ----------
const marketBanner = () => boot.marketOpen ? '' : `<div class="banner">Market closed. ${boot.club.settings.closedBehavior === 'lastclose' ? 'Orders fill at the last close price.' : 'Orders wait and fill at the next open.'}</div>`;
const badge = (q) => `<p class="muted">Data: ${q.delayed ? 'may be delayed up to 15 min' : 'live'} · source: ${esc(q.source)}${q.stale ? ' · <strong>STALE (last saved price)</strong>' : ''}</p>`;
function holdingsTable(rows) {
  if (!rows.length) return '<p class="muted">No holdings yet.</p>';
  return `<div class="scroll"><table><thead><tr><th>Symbol</th><th>Shares</th><th>Avg cost</th><th>Price</th><th>Value</th><th>Day P/L</th><th>Total P/L</th><th>% of total</th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td><a href="#/markets/${esc(r.symbol)}">${esc(r.symbol)}</a></td><td>${num(r.shares)}</td><td>${usd(r.cost_cents / r.shares)}</td><td>${usd(r.price_cents)}</td><td>${usd(r.value_cents)}</td><td>${signed(r.day_cents)}</td><td>${signed(r.pl_cents)} <span class="muted">(${pct((r.pl_cents / r.cost_cents) * 100)})</span></td><td>${(r.weight * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
}
function ordersTable(orders, withWho, cancel) {
  if (!orders.length) return '<p class="muted">No orders yet.</p>';
  return `<div class="scroll"><table><thead><tr><th>When</th>${withWho ? '<th>By</th>' : ''}<th>Order</th><th>Type</th><th>Status</th><th>Fill price</th>${cancel ? '<th></th>' : ''}</tr></thead><tbody>
  ${orders.map((o) => `<tr><td>${when(o.created)}</td>${withWho ? `<td>${esc(o.who)}</td>` : ''}<td>${o.side} ${num(o.shares)} ${esc(o.symbol)}</td><td>${o.type}${o.limit_cents ? ' @ ' + usd(o.limit_cents) : ''}</td>
  <td><span class="pill ${o.status}">${o.status}</span>${o.note ? ` <span class="muted">${esc(o.note)}</span>` : ''}</td><td>${o.fill_cents ? usd(o.fill_cents) : ''}</td>
  ${cancel ? `<td>${o.status === 'open' ? `<button class="small" data-act="cancel" data-id="${o.id}">Cancel</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
const equityChart = (snaps) => snaps.length > 1 ? chart([{ pts: snaps.map((s) => s.equity_cents), css: 'line-a' }]) : '<p class="muted">The equity chart appears after two trading days of data.</p>';

// ---------- views ----------
const VIEWS = {};

VIEWS[''] = async () => {
  const d = await api('/dashboard');
  const ret = (d.fund.equity_cents / d.fund.start_cents - 1) * 100;
  return `<h1>Dashboard</h1>${marketBanner()}
  <div class="grid">
    <div class="card"><div class="muted">Your equity</div><div class="big">${usd(d.mine.equity_cents)}</div><div>Today ${signed(d.mine.day_cents)}</div></div>
    <div class="card"><div class="muted">Class portfolio</div><div class="big">${usd(d.fund.equity_cents)}</div><div class="${dir(ret)}">${pct(ret)} since start</div></div>
    <div class="card"><div class="muted">Your rank</div><div class="big">#${d.rank || '-'}</div><div class="muted">of ${d.of} members</div></div>
    <div class="card"><div class="muted">Open requests</div><div class="big">${d.open.length}</div><a href="#/requests">View the board</a></div>
  </div>
  <div class="grid"><div class="card"><h2>Top movers in the class portfolio</h2>
    ${d.movers.length ? `<ul class="feed">${d.movers.map((m) => `<li>${esc(m.symbol)} <span class="${dir(m.pct)}">${pct(m.pct)}</span></li>`).join('')}</ul>` : '<p class="muted">No holdings yet.</p>'}</div>
  <div class="card"><h2>Activity</h2>${d.feed.length ? `<ul class="feed">${d.feed.map((f) => `<li>${esc(f.text)} <span class="muted">· ${when(f.ts)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</div></div>`;
};

VIEWS.me = async () => {
  const p = await api('/portfolio?kind=personal');
  return `<h1>My Portfolio</h1>${marketBanner()}
  <div class="grid"><div class="card"><div class="muted">Total equity</div><div class="big">${usd(p.equity_cents)}</div></div>
  <div class="card"><div class="muted">Cash</div><div class="big">${usd(p.cash_cents)}</div></div>
  <div class="card"><div class="muted">Total return</div><div class="big ${dir(p.equity_cents - p.start_cents)}">${pct((p.equity_cents / p.start_cents - 1) * 100)}</div></div></div>
  ${p.stale ? '<div class="banner">Some prices are stale (last saved). They update when the data source is back.</div>' : ''}
  <div class="card"><h2>Holdings</h2>${holdingsTable(p.rows)}</div>
  <div class="card"><h2>Equity over time</h2>${equityChart(p.snapshots)}</div>
  <div class="card"><h2>Orders</h2>${ordersTable(p.orders, false, true)}</div>`;
};
actions.cancel = async (el) => { await api('/order/cancel', { id: Number(el.dataset.id) }); toast('Order cancelled'); route(true); };

VIEWS.class = async () => {
  const p = await api('/portfolio?kind=class');
  const withSpy = p.snapshots.filter((s) => s.spy_cents);
  const idx = (a, f) => a.map((s) => (f(s) / f(a[0])) * 100);
  return `<h1>Class Portfolio</h1>${marketBanner()}
  <div class="grid"><div class="card"><div class="muted">Fund value</div><div class="big">${usd(p.equity_cents)}</div></div>
  <div class="card"><div class="muted">Cash</div><div class="big">${usd(p.cash_cents)}</div></div>
  <div class="card"><div class="muted">Return</div><div class="big ${dir(p.equity_cents - p.start_cents)}">${pct((p.equity_cents / p.start_cents - 1) * 100)}</div></div></div>
  <div class="card"><h2>Holdings</h2>${holdingsTable(p.rows)}<p><a class="btn primary" href="#/requests">Make a request</a></p></div>
  <div class="card"><h2>Class portfolio vs. SPY</h2>
  ${withSpy.length > 1 ? `${chart([{ pts: idx(withSpy, (s) => s.equity_cents), css: 'line-a' }, { pts: idx(withSpy, (s) => s.spy_cents), css: 'line-b' }])}<p class="muted">Both lines start at 100. Solid = class portfolio, dashed = SPY (the S&amp;P 500 ETF).</p>` : '<p class="muted">The comparison appears after two trading days of data.</p>'}</div>
  <div class="card"><h2>Trades</h2>${ordersTable(p.orders, true, false)}</div>`;
};

VIEWS.markets = async (sym) => {
  sym = (sym || '').toUpperCase();
  const search = `<form class="row card" data-form="search"><div><label for="q">Search for a company or symbol</label><input id="q" name="q" placeholder="AAPL, SPY, Nike…" value="${esc(sym)}" autocomplete="off"></div><button class="primary" type="submit">Search</button></form><div id="results"></div>`;
  if (!sym) return `<h1>Markets</h1>${marketBanner()}${search}<p class="muted">Try SPY, QQQ or VTI (index ETFs), or search for any US stock.</p>`;
  const [qs, hist, pf, ov] = await Promise.all([api('/quote?symbols=' + encodeURIComponent(sym)), api(`/history?symbol=${encodeURIComponent(sym)}&range=${M.range}`), api('/portfolio?kind=personal'), api('/overview?symbol=' + encodeURIComponent(sym))]);
  const q = qs.quotes[sym];
  if (!q) return `<h1>Markets</h1>${search}<p class="err">No price found for ${esc(sym)}.</p>`;
  const owned = pf.rows.find((r) => r.symbol === sym);
  const pts = hist.points.map((p) => p.c);
  const o = ov.overview;
  const dollars = (n) => (Number.isFinite(n) ? '$' + n.toFixed(2) : '-');
  return `<h1>Markets</h1>${marketBanner()}${search}
  <div class="card" id="quotecard" data-sym="${esc(sym)}"><h2>${esc(sym)}${o?.name ? ' · ' + esc(o.name) : ''}</h2>
    <div class="big"><span id="px">${dollars(q.price)}</span> <span id="chg" class="${dir(q.change)}">${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${pct(q.changePct)})</span></div>
    <p class="muted">Open ${dollars(q.open)} · High ${dollars(q.high)} · Low ${dollars(q.low)} · Prev close ${dollars(q.prevClose)}${o ? ` · P/E ${esc(o.pe)} · ${esc(o.sector)}` : ''}</p>
    <span id="badge">${badge(q)}</span>
    <div class="tabs">${['1D', '1W', '1M', '3M', '1Y'].map((r) => `<button class="small" data-act="range" data-r="${r}" aria-pressed="${r === M.range}">${r}</button>`).join('')}</div>
    ${pts.length > 1 ? chart([{ pts, css: pts.at(-1) >= pts[0] ? 'line-up' : 'line-down' }]) : '<p class="muted">No chart data for this range.</p>'}
  </div>
  <div class="grid">
    <form class="card stack" data-form="order"><h2>Buy or sell for me</h2>
      <p class="muted">Cash ${usd(pf.cash_cents)} · You own ${owned ? num(owned.shares) : 0} shares</p><input type="hidden" name="symbol" value="${esc(sym)}">
      ${tradeFields()}<p><button class="primary" type="submit">Place my order</button></p></form>
    <form class="card stack" data-form="request"><h2>Request for the class</h2><input type="hidden" name="symbol" value="${esc(sym)}">
      ${tradeFields(true)}
      <label for="thesis">Why? (required, up to 280 characters)</label><textarea id="thesis" name="thesis" required minlength="10" maxlength="280" rows="3"></textarea>
      <label for="risk">Main risk (optional)</label><input id="risk" name="risk" maxlength="140">
      <p><button class="primary" type="submit">Send request</button></p></form></div>`;
};
const tradeFields = (forClass) => `
  <label>Side</label><select name="side"><option value="buy">Buy</option><option value="sell">Sell</option></select>
  <label>Shares</label><input name="shares" type="number" min="0" step="any" ${forClass ? '' : 'required'}>
  ${forClass ? '<label>…or a dollar amount instead</label><input name="amount" type="number" min="0" step="0.01">' : ''}
  <label>Order type</label><select name="type"><option value="market">Market (fill at the current price)</option><option value="limit">Limit (only at my price or better)</option></select>
  <label>Limit price (limit orders only)</label><input name="limit" type="number" min="0" step="0.01">`;
actions.range = (el) => { M.range = el.dataset.r; route(true); };
forms.search = async ({ q }) => {
  const { results } = await api('/search?q=' + encodeURIComponent(q));
  $('#results').innerHTML = results.length ? `<div class="card"><ul class="feed">${results.map((r) => `<li><a href="#/markets/${esc(r.symbol)}"><strong>${esc(r.symbol)}</strong> · ${esc(r.name)}</a></li>`).join('')}</ul></div>` : '<p class="muted">No matches. Try the ticker symbol.</p>';
  if (/^[A-Za-z.]{1,6}$/.test(q.trim()) && !results.length) location.hash = '#/markets/' + q.trim().toUpperCase();
};
forms.order = async (d) => {
  const { order: o } = await api('/order', d);
  toast(o.status === 'filled' ? `Filled: ${o.side} ${num(o.shares)} ${o.symbol} at ${usd(o.fill_cents)}` : o.status === 'open' ? 'Order saved. It fills when the market is open and the price is right.' : `Order ${o.status}: ${o.note || ''}`);
  route(true);
};
forms.request = async (d, f) => { await api('/requests', d); toast('Request sent to the board'); f.reset(); location.hash = '#/requests'; };
// Keep the price on screen fresh every 30 s while the tab is visible.
setInterval(async () => {
  const card = $('#quotecard');
  if (!card || document.visibilityState !== 'visible') return;
  try {
    const q = (await api('/quote?symbols=' + card.dataset.sym)).quotes[card.dataset.sym];
    if (q) { $('#px').textContent = '$' + q.price.toFixed(2); $('#chg').textContent = `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${pct(q.changePct)})`; $('#chg').className = dir(q.change); $('#badge').innerHTML = badge(q); }
  } catch { /* ignore, next tick retries */ }
}, 30000);

VIEWS.requests = async () => {
  const { requests, members } = await api('/requests');
  const s = boot.club.settings, admin = me.role !== 'member';
  const card = (r) => {
    const size = r.shares ? `${num(r.shares)} shares` : usd(r.amount_cents);
    const voting = s.decisionMode === 'vote' && r.status === 'open';
    const ended = r.vote_ends && Date.now() / 1000 > r.vote_ends;
    return `<div class="card req"><h3>${r.side === 'buy' ? 'Buy' : 'Sell'} ${size} of <a href="#/markets/${esc(r.symbol)}">${esc(r.symbol)}</a> <span class="pill ${r.status}">${r.status}</span></h3>
      <p class="muted">${esc(r.who)} · ${when(r.created)} · ${r.type}${r.limit_cents ? ' @ ' + usd(r.limit_cents) : ''}${r.fill_cents ? ' · filled at ' + usd(r.fill_cents) : ''}</p>
      <p>${esc(r.thesis)}</p>${r.risk ? `<p class="muted">Risk: ${esc(r.risk)}</p>` : ''}${r.note ? `<p class="muted">Note: ${esc(r.note)}</p>` : ''}
      ${voting ? `<p>Votes: 👍 ${r.up} · 👎 ${r.down} · ${ended ? 'voting ended' + (r.pass ? ' (passed)' : ' (did not pass)') : 'voting ends ' + when(r.vote_ends)}
        ${ended ? '' : `<button class="small" data-act="vote" data-id="${r.id}" data-v="1" aria-pressed="${r.mine === 1}">👍 Yes</button> <button class="small" data-act="vote" data-id="${r.id}" data-v="-1" aria-pressed="${r.mine === -1}">👎 No</button>`}</p>` : ''}
      ${admin && r.status === 'open' ? `<div class="row"><input id="n${r.id}" placeholder="Note (optional)" maxlength="200"><button class="small primary" data-act="decide" data-id="${r.id}" data-a="approve">Approve</button><button class="small danger" data-act="decide" data-id="${r.id}" data-a="reject">Reject</button></div>` : ''}
      <details data-id="${r.id}"><summary data-act="comments" data-id="${r.id}">Comments (${r.ncomments})</summary><div id="c${r.id}"></div></details></div>`;
  };
  return `<h1>Request Board</h1>
  <p class="muted">${s.decisionMode === 'vote' ? `Members vote for ${s.voteHours} hours (needs ${s.quorumPct}% of ${members} members to vote and more yes than no), then an admin confirms.` : 'An admin approves or rejects each request.'} Limits: ${s.maxPositionPct}% max per stock, ${s.minCashPct}% cash reserve, ${s.maxRequestsPerDay} requests per day.</p>
  <p><a class="btn primary" href="#/markets">Find a stock to request</a></p>
  ${requests.length ? requests.map(card).join('') : '<p class="muted">No requests yet.</p>'}`;
};
actions.vote = async (el) => { await api('/requests/vote', { id: Number(el.dataset.id), value: Number(el.dataset.v) }); route(true); };
actions.decide = async (el) => {
  const id = Number(el.dataset.id);
  await api('/requests/decide', { id, action: el.dataset.a, note: $('#n' + id)?.value });
  toast(el.dataset.a === 'approve' ? 'Approved' : 'Rejected'); route(true);
};
actions.comments = async (el) => {
  const id = el.dataset.id, box = $('#c' + id);
  const { comments } = await api('/comments?id=' + id);
  box.innerHTML = `<ul class="feed">${comments.map((c) => `<li><strong>${esc(c.who)}</strong> ${esc(c.body)}</li>`).join('') || '<li class="muted">No comments yet.</li>'}</ul>
    <form class="row" data-form="comment"><input type="hidden" name="id" value="${id}"><input name="body" placeholder="Add a comment" maxlength="280" required aria-label="Comment"><button class="small" type="submit">Post</button></form>`;
};
forms.comment = async (d, f) => { await api('/comments', d); actions.comments({ dataset: { id: d.id } }); };

VIEWS.board = async () => {
  const { personal, pitches } = await api('/leaderboard');
  const rows = (a, extra) => a.length ? `<table><tbody>${a.map((p, i) => `<tr><td>${i + 1}</td><td class="l">${esc(p.name)}</td><td class="${dir(p.pct)}">${pct(p.pct)}</td><td class="muted">${extra(p)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nothing to rank yet.</p>';
  return `<h1>Leaderboard</h1><div class="grid"><div class="card"><h2>Personal portfolios</h2>${rows(personal, (p) => usd(p.equity_cents))}</div>
  <div class="card"><h2>Best pitches</h2><p class="muted">Average return of each member's approved ideas since they were bought or sold.</p>${rows(pitches, (p) => p.count + ' idea' + (p.count > 1 ? 's' : ''))}</div></div>`;
};

VIEWS.learn = async () => `<h1>Learn</h1>
  <div class="card"><h2>Why paper trade?</h2><p>Paper trading lets you practice investing with fake money and real prices. You can make mistakes, test ideas and learn how markets move without risking a dollar.</p></div>
  <div class="card"><h2>Glossary</h2><dl>
  ${[['Stock', 'A small piece of ownership in a company.'], ['ETF', 'A basket of many stocks you can buy as one share. SPY holds the 500 biggest US companies.'],
    ['Market order', 'Buy or sell right now at the current price.'], ['Limit order', 'Buy or sell only at your price or better. It may never fill.'],
    ['Diversification', 'Spreading money over many investments so one bad pick hurts less.'], ['P/E ratio', 'Share price divided by yearly profit per share. A high P/E means investors expect growth.'],
    ['Average cost', 'What you paid per share on average across all your buys.'], ['Day P/L', 'How much your holdings gained or lost today.'],
    ['Benchmark', 'A fair yardstick, like SPY, to see whether your picks beat the whole market.']].map(([t, d]) => `<dt><strong>${t}</strong></dt><dd>${d}</dd>`).join('')}</dl></div>`;

VIEWS.admin = async () => {
  const a = await api('/admin/members'), s = a.settings, owner = me.role === 'owner';
  const field = (k, label, v, step = 1) => `<div><label for="s_${k}">${label}</label><input id="s_${k}" name="${k}" type="number" step="${step}" value="${v}"></div>`;
  const sel = (k, label, opts, v) => `<div><label for="s_${k}">${label}</label><select id="s_${k}" name="${k}">${opts.map(([val, t]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
  return `<h1>Admin</h1>
  <div class="card"><h2>Class code</h2><code class="big">${esc(a.code)}</code> ${a.codeOn ? '' : '<span class="pill">disabled</span>'}
    <p class="row"><button data-act="code" data-a="rotate">Make a new code</button><button data-act="code" data-a="${a.codeOn ? 'disable' : 'enable'}">${a.codeOn ? 'Turn code off' : 'Turn code on'}</button>
    <button data-act="code" data-a="approval" data-v="${a.needApproval ? '' : '1'}">${a.needApproval ? 'Stop requiring approval' : 'Require admin approval to join'}</button></p></div>
  ${owner ? `<div class="card"><h2>Admins</h2><p class="muted">A club has up to 3 admins. Send an invite link to each person.</p><button data-act="invite">Create an admin invite link</button>
    ${a.invites.map((t) => `<p><code>${esc(location.origin)}/#/invite/${esc(t)}</code></p>`).join('')}</div>` : ''}
  <div class="card"><h2>Members</h2><div class="scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
  ${a.members.map((m) => `<tr><td>${esc(m.name)}</td><td>${m.role}</td><td>${m.status}</td><td>
    ${m.status === 'pending' ? `<button class="small primary" data-act="member" data-id="${m.id}" data-a="approve">Approve</button>` : ''}
    ${m.role === 'member' || (owner && m.role !== 'owner') ? `<button class="small" data-act="member" data-id="${m.id}" data-a="reset">Reset password</button>` : ''}
    ${m.role === 'member' ? `<button class="small danger" data-act="member" data-id="${m.id}" data-a="remove">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
  <form class="card stack" data-form="settings"><h2>Settings</h2><div class="grid">
    ${field('startCents', 'Personal starting cash ($)', s.startCents / 100)}${field('classStartCents', 'Class portfolio starting cash ($)', s.classStartCents / 100)}
    ${field('commissionCents', 'Commission per order ($)', s.commissionCents / 100, 0.01)}${field('slippageBps', 'Slippage (basis points, 100 = 1%)', s.slippageBps)}
    ${field('maxPositionPct', 'Max one stock (% of fund)', s.maxPositionPct)}${field('minCashPct', 'Minimum cash reserve (%)', s.minCashPct)}
    ${field('maxRequestsPerDay', 'Requests per member per day', s.maxRequestsPerDay)}${field('voteHours', 'Voting window (hours)', s.voteHours)}${field('quorumPct', 'Quorum (% of members that must vote)', s.quorumPct)}
    ${sel('decisionMode', 'How are requests decided?', [['admin', 'An admin approves'], ['vote', 'Members vote, admin confirms']], s.decisionMode)}
    ${sel('closedBehavior', 'When the market is closed', [['queue', 'Wait for the next open'], ['lastclose', 'Fill at the last close']], s.closedBehavior)}
    ${sel('fractional', 'Fractional shares', [['false', 'Whole shares only'], ['true', 'Allow fractions']], String(s.fractional))}</div>
    <p class="muted">Changing starting cash only affects new seasons.</p><button class="primary" type="submit">Save settings</button></form>
  <div class="card"><h2>Data</h2><p><a class="btn" href="/api/admin/export">Download all trades (CSV)</a></p>
  ${owner ? `<form class="row" data-form="season"><div><label for="rs">Start season ${a.season + 1}: type RESET (keeps old trades, gives everyone fresh cash)</label><input id="rs" name="confirm" autocomplete="off"></div><button class="danger" type="submit">Reset season</button></form>` : ''}</div>`;
};
actions.code = async (el) => { await api('/admin/code', { action: el.dataset.a, value: !!el.dataset.v }); if (el.dataset.a === 'approval') boot = await api('/bootstrap'); route(true); };
actions.invite = async () => { await api('/admin/invite', {}); route(true); };
actions.member = async (el) => {
  if (el.dataset.a === 'remove' && !confirm('Remove this member?')) return;
  const r = await api('/admin/member', { id: Number(el.dataset.id), action: el.dataset.a });
  if (r.temp) prompt('Temporary password (tell the member, it will not be shown again):', r.temp);
  route(true);
};
forms.settings = async (d) => {
  const body = { ...d, fractional: d.fractional === 'true' };
  for (const k of ['startCents', 'classStartCents', 'commissionCents']) body[k] = Math.round(Number(d[k]) * 100);
  await api('/admin/settings', body); boot = await api('/bootstrap'); toast('Settings saved');
};
forms.season = async (d) => { await api('/admin/season', d); toast('New season started'); route(true); };

// ---------- start ----------
try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* storage blocked */ }
boot = await api('/bootstrap').catch((e) => { $('#app').innerHTML = `<p class="pad err">${esc(e.message)} <a href="/status">Check site status</a></p>`; throw e; });
me = boot.me;
paint();
