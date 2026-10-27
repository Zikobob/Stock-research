import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { placeCategoryIcon } from '@/components/trip/meta';
import { Card, SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { totalSpent } from '@/store/useAppStore';
import { categoryColors, colors, hair, line, radius } from '@/theme';
import { money, priceTier } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween } from '@/utils/time';
import { parseAmount } from '@/utils/validation';

import { AmountField } from './AmountField';
import { styles as shared } from './styles';

/** How a day's money is usually split, as shares of the daily amount. */
const SPLIT: [string, number][] = [
  ['Food', 0.35],
  ['Activities', 0.3],
  ['Transport', 0.15],
  ['Shopping', 0.12],
  ['Other', 0.08],
];

/** Daily spending planner: how much per person per day, does it fit what is left, and budget finds nearby. */
export function DailyPlanner({ trip }: { trip: Trip }) {
  const t = useT();
  const dest = destinationById(trip.destinationId);
  const [daily, setDaily] = useState(String(dest?.dailyCost ?? 120));
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const dailyN = parseAmount(daily) ?? 0;
  const remaining = trip.budget - totalSpent(trip);
  const plannedTotal = dailyN * tripLen * trip.members.length;
  const fits = plannedTotal <= remaining;
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
    <View>
      <SectionHeader title={t('budget.planner')} />
      <Card style={{ gap: 16 }}>
        <T variant="small" color={colors.textSecondary}>
          How much does each person want to spend per day in {dest?.city}? Typical: {money(dest?.dailyCost ?? 0)}.
        </T>
        <AmountField compact symbol="$" suffix="per person, per day" label="Daily spend per person in USD" value={daily} onChange={(v) => setDaily(v.replace(/[^0-9.]/g, ''))} error={dailyN > 0 ? null : 'Enter a daily amount greater than 0'} />
        {dailyN > 0 ? (
          <>
            <View style={{ gap: 10 }}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={local.bar}>
                {SPLIT.map(([k, f]) => (
                  <View key={k} style={{ width: `${f * 100}%`, backgroundColor: categoryColors[k], borderRightWidth: line, borderRightColor: colors.ink }} />
                ))}
              </View>
              <View style={local.legend}>
                {SPLIT.map(([k, f]) => (
                  <View key={k} style={local.legendItem}>
                    <View style={[local.swatch, { backgroundColor: categoryColors[k] }]} />
                    <T variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                      {k}
                    </T>
                    <T variant="numeralSm" style={{ fontSize: 15, lineHeight: 20 }}>
                      {money(dailyN * f)}
                    </T>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 8, borderTopWidth: hair, borderTopColor: colors.border, paddingTop: 14 }}>
              {fits ? <Stamp label="Fits" tone="positive" icon="checkmark-circle-outline" /> : <Stamp label="Over what is left" tone="warn" icon="alert-circle-outline" />}
              <T variant="small">
                {tripLen} days × {trip.members.length} people = {money(plannedTotal)} on the ground ·{' '}
                {fits ? `fits the ${money(remaining)} left` : `${money(plannedTotal - remaining)} more than what’s left`}
              </T>
            </View>

            {finds.length ? (
              <View>
                <T variant="title" weight="bold" style={{ marginBottom: 4 }}>
                  Budget finds near {dest?.city} (up to {money(activityAllowance)} each)
                </T>
                {finds.map(({ p, km }, i) => (
                  <Press
                    key={p.id}
                    onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id, maxCost: String(Math.round(activityAllowance)) } })}
                    style={[shared.ledgerRow, { paddingVertical: 8, minHeight: 56 }, i > 0 && shared.ledgerDivider]}
                    accessibilityLabel={`${p.name}, ${priceTier(p.cost)}, ${kmLabel(km)}`}>
                    <View style={local.findIcon}>
                      <Ionicons name={placeCategoryIcon[p.category]} size={16} color={colors.ink} />
                    </View>
                    <T variant="small" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                      {p.name}
                    </T>
                    <T variant="kicker" color={colors.textSecondary}>
                      {priceTier(p.cost)} · {kmLabel(km)}
                    </T>
                  </Press>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Card>
    </View>
  );
}

const local = StyleSheet.create({
  bar: { height: 18, flexDirection: 'row', borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: '42%', minWidth: 132 },
  swatch: { width: 12, height: 12, borderWidth: 1.5, borderColor: colors.ink },
  findIcon: { width: 36, height: 36, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
