import { useState } from 'react';
import { View } from 'react-native';

import { AddExpenseSheet } from '@/components/budget/AddExpenseSheet';
import { BalancesCard } from '@/components/budget/BalancesCard';
import { BudgetCapSheet } from '@/components/budget/BudgetCapSheet';
import { DailyPlanner } from '@/components/budget/DailyPlanner';
import { ExpenseDetailSheet } from '@/components/budget/ExpenseDetailSheet';
import { ExpensesSection } from '@/components/budget/ExpensesSection';
import { MoreTools } from '@/components/budget/MoreTools';
import { SettleSheet } from '@/components/budget/SettleSheet';
import { SpendSummary } from '@/components/budget/SpendSummary';
import { CurrencyConverter } from '@/components/CurrencyConverter';
import { NoTrip } from '@/components/trip/NoTrip';
import { Fab } from '@/components/ui/Fab';
import { Screen, Header } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SectionHeader } from '@/components/ui/bits';
import { destinationById } from '@/data/destinations';
import { useRatesLoader } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import type { Expense } from '@/store/types';
import { totalSpent, useActiveTrip, useAppStore } from '@/store/useAppStore';
import { space } from '@/theme';
import { money } from '@/utils/format';
import { daysBetween, todayInTz } from '@/utils/time';

export default function Budget() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <BudgetInner key={trip.id} />;
}

/**
 * The Budget tab. From the top: a summary ink pass (what is left, how it is going, where it went), who owes who with a Settle up button,
 * the expenses as a receipt, and the rarely used tools folded away. The one main action is the Expense button in the corner.
 * It owns the few things the parts share (home or local currency, which sheet is open) and hands the rest to components/budget.
 */
function BudgetInner() {
  const t = useT();
  useRatesLoader();
  const trip = useActiveTrip()!;
  const rates = useRates();
  const home = useAppStore((s) => s.settings.homeCurrency);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const dest = destinationById(trip.destinationId);
  const local = dest?.currency ?? 'EUR';

  const [view, setView] = useState<'home' | 'local'>('home');
  const [conv, setConv] = useState<[string, string]>([home, local === home ? 'EUR' : local]);
  const [detail, setDetail] = useState<Expense | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  /** True once a settle-up on this screen cleared the last balance, so the SETTLED stamp slams on (never on the first draw). */
  const [justSettled, setJustSettled] = useState(false);
  const [today] = useState(() => todayInTz(dest?.tz ?? 'UTC'));

  const viewCode = view === 'local' && home !== local ? local : home;
  const fmt = (usd: number) => money(convert(usd, 'USD', viewCode, rates), viewCode);

  const spent = totalSpent(trip);
  const catTotals: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount));
  const byCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const daysLeft = Math.max(1, Math.min(tripLen, daysBetween(today, trip.endDate) + 1));

  return (
    <Screen
      bottomInset={30}
      header={<Header back={false} kicker={trip.name} title={t('budget.title')} />}
      fab={<Fab label="Expense" accessibilityLabel="Add expense" testID="add-expense-open" onPress={() => setAddOpen(true)} />}>
      {/* Only worth a switch when the two currencies differ (a trip in the home country has one). */}
      {home !== local ? (
        <View style={{ marginBottom: space.xxl }}>
          <Segmented
            options={[
              { key: 'home', label: `Home · ${home}` },
              { key: 'local', label: `Local · ${local}` },
            ]}
            value={view}
            onChange={setView}
          />
        </View>
      ) : null}

      <View>
        <SpendSummary byCat={byCat} spent={spent} budget={trip.budget} remaining={trip.budget - spent} per={spent / Math.max(1, trip.members.length)} daysLeft={daysLeft} fmt={fmt} onEditBudget={() => setCapOpen(true)} />
      </View>

      {/* With nothing logged there is nothing to split: the empty Expenses block below is the invitation, so this one stays out of the way. */}
      {trip.expenses.some((e) => !e.settlement) ? (
        <View style={{ marginTop: space.section }}>
          <BalancesCard trip={trip} userId={userId} fmt={fmt} onSettle={() => setSettleOpen(true)} slam={justSettled} />
        </View>
      ) : null}

      <View style={{ marginTop: space.section }}>
        <ExpensesSection trip={trip} fmt={fmt} today={today} onOpen={setDetail} onAdd={() => setAddOpen(true)} />
      </View>

      <View style={{ marginTop: space.section }}>
        <MoreTools>
          <View>
            <SectionHeader title="Converter" />
            <CurrencyConverter from={conv[0]} to={conv[1]} onChange={(a, b) => setConv([a, b])} />
          </View>
          <DailyPlanner trip={trip} />
        </MoreTools>
      </View>

      <AddExpenseSheet visible={addOpen} onClose={() => setAddOpen(false)} trip={trip} userId={userId} />
      <ExpenseDetailSheet key={detail?.id ?? 'none'} detail={detail} onClose={() => setDetail(null)} trip={trip} fmt={fmt} />
      <SettleSheet visible={settleOpen} onClose={() => setSettleOpen(false)} trip={trip} onAllSettled={() => setJustSettled(true)} />
      <BudgetCapSheet visible={capOpen} onClose={() => setCapOpen(false)} trip={trip} />
    </Screen>
  );
}
