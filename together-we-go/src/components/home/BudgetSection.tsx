import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, SectionHeader, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { totalSpent } from '@/store/useAppStore';
import { colors, radius, shadow } from '@/theme';
import { money } from '@/utils/format';

import { budgetView, oweLine, type BudgetTone } from './logic';
import type { TripCtx } from './useHomeContext';

const TONE: Record<BudgetTone, { color: string; icon: IconName }> = {
  ok: { color: colors.positive, icon: 'checkmark-circle' },
  warn: { color: colors.warn, icon: 'warning' },
  over: { color: colors.red, icon: 'alert-circle' },
};

/**
 * What the group has spent, as the biggest number in the block, with a bar that is green, amber or red AND says so in words,
 * and one line about who owes whom. The whole card opens the Budget tab.
 */
export function BudgetSection({ ctx }: { ctx: TripCtx }) {
  const { trip, userId } = ctx;
  const spent = totalSpent(trip);
  const v = budgetView(spent, trip.budget);
  const tone = TONE[v.tone];
  const owe = oweLine(trip, userId);
  const square = owe.tone === 'square';
  return (
    <View>
      <SectionHeader title="Group budget" action="Open" onAction={() => router.navigate('/(tabs)/budget')} />
      <Press
        onPress={() => router.navigate('/(tabs)/budget')}
        scaleTo={0.99}
        style={styles.card}
        accessibilityLabel={`Group budget. ${money(spent)} of ${money(trip.budget)} spent. ${v.word}, ${v.detail}. ${owe.text}. Open budget`}>
        <View style={styles.amount}>
          <T variant="numeral" style={styles.big}>
            {money(spent)}
          </T>
          <T variant="small" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            of {money(trip.budget)}
          </T>
        </View>
        <ProgressBar value={v.ratio} color={tone.color} height={12} />
        <View style={styles.state}>
          <Ionicons name={tone.icon} size={18} color={tone.color} />
          <T variant="small" style={{ flex: 1 }}>
            <T variant="small" weight="extrabold" color={tone.color}>
              {v.word}
            </T>
            {'  '}
            <T variant="small" color={colors.textSecondary}>
              {v.detail}
            </T>
          </T>
        </View>
        <View style={styles.owe}>
          <Ionicons name={square ? 'checkmark-circle' : 'swap-horizontal'} size={18} color={square ? colors.positive : colors.textSecondary} />
          <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
            {owe.text}
          </T>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, ...shadow },
  amount: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  big: { fontSize: 64, lineHeight: 68 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  owe: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginBottom: -4 },
});
