import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { T } from '@/components/ui/T';
import { Card } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { useT } from '@/i18n';
import type { Expense, Trip } from '@/store/types';
import { memberById, useAppStore } from '@/store/useAppStore';
import { categoryColors, colors } from '@/theme';
import { money } from '@/utils/format';
import { parseAmount, validateAmount } from '@/utils/validation';

import { styles } from './styles';

/** The expenses list with the group budget cap field. Tapping an expense opens its details. */
export function ExpensesSection({ trip, fmt, onOpen }: { trip: Trip; fmt: (usd: number) => string; onOpen: (e: Expense) => void }) {
  const t = useT();
  const updateTrip = useAppStore((s) => s.updateTrip);
  const [capText, setCapText] = useState(String(trip.budget));
  const [capErr, setCapErr] = useState<string | null>(null);

  const saveCap = () => {
    const e = validateAmount(capText, { min: 1, max: 1_000_000, label: 'a budget' });
    setCapErr(e);
    if (e) return;
    const v = parseAmount(capText)!;
    updateTrip(trip.id, { budget: v });
    toast(`Budget cap set to ${money(v)}`);
  };

  return (
    <>
    <View style={[styles.sectionRow, { marginTop: 26 }]}>
      <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {t('budget.expenses')}
      </T>
      <View style={styles.capBox}>
        <T variant="caption" weight="semibold" color={colors.textSecondary}>
          {t('budget.cap')}
        </T>
        <TextInput
          value={capText}
          onChangeText={(v) => setCapText(v.replace(/[^0-9.]/g, ''))}
          onBlur={saveCap}
          onSubmitEditing={saveCap}
          keyboardType="decimal-pad"
          style={[styles.capInput, capErr && { borderColor: colors.red }]}
          accessibilityLabel="Group budget cap in USD"
          maxLength={8}
        />
      </View>
    </View>
    {capErr ? (
      <T variant="caption" color={colors.red} style={{ marginBottom: 8, marginTop: -4 }}>
        {capErr}
      </T>
    ) : null}
    <View style={{ gap: 10 }}>
      {trip.expenses.map((e) => (
        <Card key={e.id} padded={false} onPress={() => onOpen(e)} style={styles.expense} accessibilityLabel={`${e.title}, ${fmt(e.amount)}`}>
          <View style={[styles.expenseDot, { backgroundColor: e.settlement ? colors.textMuted : categoryColors[e.category] ?? colors.textMuted }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <T variant="bodySm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {e.title}
              </T>
              {e.receipt ? <Ionicons name="attach" size={15} color={colors.textMuted} accessibilityLabel="Has receipt" /> : null}
            </View>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {e.settlement ? 'Settlement' : e.category} · {t('budget.paidBy', { name: memberById(trip, e.paidBy)?.name.split(' ')[0] ?? '—' })}
              {e.original ? ` · ${money(e.original.amount, e.original.currency)}` : ''}
            </T>
          </View>
          <T variant="small" weight="extrabold">
            {fmt(e.amount)}
          </T>
        </Card>
      ))}
    </View>
    </>
  );
}
