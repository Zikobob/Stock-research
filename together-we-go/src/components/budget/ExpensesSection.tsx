import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { expenseCategories } from '@/components/trip/meta';
import { EmptyState, SectionHeader, type IconName } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import type { Expense, Trip } from '@/store/types';
import { memberById } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';

import { dayHeading, groupByDay } from './logic';
import { styles } from './styles';

/** How many expenses show before "Show older": a long trip stays quick to draw. */
const PAGE = 25;

const iconFor = (e: Expense): IconName => (e.settlement ? 'swap-horizontal' : (expenseCategories.find((c) => c.key === e.category)?.icon ?? 'ellipsis-horizontal'));

/**
 * The expenses as a receipt: grouped under day headings (with what the group spent that day), each line a category icon, what it was,
 * who paid, and the amount in mono. Tapping a line opens its details. With nothing logged yet it invites the first one.
 */
export function ExpensesSection({ trip, fmt, today, onOpen, onAdd }: { trip: Trip; fmt: (usd: number) => string; today: string; onOpen: (e: Expense) => void; onAdd: () => void }) {
  const t = useT();
  const [limit, setLimit] = useState(PAGE);
  const { groups, hidden } = groupByDay(trip.expenses, limit);

  return (
    <View>
      <SectionHeader title={t('budget.expenses')} />
      {!trip.expenses.length ? (
        <EmptyState icon="receipt-outline" title="No expenses yet" body="Log the first one and the split is worked out for you.">
          <Button label="Log an expense" icon="add" onPress={onAdd} />
        </EmptyState>
      ) : (
        <View>
          {groups.map((g, gi) => (
            <View key={g.date} style={gi > 0 ? { marginTop: 20 } : undefined}>
              <View style={[styles.rowBetween, { paddingBottom: 6 }]}>
                <T variant="kicker" color={colors.ink} accessibilityRole="header">
                  {dayHeading(g.date, today)}
                </T>
                {g.total > 0 && g.items.length > 1 ? (
                  <T variant="kicker" color={colors.textSecondary}>
                    {fmt(g.total)}
                  </T>
                ) : null}
              </View>
              {g.items.map((e, i) => (
                <Press key={e.id} onPress={() => onOpen(e)} scaleTo={0.99} accessibilityLabel={`${e.title}, ${fmt(e.amount)}`} style={[styles.ledgerRow, styles.ledgerDivider, i === 0 && { borderTopColor: colors.ink }, { paddingVertical: 10, minHeight: 64 }]}>
                  <View style={styles.iconBox}>
                    <Ionicons name={iconFor(e)} size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T variant="bodySm" weight="bold" numberOfLines={2} style={{ flexShrink: 1 }}>
                        {e.title}
                      </T>
                      {e.receipt || e.receiptBlob ? <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} accessibilityLabel="Has receipt" /> : null}
                    </View>
                    <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                      {e.settlement ? 'Settlement' : e.category} · {t('budget.paidBy', { name: memberById(trip, e.paidBy)?.name.split(' ')[0] ?? '—' })}
                      {e.original ? ` · ${money(e.original.amount, e.original.currency)}` : ''}
                    </T>
                  </View>
                  <T variant="numeralSm" color={e.settlement ? colors.textSecondary : colors.text}>
                    {fmt(e.amount)}
                  </T>
                </Press>
              ))}
            </View>
          ))}
          {hidden > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Button label={`Show ${Math.min(PAGE, hidden)} older`} variant="secondary" size="md" onPress={() => setLimit((l) => l + PAGE)} />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
