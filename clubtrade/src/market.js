// Market data layer. Runs on the server only, so the school filter never sees these hosts.
// Every provider returns the same shape: {symbol, price, change, changePct, high, low, open, prevClose,
// volume, asOf, delayed, source}. Prices are dollars here; the API layer converts to cents.
// Provider order: Finnhub -> Twelve Data -> Stooq -> Yahoo. Last good price is served "stale" if all fail.

const QUOTE_TTL = 45, HISTORY_TTL = 600, SEARCH_TTL = 86400, KEEP = 7 * 86400;
const inflight = new Map(); // coalesce identical in-flight requests inside one isolate

const once = (key, fn) => {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
  return inflight.get(key);
};
const num = (x) => (x === null || x === undefined || x === '' || x === 'N/D' ? NaN : Number(x));
const get = async (url, type = 'json') => {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ClubTrade' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return type === 'json' ? r.json() : r.text();
};
const quote = (o) => {
  const change = o.change ?? (o.price - o.prevClose);
  return { delayed: true, asOf: Date.now(), volume: 0, ...o, change, changePct: o.changePct ?? (o.prevClose ? (change / o.prevClose) * 100 : 0) };
};
const csv = (text) => {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const cols = head.split(',').map((c) => c.toLowerCase());
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

// ---------- providers: quotes ----------
const quoteProviders = [
  { name: 'Finnhub', on: (e) => e.FINNHUB_KEY, // GET /quote -> {c,d,dp,h,l,o,pc,t}
    async one(sym, e) {
      const q = await get(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${e.FINNHUB_KEY}`);
      if (!q.c) throw new Error('Finnhub: no price');
      return quote({ symbol: sym, price: q.c, change: q.d, changePct: q.dp, high: q.h, low: q.l, open: q.o, prevClose: q.pc, asOf: q.t * 1000, source: 'Finnhub' });
    } },
  { name: 'Twelve Data', on: (e) => e.TWELVEDATA_KEY, // GET /quote?symbol=A,B -> one object, or {A:{...},B:{...}} for several
    async many(syms, e) {
      const j = await get(`https://api.twelvedata.com/quote?symbol=${syms.join(',')}&apikey=${e.TWELVEDATA_KEY}`);
      const by = syms.length === 1 ? { [syms[0]]: j } : j;
      const out = {};
      for (const s of syms) {
        const q = by[s];
        if (!q || q.status === 'error' || !num(q.close)) continue;
        out[s] = quote({ symbol: s, price: num(q.close), change: num(q.change), changePct: num(q.percent_change), high: num(q.high), low: num(q.low), open: num(q.open), prevClose: num(q.previous_close), volume: num(q.volume) || 0, source: 'Twelve Data' });
      }
      return out;
    } },
  { name: 'Stooq', on: () => true, // CSV: Symbol,Date,Time,Open,High,Low,Close,Volume ("N/D" when unknown). End-of-day/delayed.
    async one(sym) {
      const [r] = csv(await get(`https://stooq.com/q/l/?s=${sym.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`, 'text'));
      const price = num(r?.close);
      if (!price) throw new Error('Stooq: no price');
      // Stooq has no previous close in this feed; day change comes from open.
      return quote({ symbol: sym, price, open: num(r.open), high: num(r.high), low: num(r.low), prevClose: num(r.open), volume: num(r.volume) || 0, source: 'Stooq' });
    } },
  { name: 'Yahoo', on: () => true, // UNOFFICIAL endpoint: no key, can change or break without notice. Last-resort fallback only.
    async one(sym) {
      const r = (await get(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5d&interval=1d`)).chart?.result?.[0];
      if (!r?.meta?.regularMarketPrice) throw new Error('Yahoo: no price');
      const closes = (r.indicators.quote[0].close || []).filter((c) => c != null);
      const m = r.meta;
      return quote({ symbol: sym, price: m.regularMarketPrice, prevClose: closes.length > 1 ? closes[closes.length - 2] : m.chartPreviousClose,
        high: m.regularMarketDayHigh, low: m.regularMarketDayLow, open: closes.at(-1), volume: m.regularMarketVolume || 0, asOf: m.regularMarketTime * 1000, source: 'Yahoo' });
    } },
];

async function fetchQuotes(syms, env) {
  const out = {};
  for (const p of quoteProviders) {
    const need = syms.filter((s) => !out[s]);
    if (!need.length) break;
    if (!p.on(env)) continue;
    try {
      if (p.many) Object.assign(out, await p.many(need, env));
      else await Promise.all(need.map(async (s) => { try { out[s] = await p.one(s, env); } catch { /* try the next provider */ } }));
    } catch { /* provider down: fall through */ }
  }
  return out;
}

/** Quotes for many symbols, shared by the whole class through KV. */
export async function getQuotes(env, symbols) {
  const syms = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const out = {};
  const missing = [];
  await Promise.all(syms.map(async (s) => {
    const hit = await env.KV.get(`q:${s}`, 'json');
    if (hit && Date.now() - hit.at < QUOTE_TTL * 1000) out[s] = hit.q;
    else missing.push(s);
  }));
  if (missing.length) {
    const fresh = env.MOCK_DATA === '1' ? mockQuotes(missing) : await once('q:' + missing.sort().join(), () => fetchQuotes(missing, env));
    await Promise.all(missing.map(async (s) => {
      if (fresh[s]) { out[s] = fresh[s]; await env.KV.put(`q:${s}`, JSON.stringify({ at: Date.now(), q: fresh[s] }), { expirationTtl: KEEP }); }
      else {
        const old = await env.KV.get(`q:${s}`, 'json'); // every provider failed: show the last price, flagged stale
        if (old) out[s] = { ...old.q, stale: true };
      }
    }));
  }
  return out;
}
export const getQuote = async (env, s) => (await getQuotes(env, [s]))[s.toUpperCase()] || null;

// ---------- history ----------
const RANGES = { // Twelve Data interval/size, Yahoo range/interval
  '1D': { td: ['5min', 80], y: ['1d', '5m'] }, '1W': { td: ['30min', 70], y: ['5d', '30m'] },
  '1M': { td: ['1day', 22], y: ['1mo', '1d'] }, '3M': { td: ['1day', 66], y: ['3mo', '1d'] }, '1Y': { td: ['1day', 252], y: ['1y', '1d'] },
};
const SIZE = { '1D': 1, '1W': 5, '1M': 22, '3M': 66, '1Y': 252 };
// Finnhub /stock/candle is paid-only on the free key, so history skips it. Result: [{t: ms, c: close}]
const historyProviders = [
  { on: (e) => e.TWELVEDATA_KEY,
    async run(sym, range, e) {
      const [iv, n] = RANGES[range].td;
      const j = await get(`https://api.twelvedata.com/time_series?symbol=${sym}&interval=${iv}&outputsize=${n}&apikey=${e.TWELVEDATA_KEY}`);
      if (!j.values) throw new Error('Twelve Data: no history');
      return j.values.map((v) => ({ t: Date.parse(v.datetime.replace(' ', 'T') + 'Z'), c: num(v.close) })).reverse();
    } },
  { on: () => true, // UNOFFICIAL, see above
    async run(sym, range) {
      const [r, iv] = RANGES[range].y;
      const res = (await get(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${r}&interval=${iv}`)).chart?.result?.[0];
      const c = res?.indicators?.quote?.[0]?.close;
      if (!c) throw new Error('Yahoo: no history');
      return res.timestamp.map((t, i) => ({ t: t * 1000, c: c[i] })).filter((p) => p.c != null);
    } },
  { on: () => true, // Stooq daily CSV: Date,Open,High,Low,Close,Volume
    async run(sym, range) {
      const rows = csv(await get(`https://stooq.com/q/d/l/?s=${sym.toLowerCase()}.us&i=d`, 'text'));
      if (!rows.length || !num(rows[0].close)) throw new Error('Stooq: no history');
      return rows.slice(-SIZE[range]).map((r) => ({ t: Date.parse(r.date), c: num(r.close) }));
    } },
];

export async function getHistory(env, symbol, range = '1M') {
  const sym = symbol.toUpperCase();
  if (!RANGES[range]) range = '1M';
  const key = `h:${sym}:${range}`;
  const hit = await env.KV.get(key, 'json');
  if (hit && Date.now() - hit.at < HISTORY_TTL * 1000) return hit.points;
  if (env.MOCK_DATA === '1') return mockHistory(sym, SIZE[range] === 1 ? 80 : SIZE[range] * 3);
  const points = await once(key, async () => {
    for (const p of historyProviders) {
      if (!p.on(env)) continue;
      try { const pts = await p.run(sym, range, env); if (pts.length > 1) return pts; } catch { /* next */ }
    }
    return null;
  });
  if (points) { await env.KV.put(key, JSON.stringify({ at: Date.now(), points }), { expirationTtl: KEEP }); return points; }
  return hit?.points || []; // stale beats nothing
}

// ---------- search ----------
export async function search(env, q) {
  q = q.trim().slice(0, 40);
  if (!q) return [];
  const key = 's:' + q.toLowerCase();
  const hit = await env.KV.get(key, 'json');
  if (hit) return hit;
  let list = [];
  if (env.MOCK_DATA !== '1') {
    try {
      if (env.FINNHUB_KEY) { // GET /search -> {result:[{description,displaySymbol,symbol,type}]}
        const j = await get(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${env.FINNHUB_KEY}`);
        list = j.result.filter((r) => (r.type === 'Common Stock' || r.type === 'ETP') && /^[A-Z.]{1,6}$/.test(r.symbol)).map((r) => ({ symbol: r.symbol, name: r.description }));
      } else { // UNOFFICIAL Yahoo search, no key
        const j = await get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`);
        list = j.quotes.filter((r) => ['EQUITY', 'ETF'].includes(r.quoteType) && /^[A-Z.]{1,6}$/.test(r.symbol)).map((r) => ({ symbol: r.symbol, name: r.shortname || r.longname }));
      }
    } catch { /* fall back to the built-in list below */ }
  }
  if (!list.length) list = Object.entries(MOCK_BASE).filter(([s]) => s.startsWith(q.toUpperCase())).map(([symbol]) => ({ symbol, name: symbol }));
  list = list.slice(0, 8);
  if (list.length) await env.KV.put(key, JSON.stringify(list), { expirationTtl: SEARCH_TTL });
  return list;
}

/** Alpha Vantage company overview (P/E etc.). Free tier is 25 calls/day, so cache a full day. */
export async function overview(env, symbol) {
  if (!env.ALPHAVANTAGE_KEY) return null;
  const key = 'o:' + symbol;
  const hit = await env.KV.get(key, 'json');
  if (hit) return hit;
  try {
    const j = await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${env.ALPHAVANTAGE_KEY}`);
    if (!j.Symbol) return null;
    const o = { name: j.Name, sector: j.Sector, pe: j.PERatio, eps: j.EPS, cap: j.MarketCapitalization, dividendYield: j.DividendYield };
    await env.KV.put(key, JSON.stringify(o), { expirationTtl: 86400 });
    return o;
  } catch { return null; }
}

// ---------- provider health, for /status ----------
export async function health(env) {
  const out = [];
  const tests = [
    ['Finnhub', env.FINNHUB_KEY, () => quoteProviders[0].one('SPY', env)],
    ['Twelve Data', env.TWELVEDATA_KEY, () => quoteProviders[1].many(['SPY'], env).then((r) => r.SPY || Promise.reject(new Error('no data')))],
    ['Stooq', true, () => quoteProviders[2].one('SPY', env)],
    ['Yahoo (unofficial)', true, () => quoteProviders[3].one('SPY', env)],
  ];
  for (const [name, on, run] of tests) {
    if (!on) { out.push({ name, state: 'no key set' }); continue; }
    try { const q = await run(); out.push({ name, state: 'ok', price: q.price }); }
    catch (e) { out.push({ name, state: 'failed: ' + e.message }); }
  }
  return out;
}

// ---------- demo data (MOCK_DATA=1): a stable fake market so the UI works with no keys ----------
const MOCK_BASE = { SPY: 520, QQQ: 450, VTI: 265, AAPL: 190, MSFT: 420, GOOGL: 170, AMZN: 185, NVDA: 120, TSLA: 240, META: 500, DIS: 105, NKE: 95, KO: 62, MCD: 290, SBUX: 85, NFLX: 640, AMD: 160, COST: 800, WMT: 68, JPM: 200, V: 275, T: 17 };
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const wave = (sym, t) => 1 + 0.04 * Math.sin(t / 3.6e6 + hash(sym)) + 0.015 * Math.sin(t / 4e5 + hash(sym) * 2);
function mockQuotes(syms) {
  const out = {};
  for (const s of syms) {
    const base = MOCK_BASE[s] || 20 + (hash(s) % 200);
    const now = Date.now(), price = +(base * wave(s, now)).toFixed(2), prevClose = +(base * wave(s, now - 864e5)).toFixed(2);
    out[s] = quote({ symbol: s, price, prevClose, high: +(price * 1.01).toFixed(2), low: +(price * 0.99).toFixed(2), open: prevClose, volume: 1e6 + hash(s) % 5e6, delayed: false, source: 'Demo data' });
  }
  return out;
}
function mockHistory(sym, n) {
  const base = MOCK_BASE[sym] || 20 + (hash(sym) % 200), now = Date.now();
  return Array.from({ length: n }, (_, i) => { const t = now - (n - 1 - i) * 36e5 * 6; return { t, c: +(base * wave(sym, t)).toFixed(2) }; });
}
