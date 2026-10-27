/**
 * The Budget tab's small rules, with no React in them so they can be tested: what state the budget is in, how a balance is worded, how
 * expenses group under day headings, what a half-typed expense looks like, and how the settle-up plan is explained.
 */
import type { Expense, ExpenseCategory } from '@/store/types';
import { dayLabel, weekdayShort } from '@/utils/time';

// ---------------------------------------------------------------------------------------------
// How the budget is doing

export type BudgetTone = 'ok' | 'warn' | 'over' | 'none';

export interface BudgetState {
  tone: BudgetTone;
  /** The state in words, for the stamp: a colour is never the only signal. */
  label: string;
  /** Ionicons line icon for the stamp. */
  icon: 'checkmark-circle-outline' | 'alert-circle-outline' | 'warning-outline' | 'remove-circle-outline';
  /** spent / budget, 0 when there is no budget. Can be above 1. */
  ratio: number;
  /** Whole percent of the budget used. */
  pct: number;
}

/** Under 80% of the budget is on track, 80 to 100% is close, above 100% is over. With no budget set there is no state to judge. */
export function budgetState(spent: number, budget: number): BudgetState {
  if (!(budget > 0)) return { tone: 'none', label: 'No limit', icon: 'remove-circle-outline', ratio: 0, pct: 0 };
  const ratio = Math.max(0, spent) / budget;
  const pct = Math.round(ratio * 100);
  if (ratio > 1) return { tone: 'over', label: 'Over budget', icon: 'warning-outline', ratio, pct };
  if (ratio >= 0.8) return { tone: 'warn', label: 'Close', icon: 'alert-circle-outline', ratio, pct };
  return { tone: 'ok', label: 'On track', icon: 'checkmark-circle-outline', ratio, pct };
}

/** The small label above the big number: what is left, or how far over the group is. */
export const leftLabel = (remaining: number) => (remaining < 0 ? 'Over by' : 'Left to spend');

/** How wide each category is in the stacked bar, as a share (0 to 1) of the bar. The bar is the budget, unless spending has gone past it. */
export function barShares(parts: [string, number][], budget: number): { key: string; share: number }[] {
  const spent = parts.reduce((s, [, v]) => s + v, 0);
  const whole = Math.max(budget, spent);
  if (!(whole > 0)) return [];
  return parts.filter(([, v]) => v > 0).map(([key, v]) => ({ key, share: v / whole }));
}

/** The biggest the numeral can be (in points) for a text of this many characters, so a long amount shrinks instead of wrapping. */
export function amountSize(chars: number): number {
  return Math.min(56, Math.max(26, Math.floor(290 / (Math.max(1, chars) * 0.58))));
}

// ---------------------------------------------------------------------------------------------
// Who owes who

/** A balance under 50 cents counts as square: the same line the settle-up plan uses. */
export const SQUARE_BELOW = 0.5;

export type BalanceTone = 'owes' | 'gets' | 'square';

export interface BalanceView {
  tone: BalanceTone;
  /** What goes before the amount: "owes", "gets back", or "all square" (which has no amount). */
  word: 'owes' | 'gets back' | 'all square';
  /** Always positive; 0 when square. */
  amount: number;
}

/** A balance in dollars (positive = is owed money) turned into words and a signed meaning. */
export function balanceView(balance: number): BalanceView {
  if (Math.abs(balance) < SQUARE_BELOW) return { tone: 'square', word: 'all square', amount: 0 };
  return balance > 0 ? { tone: 'gets', word: 'gets back', amount: balance } : { tone: 'owes', word: 'owes', amount: -balance };
}

/** The whole sentence a screen reader says for a row: "You owe $382", "Priya gets back $1,129", "Sam is all square". */
export function balanceSentence(name: string, isYou: boolean, balance: number, fmt: (usd: number) => string): string {
  const v = balanceView(balance);
  if (v.tone === 'square') return isYou ? 'You are all square' : `${name} is all square`;
  if (v.tone === 'owes') return isYou ? `You owe ${fmt(v.amount)}` : `${name} owes ${fmt(v.amount)}`;
  return isYou ? `You get back ${fmt(v.amount)}` : `${name} gets back ${fmt(v.amount)}`;
}

