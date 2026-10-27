import type { Expense } from '@/store/types';

import {
  EMPTY_DRAFT,
  activePayer,
  activeSplit,
  amountSize,
  balanceSentence,
  balanceView,
  barShares,
  budgetState,
  dayHeading,
  draftHasContent,
  groupByDay,
  isSettled,
  leftLabel,
  settleExplain,
  summaryLine,
} from '../logic';

const exp = (over: Partial<Expense>): Expense => ({
  id: 'e',
  title: 'Dinner',
  amount: 10,
  category: 'Food',
  paidBy: 'a',
  splitBetween: ['a', 'b'],
  date: '2026-10-20',
  ...over,
});

describe('budgetState', () => {
  it('is on track under 80 percent', () => {
    expect(budgetState(0, 4000)).toMatchObject({ tone: 'ok', label: 'On track', pct: 0 });
    expect(budgetState(3199, 4000)).toMatchObject({ tone: 'ok', label: 'On track' });
  });
  it('is close from 80 to 100 percent, both ends included', () => {
    expect(budgetState(3200, 4000)).toMatchObject({ tone: 'warn', label: 'Close', pct: 80 });
    expect(budgetState(4000, 4000)).toMatchObject({ tone: 'warn', label: 'Close', pct: 100 });
  });
  it('is over above 100 percent', () => {
    expect(budgetState(4001, 4000)).toMatchObject({ tone: 'over', label: 'Over budget' });
    expect(budgetState(5000, 4000).pct).toBe(125);
  });
  it('has nothing to judge without a budget', () => {
    expect(budgetState(100, 0).tone).toBe('none');
    expect(budgetState(100, -5).label).toBe('No limit');
  });
  it('never goes below zero', () => {
    expect(budgetState(-20, 100).ratio).toBe(0);
  });
  it('always has an icon, so the state is never colour alone', () => {
    for (const spent of [0, 3500, 9000]) expect(budgetState(spent, 4000).icon).toMatch(/-outline$/);
  });
});

describe('leftLabel', () => {
  it('says what is left, or how far over', () => {
    expect(leftLabel(1914)).toBe('Left to spend');
    expect(leftLabel(0)).toBe('Left to spend');
    expect(leftLabel(-12)).toBe('Over by');
  });
});

describe('barShares', () => {
  it('makes the bar the budget while there is room', () => {
    const s = barShares([['Stays', 1000], ['Food', 500]], 2000);
    expect(s).toEqual([{ key: 'Stays', share: 0.5 }, { key: 'Food', share: 0.25 }]);
  });
  it('makes the bar the spending once it has gone past the budget, so it fills exactly', () => {
    const s = barShares([['Stays', 3000], ['Food', 1000]], 2000);
    expect(s.reduce((n, x) => n + x.share, 0)).toBeCloseTo(1);
  });
  it('skips empty categories and copes with no budget', () => {
    expect(barShares([['Food', 0]], 100)).toEqual([]);
    expect(barShares([], 0)).toEqual([]);
  });
});

describe('amountSize', () => {
  it('is biggest for short amounts and shrinks for long ones', () => {
    expect(amountSize(6)).toBe(56);
    expect(amountSize(10)).toBeLessThan(amountSize(8));
    expect(amountSize(40)).toBe(26);
    expect(amountSize(0)).toBe(56);
  });
});

describe('balanceView', () => {
  it('words an amount owed, an amount to get back and a square balance', () => {
    expect(balanceView(-382)).toEqual({ tone: 'owes', word: 'owes', amount: 382 });
    expect(balanceView(1129)).toEqual({ tone: 'gets', word: 'gets back', amount: 1129 });
    expect(balanceView(0)).toEqual({ tone: 'square', word: 'all square', amount: 0 });
  });
  it('treats anything under 50 cents as square, on both sides', () => {
    expect(balanceView(0.49).tone).toBe('square');
    expect(balanceView(-0.49).tone).toBe('square');
    expect(balanceView(0.5).tone).toBe('gets');
    expect(balanceView(-0.5).tone).toBe('owes');
  });
});

describe('balanceSentence', () => {
  const fmt = (n: number) => `$${n}`;
  it('speaks to you and about others', () => {
    expect(balanceSentence('You', true, -382, fmt)).toBe('You owe $382');
    expect(balanceSentence('Diego', false, -436, fmt)).toBe('Diego owes $436');
    expect(balanceSentence('Priya', false, 1129, fmt)).toBe('Priya gets back $1129');
    expect(balanceSentence('You', true, 90, fmt)).toBe('You get back $90');
    expect(balanceSentence('Sam', false, 0, fmt)).toBe('Sam is all square');
    expect(balanceSentence('You', true, 0.2, fmt)).toBe('You are all square');
  });
});

