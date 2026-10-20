/**
 * Money: expenses and settle-up payments. The maths itself lives in utils/money.ts.
 */
import { uid } from '@/utils/format';
import { todayInTz } from '@/utils/time';

import type { Expense } from '../types';
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export interface BudgetSlice {
  addExpense: (tripId: string, e: Omit<Expense, 'id'>) => void;
  deleteExpense: (tripId: string, id: string) => void;
  settleUp: (tripId: string, from: string, to: string, amount: number) => void;
}

export const createBudgetSlice: Slice<BudgetSlice> = (set, get) => {
  const { withTrip } = tripHelpers(set, get);
  return {
    addExpense: (tripId, e) =>
      withTrip(tripId, (t) => {
        t.expenses.unshift({ ...e, id: uid('e-') });
      }),

    deleteExpense: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.expenses = t.expenses.filter((x) => x.id !== id);
      }),

    settleUp: (tripId, from, to, amount) =>
      withTrip(tripId, (t) => {
        const toName = t.members.find((m) => m.id === to)?.name.split(' ')[0] ?? 'member';
        t.expenses.unshift({
          id: uid('e-'), title: `Settle-up to ${toName}`, amount: Math.round(amount * 100) / 100, category: 'Other',
          paidBy: from, splitBetween: [to], date: todayInTz('UTC'), settlement: true,
        });
      }),
  };
};
