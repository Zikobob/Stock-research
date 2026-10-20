import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AddExpenseSheet } from '@/components/budget/AddExpenseSheet';
import { BalancesCard } from '@/components/budget/BalancesCard';
import { DailyPlanner } from '@/components/budget/DailyPlanner';
import { ExpenseDetailSheet } from '@/components/budget/ExpenseDetailSheet';
import { ExpensesSection } from '@/components/budget/ExpensesSection';
import { SettleSheet } from '@/components/budget/SettleSheet';
import { SpendSummary } from '@/components/budget/SpendSummary';
import { styles } from '@/components/budget/styles';
import { CurrencyConverter } from '@/components/CurrencyConverter';
import { NoTrip } from '@/components/trip/NoTrip';
import { Fold } from '@/components/ui/Fold';
import { Card } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useRatesLoader } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import type { Expense } from '@/store/types';
import { totalSpent, useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';
import { daysBetween, todayInTz } from '@/utils/time';

export default function Budget() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <BudgetInner key={trip.id} />;
}

/** The Budget tab. It owns the few things the parts share (home/local view, which sheet is open) and hands the rest to components/budget. */
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
  const [today] = useState(() => todayInTz(dest?.tz ?? 'UTC'));

  const viewCode = view === 'home' ? home : local;
  const fmt = (usd: number) => money(convert(usd, 'USD', viewCode, rates), viewCode);

  const spent = totalSpent(trip);
  const catTotals: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount));
  const byCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const daysLeft = Math.max(1, Math.min(tripLen, daysBetween(today, trip.endDate) + 1));

  return (
    <Screen bottomInset={30}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
            {trip.name}
          </T>
          <T variant="display" accessibilityRole="header">
            {t('budget.title')}
          </T>
        </View>
        <Press onPress={() => setAddOpen(true)} style={styles.plus} accessibilityLabel="Add expense" testID="add-expense-open">
          <Ionicons name="add" size={26} color={colors.onPrimary} />
        </Press>
      </View>

      <Segmented
        options={[
          { key: 'home', label: `Home · ${home}` },
          { key: 'local', label: `Local · ${local}` },
        ]}
        value={view}
        onChange={setView}
      />

      <SpendSummary byCat={byCat} spent={spent} budget={trip.budget} remaining={trip.budget - spent} per={spent / Math.max(1, trip.members.length)} daysLeft={daysLeft} fmt={fmt} />
      <BalancesCard trip={trip} userId={userId} fmt={fmt} onSettle={() => setSettleOpen(true)} />

      <ExpensesSection trip={trip} fmt={fmt} onOpen={setDetail} />

      <Fold title="More tools" icon="calculator-outline" label="More budget tools" summary="Currency converter and daily spending planner">
        <T variant="headline" accessibilityRole="header" style={styles.section}>
          Converter
        </T>
        <Card style={styles.card}>
          <CurrencyConverter from={conv[0]} to={conv[1]} onChange={(a, b) => setConv([a, b])} />
        </Card>

        <DailyPlanner trip={trip} />
      </Fold>

      <AddExpenseSheet visible={addOpen} onClose={() => setAddOpen(false)} trip={trip} userId={userId} />
      <ExpenseDetailSheet key={detail?.id ?? 'none'} detail={detail} onClose={() => setDetail(null)} trip={trip} fmt={fmt} />
      <SettleSheet visible={settleOpen} onClose={() => setSettleOpen(false)} trip={trip} />
    </Screen>
  );
}