describe('isSettled', () => {
  it('needs real expenses and an empty plan, so a new trip is not "settled"', () => {
    expect(isSettled(true, 0)).toBe(true);
    expect(isSettled(true, 2)).toBe(false);
    expect(isSettled(false, 0)).toBe(false);
  });
});

describe('settleExplain', () => {
  it('counts the payments in plain words', () => {
    expect(settleExplain(3)).toMatch(/^3 payments clear every balance, the fewest possible\./);
    expect(settleExplain(3)).toMatch(/money only moves from people who owe to people who are owed/);
    expect(settleExplain(1)).toMatch(/^One payment clears every balance\./);
    expect(settleExplain(0)).toMatch(/Nobody owes anybody/);
  });
});

describe('groupByDay', () => {
  const list = [
    exp({ id: 'a', date: '2026-10-19', amount: 30 }),
    exp({ id: 'b', date: '2026-10-20', amount: 50 }),
    exp({ id: 'c', date: '2026-10-20', amount: 20 }),
    exp({ id: 'd', date: '2026-10-20', amount: 99, settlement: true }),
  ];
  it('puts the newest day first and keeps the logged order inside a day', () => {
    const { groups, hidden } = groupByDay(list);
    expect(groups.map((g) => g.date)).toEqual(['2026-10-20', '2026-10-19']);
    expect(groups[0].items.map((e) => e.id)).toEqual(['b', 'c', 'd']);
    expect(hidden).toBe(0);
  });
  it('leaves settle-up payments out of a day total', () => {
    expect(groupByDay(list).groups[0].total).toBe(70);
  });
  it('shows only the newest N and says how many are left out', () => {
    const { groups, hidden } = groupByDay(list, 2);
    expect(groups.flatMap((g) => g.items.map((e) => e.id))).toEqual(['b', 'c']);
    expect(hidden).toBe(2);
  });
  it('handles no expenses', () => {
    expect(groupByDay([])).toEqual({ groups: [], hidden: 0 });
  });
  it('does not change the list it is given', () => {
    const copy = list.map((e) => e.id);
    groupByDay(list);
    expect(list.map((e) => e.id)).toEqual(copy);
  });
});

describe('dayHeading', () => {
  it('names today and yesterday, and otherwise the weekday', () => {
    expect(dayHeading('2026-10-20', '2026-10-20')).toBe('Today · Oct 20');
    expect(dayHeading('2026-10-19', '2026-10-20')).toBe('Yesterday · Oct 19');
    expect(dayHeading('2026-10-13', '2026-10-20')).toBe('Tue · Oct 13');
  });
  it('knows yesterday across a month end', () => {
    expect(dayHeading('2026-09-30', '2026-10-01')).toBe('Yesterday · Sep 30');
  });
});

describe('the half-typed expense', () => {
  const members = ['m1', 'm2', 'm3'];
  it('starts empty and notices when something was typed', () => {
    expect(draftHasContent(EMPTY_DRAFT)).toBe(false);
    expect(draftHasContent({ ...EMPTY_DRAFT, amount: ' 12 ' })).toBe(true);
    expect(draftHasContent({ ...EMPTY_DRAFT, title: '   ' })).toBe(false);
    expect(draftHasContent({ ...EMPTY_DRAFT, receipt: 'file://r.jpg' })).toBe(true);
  });
  it('splits between everyone until someone is picked, and forgets people who left', () => {
    expect(activeSplit(null, members)).toEqual(members);
    expect(activeSplit(['m1', 'gone'], members)).toEqual(['m1']);
    expect(activeSplit([], members)).toEqual([]);
  });
  it('is paid by you unless the draft names someone still on the trip', () => {
    expect(activePayer(null, 'm1', members)).toBe('m1');
    expect(activePayer('m2', 'm1', members)).toBe('m2');
    expect(activePayer('gone', 'm1', members)).toBe('m1');
  });
  it('reads as one line', () => {
    expect(summaryLine('you', members, members, 'm1')).toBe('Paid by you · split with everyone');
    expect(summaryLine('Diego', ['m1', 'm2'], members, 'm1')).toBe('Paid by Diego · split between 2');
    expect(summaryLine('you', ['m1'], members, 'm1')).toBe('Paid by you · just for you');
  });
});
