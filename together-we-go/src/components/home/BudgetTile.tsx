import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Trip } from '@/store/types';
import { colors, radius, shadow } from '@/theme';
import { money } from '@/utils/format';

/** How much of the group budget is spent, with a bar. Tap to open the Budget tab. */
export function BudgetTile({ trip, spent }: { trip: Trip; spent: number }) {
  return (
    <FadeIn delay={140}>
      <Press onPress={() => router.navigate('/(tabs)/budget')} style={styles.budget} accessibilityLabel="Group budget. Open budget">
        <View style={styles.rowBetween}>
          <T variant="kicker" color={colors.textSecondary}>
            Group budget
          </T>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <T variant="h1" weight="extrabold">
            {money(spent)}
          </T>
          <T variant="small" color={colors.textSecondary}>
            of {money(trip.budget)}
          </T>
        </View>
        <View style={{ marginTop: 12 }}>
          <ProgressBar value={spent / Math.max(1, trip.budget)} color={spent > trip.budget ? colors.red : colors.primary} height={9} />
        </View>
      </Press>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  budget: { marginTop: 12, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
