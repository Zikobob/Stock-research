// Pure trading rules: no database, no network. Everything here is unit-tested (tests/trade.test.js).

export const DEFAULTS = {
  startCents: 10000000,     // $100,000 per personal portfolio
  classStartCents: 10000000,
  slippageBps: 0,
  commissionCents: 0,
  fractional: false,
  closedBehavior: 'queue',  // 'queue' = wait for next open, 'lastclose' = fill at last price now
  decisionMode: 'admin',    // 'admin' or 'vote'
  voteHours: 24,
  quorumPct: 25,
  maxPositionPct: 20,
  minCashPct: 5,
  maxRequestsPerDay: 3,
};

export const toCents = (dollars) => Math.round(Number(dollars) * 100);
export const roundShares = (n, fractional) => (fractional ? Math.floor(n * 1e4) / 1e4 : Math.floor(n));

/** Price after slippage: buyers pay a bit more, sellers get a bit less. Always whole cents. */
export function fillPrice(quoteCents, side, slippageBps) {
  const f = quoteCents * slippageBps / 1e4;
  return side === 'buy' ? Math.ceil(quoteCents + f) : Math.floor(quoteCents - f);
}

/** Buy: returns the new position and the cash that leaves the account. */
export function applyBuy(pos, shares, priceCents, feeCents) {
  const gross = Math.round(shares * priceCents);
  const cash = gross + feeCents;
  return {
    cashDelta: -cash,
    pos: { shares: round4((pos?.shares || 0) + shares), cost_cents: (pos?.cost_cents || 0) + cash },
  };
}

/** Sell: removes cost basis in proportion to the shares sold. Returns null pos when fully sold. */
export function applySell(pos, shares, priceCents, feeCents) {
  if (!pos || shares > pos.shares + 1e-9) throw new Error('Not enough shares');
  const proceeds = Math.round(shares * priceCents) - feeCents;
  const left = round4(pos.shares - shares);
  const costOut = left <= 0 ? pos.cost_cents : Math.round(pos.cost_cents * shares / pos.shares);
  return {
    cashDelta: proceeds,
    realized: proceeds - costOut,
    pos: left <= 0 ? null : { shares: left, cost_cents: pos.cost_cents - costOut },
  };
}
const round4 = (n) => Math.round(n * 1e4) / 1e4;

/** Can this buy go ahead in the class fund? Returns an error string or null. */
export function classBuyProblem({ equity, cash, held, costCents }, s) {
  if (costCents > cash) return 'The fund does not have enough cash';
  if ((cash - costCents) < equity * s.minCashPct / 100) return `That would leave less than the ${s.minCashPct}% cash reserve`;
  if ((held + costCents) > equity * s.maxPositionPct / 100) return `That would be more than ${s.maxPositionPct}% of the fund in one stock`;
  return null;
}

/** Vote tally: passes with enough voters (quorum) AND more yes than no. */
export function tally(votes, memberCount, quorumPct) {
  const up = votes.filter((v) => v === 1).length;
  const down = votes.filter((v) => v === -1).length;
  const quorum = (up + down) >= Math.max(1, Math.ceil(memberCount * quorumPct / 100));
  return { up, down, quorum, pass: quorum && up > down };
}

// ---- US market hours (regular session only; early closes are ignored) ----
// shortcut: holiday list ends in 2027, add the next year's dates then.
const HOLIDAYS = new Set([
  '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25',
  '2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-11-25','2027-12-24',
]);
const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });

export function etParts(date = new Date()) {
  const p = Object.fromEntries(ET.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: p.weekday };
}
export function isTradingDay(date = new Date()) {
  const { day, weekday } = etParts(date);
  return weekday !== 'Sat' && weekday !== 'Sun' && !HOLIDAYS.has(day);
}
export function isMarketOpen(date = new Date()) {
  const { minutes } = etParts(date);
  return isTradingDay(date) && minutes >= 570 && minutes < 960; // 9:30 - 16:00 New York
}
