/**
 * Group-expense maths. Pure functions with no React or storage imports, so they are easy to test.
 * Everything is computed in whole cents internally: floating-point dollars drift (0.1 + 0.2 !== 0.3).
 */
import type { Trip } from '@/store/types';

type Ledger = Pick<Trip, 'members' | 'expenses'>;
export interface Transfer {
  from: string;
  to: string;
  /** Dollars, rounded to cents. */
  amount: number;
}

export const toCents = (dollars: number) => Math.round(dollars * 100);

/** Total spent by the group (settlement payments are not spending). */
export function totalSpent(t: Pick<Trip, 'expenses'>): number {
  return t.expenses.filter((e) => !e.settlement).reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Net balance per member in cents: positive = is owed money, negative = owes money.
 * An expense is split equally; when it does not divide evenly the extra cents go to the first people in the
 * split, so the balances always add up to exactly zero.
 */
export function balancesCents(t: Ledger): Record<string, number> {
  const bal: Record<string, number> = {};
  t.members.forEach((m) => (bal[m.id] = 0));
  for (const e of t.expenses) {
    const split = e.splitBetween.filter((id) => id in bal);
    if (!split.length) continue;
    const cents = toCents(e.amount);
    const base = Math.floor(cents / split.length);
    const extra = cents - base * split.length;
    bal[e.paidBy] = (bal[e.paidBy] ?? 0) + cents;
    split.forEach((id, i) => (bal[id] -= base + (i < extra ? 1 : 0)));
  }
  return bal;
}

/** Same as {@link balancesCents} but in dollars, for display. */
export function balances(t: Ledger): Record<string, number> {
  return Object.fromEntries(Object.entries(balancesCents(t)).map(([id, c]) => [id, c / 100]));
}

const MAX_EXACT = 12; // 2^12 subsets is instant; beyond that we use the simple greedy plan
const DUST_CENTS = 50; // a balance under 50 cents counts as settled

/**
 * Fewest payments that settle everyone up.
 * The minimum number of payments is (people with a balance) minus (the most separate groups whose balances add
 * up to zero): each such group can settle among itself with one fewer payment than it has people.
 * We find that maximum by dynamic programming over subsets, then settle each group greedily.
 */
export function settlePlan(t: Ledger): Transfer[] {
  const people = Object.entries(balancesCents(t))
    .filter(([, c]) => c !== 0)
    .map(([id, c]) => ({ id, c }))
    .sort((a, b) => b.c - a.c || a.id.localeCompare(b.id));
  const groups = people.length <= MAX_EXACT ? zeroSumGroups(people.map((p) => p.c)) : [people.map((_, i) => i)];
  const plan: Transfer[] = [];
  for (const g of groups) plan.push(...greedyGroup(g.map((i) => people[i])));
  return plan.filter((p) => p.amount * 100 >= DUST_CENTS);
}

/** Splits balances (summing to 0) into the maximum number of groups that each sum to 0. Returns index groups. */
export function zeroSumGroups(values: number[]): number[][] {
  const n = values.length;
  if (n === 0) return [];
  const full = (1 << n) - 1;
  const sum = new Array<number>(1 << n).fill(0);
  for (let m = 1; m <= full; m++) {
    const low = m & -m;
    sum[m] = sum[m ^ low] + values[31 - Math.clz32(low)];
  }
  const best = new Array<number>(1 << n).fill(0);
  const prev = new Array<number>(1 << n).fill(0);
  for (let m = 1; m <= full; m++) {
    let bestPrev = 0;
    let bestVal = -1;
    for (let i = 0; i < n; i++) {
      if (!(m & (1 << i))) continue;
      const p = m ^ (1 << i);
      if (best[p] > bestVal) {
        bestVal = best[p];
        bestPrev = p;
      }
    }
    best[m] = bestVal + (sum[m] === 0 ? 1 : 0);
    prev[m] = bestPrev;
  }
  // Walk back from the full set: every mask on the path with a zero sum closes one group.
  const closers: number[] = [];
  for (let m = full; m !== 0; m = prev[m]) if (sum[m] === 0) closers.push(m);
  closers.reverse();
  const groups: number[][] = [];
  let before = 0;
  for (const m of closers) {
    const g = m & ~before;
    groups.push(Array.from({ length: n }, (_, i) => i).filter((i) => g & (1 << i)));
    before = m;
  }
  return groups;
}

/** Pairs the biggest debtor with the biggest creditor until everyone in the group is square. */
function greedyGroup(people: { id: string; c: number }[]): Transfer[] {
  const debtors = people.filter((p) => p.c < 0).map((p) => ({ id: p.id, v: -p.c })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const creditors = people.filter((p) => p.c > 0).map((p) => ({ id: p.id, v: p.c })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt / 100 });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}
