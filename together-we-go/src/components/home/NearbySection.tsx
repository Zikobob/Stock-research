import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { placeCategoryIcon } from '@/components/trip/meta';
import { SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Destination } from '@/data/destinations';
import { placesFor } from '@/data/places';
import type { Trip } from '@/store/types';
import { colors, hair, line, radius } from '@/theme';
import { lengthTag, money } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';

import { RadiusSlider } from './RadiusSlider';

/** Places close to the trip's centre, with a radius slider; the list is open on the page with hair dividers. */
export function NearbySection({ trip, dest }: { trip: Trip; dest: Destination }) {
  const [radiusKm, setRadiusKm] = useState(5);
  const nearby = [trip.destinationId, ...trip.extraDestinationIds]
    .flatMap((id) => placesFor(id))
    .map((p) => ({ p, km: distanceKm(dest, p) }))
    .filter((x) => x.km <= radiusKm)
    .sort((a, b) => a.km - b.km);
  return (
    <View>
      <SectionHeader title="Nearby" action="Filters" onAction={() => router.push('/nearby')} />
      <View style={styles.rowBetween}>
        <T variant="kicker" color={colors.textSecondary}>
          Search radius
        </T>
        <T variant="numeralSm">{radiusKm} km</T>
      </View>
      <RadiusSlider value={radiusKm} min={1} max={20} onChange={setRadiusKm} label="Search radius in kilometres" formatValue={(v) => `${v} km`} />
      <T variant="caption" color={colors.textSecondary} style={{ marginTop: 8, marginBottom: 4 }}>
        {nearby.length} {nearby.length === 1 ? 'place' : 'places'} within {radiusKm} km of central {dest.city}
      </T>
      {nearby.slice(0, 4).map(({ p, km }) => (
        <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id } })} style={styles.nearRow} scaleTo={0.99} accessibilityLabel={`${p.name}, ${kmLabel(km)} away`}>
          <View style={styles.nearIcon}>
            <Ionicons name={placeCategoryIcon[p.category]} size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodySm" weight="semibold" numberOfLines={1}>
              {p.name}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {p.category[0].toUpperCase() + p.category.slice(1)} · {lengthTag(p.durationMin)} · {p.cost ? money(p.cost) : 'Free'}
            </T>
          </View>
          <T variant="kicker" color={colors.ink}>
            {kmLabel(km)}
          </T>
        </Press>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: hair, borderTopColor: colors.border },
  nearIcon: { width: 40, height: 40, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
