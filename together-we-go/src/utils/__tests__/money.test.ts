import type { Expense, Member, Trip } from '@/store/types';
import { balances, balancesCents, settlePlan, totalSpent, zeroSumGroups } from '../money';

const member = (id: string): Member => ({ id, name: id, role: 'Member' });
let n = 0;
const exp = (paidBy: string, amount: number, splitBetween: string[], extra: Partial<Expense> = {}): Expense => ({
  id: `e${n++}`, title: 'x', amount, category: 'Food', paidBy, splitBetween, date: '2026-01-01', ...extra,
});
const ledger = (ids: string[], expenses: Expense[]): Pick<Trip, 'members' | 'expenses'> => ({ members: ids.map(member), expenses });
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

/** Applies a settle-up plan as settlement expenses, the way the app records payments. */
const applyPlan = (t: Pick<Trip, 'members' | 'expenses'>) =>
  ({ ...t, expenses: [...t.expenses, ...settlePlan(t).map((p) => exp(p.from, p.amount, [p.to], { settlement: true }))] });

describe('balances', () => {
  it('credits the payer and charges everyone in the split', () => {
    const b = balances(ledger(['a', 'b', 'c'], [exp('a', 90, ['a', 'b', 'c'])]));
    expect(b).toEqual({ a: 60, b: -30, c: -30 });
  });

  it('gives the odd cents to the first people so the total stays exactly zero', () => {
    const b = balancesCents(ledger(['a', 'b', 'c'], [exp('a', 10, ['a', 'b', 'c'])]));
    expect(b).toEqual({ a: 666, b: -333, c: -333 }); // $10.00 / 3 = 3.34 + 3.33 + 3.33: a's own share is the 3.34
    expect(sum(b)).toBe(0);
  });

  it('ignores split members who are no longer in the trip', () => {
    const b = balances(ledger(['a', 'b'], [exp('a', 100, ['a', 'b', 'ghost'])]));
    expect(b).toEqual({ a: 50, b: -50 });
  });

  it('is exact for amounts that break floating point (0.1 + 0.2)', () => {
    const b = balancesCents(ledger(['a', 'b'], [exp('a', 0.1, ['b']), exp('a', 0.2, ['b'])]));
    expect(b).toEqual({ a: 30, b: -30 });
  });
});

describe('totalSpent', () => {
  it('does not count settle-up payments as spending', () => {
    const t = ledger(['a', 'b'], [exp('a', 40, ['a', 'b']), exp('b', 25, ['a'], { settlement: true })]);
    expect(totalSpent(t)).toBe(40);
  });
});

describe('settlePlan', () => {
  it('is empty when everyone is square', () => {
    expect(settlePlan(ledger(['a', 'b'], [exp('a', 20, ['a', 'b']), exp('b', 20, ['a', 'b'])]))).toEqual([]);
  });

  it('pays the right person the right amount', () => {
    const t = ledger(['a', 'b', 'c'], [exp('a', 90, ['a', 'b', 'c'])]);
    expect(settlePlan(t)).toEqual([{ from: 'b', to: 'a', amount: 30 }, { from: 'c', to: 'a', amount: 30 }]);
  });

  it('zeroes every balance once the plan is paid', () => {
    const t = ledger(['a', 'b', 'c', 'd'], [exp('a', 120, ['a', 'b', 'c', 'd']), exp('b', 45.5, ['b', 'c']), exp('d', 10, ['a', 'd'])]);
    const after = balances(applyPlan(t));
    Object.values(after).forEach((v) => expect(Math.abs(v)).toBeLessThan(0.51));
    expect(settlePlan(applyPlan(t))).toEqual([]);
  });

  it('finds fewer payments than the simple largest-first method when the group splits into pairs', () => {
    // Balances: p +6, q +5 are owed; r -3, s -3, u -5 owe. {p,r,s} and {q,u} each add up to zero,
    // so 3 payments are enough, while largest-first needs 4.
    const t = ledger(['p', 'q', 'r', 's', 'u'], [
      exp('p', 6, ['r', 's']), // p paid 6 for r and s -> r -3, s -3, p +6
      exp('q', 5, ['u']), //      q paid 5 for u      -> u -5, q +5
    ]);
    const plan = settlePlan(t);
    expect(plan).toHaveLength(3);
    expect(plan).toContainEqual({ from: 'u', to: 'q', amount: 5 });
  });

  it('never needs more than (people - 1) payments and always settles exactly', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let round = 0; round < 60; round++) {
      const size = 2 + Math.floor(rnd() * 7);
      const ids = Array.from({ length: size }, (_, i) => `m${i}`);
      const expenses = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => {
        const split = ids.filter(() => rnd() < 0.6);
        return exp(ids[Math.floor(rnd() * size)], Math.round(rnd() * 20000) / 100 + 1, split.length ? split : [ids[0]]);
      });
      const t = ledger(ids, expenses);
      const plan = settlePlan(t);
      expect(plan.length).toBeLessThanOrEqual(size - 1);
      Object.values(balances(applyPlan(t))).forEach((v) => expect(Math.abs(v)).toBeLessThan(0.51));
    }
  });
});

describe('zeroSumGroups', () => {
  it('splits into the most groups that each add up to zero', () => {
    expect(zeroSumGroups([5, -5, 3, -3]).map((g) => g.length).sort()).toEqual([2, 2]);
    expect(zeroSumGroups([6, 5, -3, -3, -5])).toHaveLength(2);
    expect(zeroSumGroups([4, 3, -5, -2])).toHaveLength(1);
    expect(zeroSumGroups([])).toEqual([]);
  });
});
