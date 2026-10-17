import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { placeCategoryIcon } from '@/components/trip/meta';
import { Card, SectionHeader } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import type { Destination } from '@/data/destinations';
import { placesFor } from '@/data/places';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';
import { lengthTag, money } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';

/** Places close to the trip's centre, with a radius slider. */
export function NearbySection({ trip, dest }: { trip: Trip; dest: Destination }) {
  const [radiusKm, setRadiusKm] = useState(5);
  const nearby = [trip.destinationId, ...trip.extraDestinationIds]
    .flatMap((id) => placesFor(id))
    .map((p) => ({ p, km: distanceKm(dest, p) }))
    .filter((x) => x.km <= radiusKm)
    .sort((a, b) => a.km - b.km);
  return (
    <FadeIn delay={340}>
      <SectionHeader title="Nearby" action="Filters" onAction={() => router.push('/nearby')} style={{ marginTop: 26 }} />
      <Card>
        <View style={styles.rowBetween}>
          <T variant="small" color={colors.textSecondary}>
            Search radius
          </T>
          <T variant="small" weight="extrabold">
            {radiusKm} km
          </T>
        </View>
        <Slider value={radiusKm} min={1} max={20} onChange={setRadiusKm} label="Search radius in kilometres" formatValue={(v) => `${v} km`} />
        <T variant="caption" color={colors.textMuted} style={{ marginBottom: 6 }}>
          {nearby.length} places within {radiusKm} km of central {dest.city}
        </T>
        {nearby.slice(0, 4).map(({ p, km }) => (
          <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id } })} style={styles.nearRow} scaleTo={0.99}>
            <View style={styles.nearIcon}>
              <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="small" weight="bold" numberOfLines={1}>
                {p.name}
              </T>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {p.category[0].toUpperCase() + p.category.slice(1)} · {lengthTag(p.durationMin)} · {p.cost ? money(p.cost) : 'Free'}
              </T>
            </View>
            <T variant="caption" weight="semibold" color={colors.textSecondary}>
              {kmLabel(km)}
            </T>
          </Press>
        ))}
      </Card>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  nearIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
