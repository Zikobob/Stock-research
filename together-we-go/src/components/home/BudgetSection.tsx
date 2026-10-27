import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, SectionHeader, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Stamp, type StampTone } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { totalSpent } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';

import { budgetView, oweLine, type BudgetTone } from './logic';
import { MonoAmount } from './MonoAmount';
import type { TripCtx } from './useHomeContext';

/** The bar is the accent while things are fine and turns amber, then red; the stamp always says the state in words. */
const TONE: Record<BudgetTone, { bar: string; stamp: StampTone }> = {
  ok: { bar: colors.accent, stamp: 'positive' },
  warn: { bar: colors.warn, stamp: 'warn' },
  over: { bar: colors.red, stamp: 'danger' },
};

const OWE_ICON: Record<'owe' | 'owed' | 'square' | 'other', IconName> = {
  owe: 'arrow-up-outline',
  owed: 'arrow-down-outline',
  square: 'checkmark-circle-outline',
  other: 'swap-horizontal',
};

/**
 * What the group has spent: one big mono number sitting open on the paper, the limit beside it, a chunky bar in the state's colour
 * with a stamp that says the state, and one line about who owes whom. The whole block opens the Budget tab.
 */
export function BudgetSection({ ctx }: { ctx: TripCtx }) {
  const { trip, userId } = ctx;
  const spent = totalSpent(trip);
  const v = budgetView(spent, trip.budget);
  const tone = TONE[v.tone];
  const owe = oweLine(trip, userId);
  const open = () => router.navigate('/(tabs)/budget');
  return (
    <View>
      <SectionHeader title="Group budget" action="Open" onAction={open} />
      <Press onPress={open} scaleTo={0.99} style={styles.body} accessibilityLabel={`Group budget. ${money(spent)} of ${money(trip.budget)} spent. ${v.word}, ${v.detail}. ${owe.text}. Open budget`}>
        <View style={styles.top}>
          <View style={styles.amount}>
            <MonoAmount text={money(spent)} size={56} />
            <T variant="small" color={colors.textSecondary} style={{ marginBottom: 8 }}>
              of {money(trip.budget)}
            </T>
          </View>
          <Stamp label={v.word} tone={tone.stamp} />
        </View>
        <ProgressBar value={v.ratio} color={tone.bar} height={18} />
        <T variant="kicker" color={colors.textSecondary}>
          {v.detail}
        </T>
        <View style={styles.owe}>
          <Ionicons name={OWE_ICON[owe.tone]} size={18} color={owe.tone === 'owed' || owe.tone === 'square' ? colors.positive : colors.ink} />
          <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
            {owe.text}
          </T>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </View>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  amount: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: 8, flexShrink: 1 },
  owe: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border },
});