/** True when there is something to settle: at least one real expense and nobody is more than a few cents away from square. */
export function isSettled(hasExpenses: boolean, planLength: number): boolean {
  return hasExpenses && planLength === 0;
}

/** Plain words for the settle-up sheet: why these payments, and why there are so few. */
export function settleExplain(payments: number): string {
  if (payments <= 0) return 'Everyone paid their share. Nobody owes anybody.';
  const count = payments === 1 ? 'One payment clears every balance.' : `${payments} payments clear every balance, the fewest possible.`;
  return `${count} We add up what each person paid and what they owe, so money only moves from people who owe to people who are owed.`;
}

// ---------------------------------------------------------------------------------------------
// Expenses under day headings

export interface DayGroup {
  date: string;
  items: Expense[];
  /** What the group spent that day (settle-up payments are not spending). */
  total: number;
}

/**
 * Newest day first; inside a day the order the expenses were logged in is kept (the store adds the newest to the front).
 * `limit` shows only the newest N expenses, and `hidden` says how many are left out.
 */
export function groupByDay(expenses: Expense[], limit = Infinity): { groups: DayGroup[]; hidden: number } {
  const sorted = expenses.map((e, i) => ({ e, i })).sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : a.i - b.i));
  const shown = sorted.slice(0, limit).map((x) => x.e);
  const groups: DayGroup[] = [];
  for (const e of shown) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
      if (!e.settlement) last.total += e.amount;
    } else groups.push({ date: e.date, items: [e], total: e.settlement ? 0 : e.amount });
  }
  return { groups, hidden: Math.max(0, sorted.length - shown.length) };
}

/** "Today · Oct 20", "Yesterday · Oct 19", "Tue · Oct 13". */
export function dayHeading(date: string, today: string): string {
  const shortDate = dayLabel(date);
  if (date === today) return `Today · ${shortDate}`;
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (date === y.toISOString().slice(0, 10)) return `Yesterday · ${shortDate}`;
  return `${weekdayShort(date)} · ${shortDate}`;
}

// ---------------------------------------------------------------------------------------------
// The half-typed expense

/**
 * What the Add expense sheet keeps while it is closed. `paidBy: null` means "me" and `split: null` means "everyone", so a draft
 * never holds on to a person who has left the trip, and it follows the crew if people join before it is sent.
 */
export interface ExpenseDraft {
  title: string;
  amount: string;
  /** The currency the amount is typed in: USD or the destination's. */
  cur: string;
  cat: ExpenseCategory;
  /** True once the person picked a category themselves; until then it follows the words in the title. */
  catTouched: boolean;
  paidBy: string | null;
  split: string[] | null;
  /** Receipt photo uri. */
  receipt: string | null;
}

export const EMPTY_DRAFT: ExpenseDraft = { title: '', amount: '', cur: 'USD', cat: 'Other', catTouched: false, paidBy: null, split: null, receipt: null };

/** Anything typed at all? (Decides whether a draft is worth mentioning.) */
export const draftHasContent = (d: ExpenseDraft) => !!(d.title.trim() || d.amount.trim() || d.receipt);

/** Who the expense is split between right now: everyone when untouched, otherwise the chosen people who are still on the trip. */
export function activeSplit(split: string[] | null, memberIds: string[]): string[] {
  return split === null ? memberIds : split.filter((id) => memberIds.includes(id));
}

/** Who paid right now: the person, unless the draft names someone who is no longer on the trip. */
export function activePayer(paidBy: string | null, userId: string, memberIds: string[]): string {
  return paidBy && memberIds.includes(paidBy) ? paidBy : userId;
}

/** "Paid by you · split with everyone", "Paid by Diego · split between 3", "Paid by you · just for you". */
export function summaryLine(payer: string, split: string[], memberIds: string[], userId: string): string {
  const everyone = split.length === memberIds.length;
  const who = everyone ? 'split with everyone' : split.length === 1 && split[0] === userId ? 'just for you' : `split between ${split.length}`;
  return `Paid by ${payer} · ${who}`;
}
