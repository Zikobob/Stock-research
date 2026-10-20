import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBuy, applySell, fillPrice, classBuyProblem, tally, isMarketOpen, roundShares, DEFAULTS } from '../src/trade.js';

test('buy builds an average cost and takes cash', () => {
  const a = applyBuy(null, 10, 10000, 0);            // 10 @ $100.00
  assert.equal(a.cashDelta, -100000);
  const b = applyBuy(a.pos, 10, 12000, 500);         // 10 @ $120.00 + $5 fee
  assert.deepEqual(b.pos, { shares: 20, cost_cents: 100000 + 120000 + 500 });
  assert.equal(b.cashDelta, -120500);
});

test('sell removes cost basis in proportion and reports profit', () => {
  const pos = { shares: 20, cost_cents: 200000 };   // average $100
  const s = applySell(pos, 5, 15000, 0);             // sell 5 @ $150
  assert.equal(s.cashDelta, 75000);
  assert.equal(s.realized, 25000);
  assert.deepEqual(s.pos, { shares: 15, cost_cents: 150000 });
});

test('selling everything closes the position, selling too much fails', () => {
  assert.equal(applySell({ shares: 3, cost_cents: 30000 }, 3, 10000, 0).pos, null);
  assert.throws(() => applySell({ shares: 3, cost_cents: 30000 }, 4, 10000, 0), /Not enough shares/);
  assert.throws(() => applySell(null, 1, 10000, 0), /Not enough shares/);
});

test('slippage always works against the trader and rounds to whole cents', () => {
  assert.equal(fillPrice(10000, 'buy', 10), 10010);
  assert.equal(fillPrice(10000, 'sell', 10), 9990);
  assert.equal(fillPrice(10050, 'buy', 10), 10061);  // 10060.05 rounds up
  assert.equal(fillPrice(10050, 'sell', 10), 10039); // 10039.95 rounds down
  assert.equal(fillPrice(10000, 'buy', 0), 10000);
});

test('whole shares by default, 4 decimals when fractional is on', () => {
  assert.equal(roundShares(2.9, false), 2);
  assert.equal(roundShares(2.123456, true), 2.1234);
});

test('class guardrails: cash, reserve, position size', () => {
  const base = { equity: 10000000, cash: 10000000, held: 0 };
  assert.equal(classBuyProblem({ ...base, costCents: 1500000 }, DEFAULTS), null);
  assert.match(classBuyProblem({ ...base, costCents: 2500000 }, DEFAULTS), /20%/);           // too big a position
  assert.match(classBuyProblem({ ...base, cash: 600000, costCents: 200000 }, DEFAULTS), /reserve/);
  assert.match(classBuyProblem({ ...base, cash: 100, costCents: 200 }, DEFAULTS), /enough cash/);
  assert.match(classBuyProblem({ ...base, held: 1500000, costCents: 600000 }, DEFAULTS), /20%/); // adding to a holding counts
});

test('vote tally needs quorum and a yes majority', () => {
  assert.deepEqual(tally([1, 1, -1], 12, 25), { up: 2, down: 1, quorum: true, pass: true });
  assert.equal(tally([1, 1], 12, 25).quorum, false);          // 2 of 12 is below 25%
  assert.equal(tally([1, 1, -1, -1], 12, 25).pass, false);    // a tie fails
  assert.equal(tally([], 12, 25).pass, false);
});

test('market hours use New York time and skip weekends and holidays', () => {
  assert.equal(isMarketOpen(new Date('2026-10-14T14:00:00Z')), true);   // Wed 10:00 EDT
  assert.equal(isMarketOpen(new Date('2026-10-14T13:00:00Z')), false);  // 9:00 EDT, before open
  assert.equal(isMarketOpen(new Date('2026-10-14T20:00:00Z')), false);  // 16:00 EDT, closed
  assert.equal(isMarketOpen(new Date('2026-10-17T15:00:00Z')), false);  // Saturday
  assert.equal(isMarketOpen(new Date('2026-12-25T15:00:00Z')), false);  // Christmas
  assert.equal(isMarketOpen(new Date('2026-12-14T15:00:00Z')), true);   // 10:00 EST (winter time)
});
