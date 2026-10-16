import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { placeCategoryIcon } from '@/components/trip/meta';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Card } from '@/components/ui/bits';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { totalSpent } from '@/store/useAppStore';
import { categoryColors, colors } from '@/theme';
import { money, priceTier } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween } from '@/utils/time';
import { parseAmount } from '@/utils/validation';

import { styles } from './styles';

/** Daily spending planner: how much per person per day, does it fit what is left, and budget finds nearby. */
export function DailyPlanner({ trip }: { trip: Trip }) {
  const t = useT();
  const dest = destinationById(trip.destinationId);
  const [daily, setDaily] = useState(String(dest?.dailyCost ?? 120));
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const dailyN = parseAmount(daily) ?? 0;
  const remaining = trip.budget - totalSpent(trip);
  const plannedTotal = dailyN * tripLen * trip.members.length;
  const activityAllowance = dailyN * 0.3;
  const finds = dest
    ? [trip.destinationId, ...trip.extraDestinationIds]
        .flatMap((id) => placesFor(id))
        .filter((p) => p.cost <= activityAllowance)
        .map((p) => ({ p, km: distanceKm(dest, p) }))
        .filter((x) => x.km <= 8)
        .sort((a, b) => b.p.rating - a.p.rating)
        .slice(0, 3)
    : [];
  return (
    <>
    <T variant="headline" accessibilityRole="header" style={styles.section}>
      {t('budget.planner')}
    </T>
    <Card style={[styles.card, { gap: 12 }]}>
      <T variant="small" color={colors.textSecondary}>
        How much does each person want to spend per day in {dest?.city}? (Typical: {money(dest?.dailyCost ?? 0)})
      </T>
      <View style={styles.dailyRow}>
        <T variant="h3">$</T>
        <TextInput value={daily} onChangeText={(v) => setDaily(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.dailyInput} accessibilityLabel="Daily spend per person in USD" maxLength={6} />
        <T variant="small" color={colors.textSecondary}>
          / person / day
        </T>
      </View>
      {dailyN > 0 ? (
        <>
          <View style={styles.splitRow}>
            {[
              ['Food', 0.35],
              ['Activities', 0.3],
              ['Transport', 0.15],
              ['Shopping', 0.12],
              ['Other', 0.08],
            ].map(([k, f]) => (
              <View key={k as string} style={styles.splitCell}>
                <View style={[styles.dot, { backgroundColor: categoryColors[k as string] }]} />
                <T variant="micro" color={colors.textSecondary}>
                  {k as string}
                </T>
                <T variant="small" weight="bold">
                  {money(dailyN * (f as number))}
                </T>
              </View>
            ))}
          </View>
          <View style={[styles.fit, { backgroundColor: plannedTotal <= remaining ? colors.primarySofter : colors.orangeSoft }]}>
            <Ionicons name={plannedTotal <= remaining ? 'checkmark-circle' : 'alert-circle'} size={16} color={plannedTotal <= remaining ? colors.positive : colors.orange} />
            <T variant="caption" style={{ flex: 1 }}>
              {tripLen} days × {trip.members.length} people = {money(plannedTotal)} on the ground ·{' '}
              {plannedTotal <= remaining ? `fits the ${money(remaining)} left` : `${money(plannedTotal - remaining)} more than what’s left`}
            </T>
          </View>
          <T variant="small" weight="bold" style={{ marginTop: 2 }}>
            Budget finds near {dest?.city} (≤ {money(activityAllowance)} each)
          </T>
          {finds.map(({ p, km }) => (
            <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id, maxCost: String(Math.round(activityAllowance)) } })} style={styles.findRow}>
              <View style={styles.findIcon}>
                <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.text} />
              </View>
              <T variant="small" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                {p.name}
              </T>
              <T variant="caption" color={colors.textSecondary}>
                {priceTier(p.cost)} · {kmLabel(km)}
              </T>
            </Press>
          ))}
        </>
      ) : (
        <T variant="caption" color={colors.red}>
          Enter a daily amount greater than 0
        </T>
      )}
    </Card>
    </>
  );
}
