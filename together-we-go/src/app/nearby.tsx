import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AddActivitySheet, type ActivityDraft } from '@/components/trip/AddActivitySheet';
import { placeCategoryIcon, placeToActivityType } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Card, Chip, EmptyState, Pill } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor, type PlaceCategory } from '@/data/places';
import { useT } from '@/i18n';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { LENGTH_FILTERS, durationLabel, lengthBucketLabel, matchesLength, money, priceTier, type LengthFilter } from '@/utils/format';
import { bearingDeg, compassPoint, distanceKm, kmLabel, type LatLng } from '@/utils/geo';
import { todayInTz, tripDays } from '@/utils/time';

const CATS: ('all' | PlaceCategory)[] = ['all', 'food', 'sightseeing', 'adventure', 'culture', 'nightlife', 'shopping', 'relax'];
type Sort = 'distance' | 'rating' | 'price';

export default function Nearby() {
  const t = useT();
  const params = useLocalSearchParams<{ focus?: string; maxCost?: string }>();
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const [center, setCenter] = useState<LatLng & { label: string }>({ lat: dest.lat, lng: dest.lng, label: `Central ${dest.city}` });
  const [radiusKm, setRadiusKm] = useState(params.focus ? 25 : 6);
  const [cat, setCat] = useState<'all' | PlaceCategory>('all');
  const [len, setLen] = useState<LengthFilter>('any');
  const [maxCost, setMaxCost] = useState(params.maxCost ? Math.min(100, Number(params.maxCost)) : 100);
  const [sort, setSort] = useState<Sort>(params.focus ? 'distance' : 'rating');
  const [locating, setLocating] = useState(false);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);

  const all = useMemo(() => (trip ? [trip.destinationId, ...trip.extraDestinationIds] : ['tokyo']).flatMap((id) => placesFor(id)), [trip]);
  const results = useMemo(
    () =>
      all
        .map((p) => ({ p, km: distanceKm(center, p) }))
        .filter(({ p, km }) => km <= radiusKm && (cat === 'all' || p.category === cat) && matchesLength(p.durationMin, len) && (maxCost >= 100 || p.cost <= maxCost))
        .sort((a, b) => (sort === 'distance' ? a.km - b.km : sort === 'rating' ? b.p.rating - a.p.rating : a.p.cost - b.p.cost)),
    [all, center, radiusKm, cat, len, maxCost, sort],
  );
  const planned = new Set(trip?.activities.map((a) => a.placeId).filter(Boolean));

  const useMyLocation = async () => {
    setLocating(true);
    const loc = await getLocation(dest);
    setLocating(false);
    if (loc.source === 'device') {
      const far = distanceKm(loc, dest) > 60;
      setCenter({ lat: loc.lat, lng: loc.lng, label: 'My location' });
      if (far) {
        setRadiusKm(25);
        toast(`You’re ${kmLabel(distanceKm(loc, dest))} from ${dest.city} — results will appear once you’re there`, { tone: 'info', icon: 'navigate-outline' });
      } else toast('Using your current location');
    } else toast('Location unavailable — using the trip centre', { tone: 'warn' });
  };

  const today = trip ? todayInTz(dest.tz) : '';
  const defaultDay = trip ? (tripDays(trip.startDate, trip.endDate).includes(today) ? today : trip.startDate) : '';

  return (
    <Screen header={<Header title="Nearby" subtitle={`${results.length} places · ${center.label}`} />}>
      <Card style={{ gap: 10 }}>
        <View style={styles.between}>
          <T variant="title">Search radius</T>
          <T variant="title" color={colors.primary}>
            {radiusKm} km
          </T>
        </View>
        <Slider value={radiusKm} min={1} max={25} onChange={setRadiusKm} label="Search radius" formatValue={(v) => `${v} km`} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip small icon="business-outline" label={`${dest.city} centre`} active={center.label !== 'My location'} onPress={() => setCenter({ lat: dest.lat, lng: dest.lng, label: `Central ${dest.city}` })} />
          <Chip small icon="locate-outline" label={locating ? 'Locating…' : 'My location'} active={center.label === 'My location'} onPress={useMyLocation} />
        </View>
        <View style={styles.between}>
          <T variant="small" weight="semibold">
            Max price per person
          </T>
          <T variant="small" weight="semibold" color={colors.primary}>
            {maxCost >= 100 ? 'Any' : maxCost === 0 ? 'Free only' : money(maxCost)}
          </T>
        </View>
        <Slider value={maxCost} min={0} max={100} step={5} onChange={setMaxCost} label="Maximum price per person" formatValue={(v) => (v >= 100 ? 'Any' : `$${v}`)} />
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 14 }}>
        {CATS.map((c) => (
          <Chip key={c} small icon={c === 'all' ? undefined : placeCategoryIcon[c]} label={t(`cat.${c === 'all' ? 'all' : c}`)} active={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 8 }}>
        {LENGTH_FILTERS.map((f) => (
          <Chip key={f.key} small tone="soft" label={t(f.labelKey)} active={len === f.key} onPress={() => setLen(f.key)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <T variant="caption" color={colors.textSecondary}>
          Sort
        </T>
        {(['distance', 'rating', 'price'] as Sort[]).map((s) => (
          <Chip key={s} small label={s === 'distance' ? 'Closest' : s === 'rating' ? 'Top rated' : 'Cheapest'} active={sort === s} onPress={() => setSort(s)} />
        ))}
      </View>

      {results.length ? (
        <View style={{ gap: 10 }}>
          {results.map(({ p, km }) => {
            const focus = params.focus === p.id;
            return (
              <Card key={p.id} style={[{ gap: 8 }, focus && { borderColor: colors.primary, borderWidth: 2 }]}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={styles.icon}>
                    <Ionicons name={placeCategoryIcon[p.category]} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="bodySm" weight="semibold">
                      {p.name}
                    </T>
                    <T variant="caption" color={colors.textSecondary}>
                      {p.area} · ★ {p.rating}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T variant="small" weight="bold">
                      {kmLabel(km)}
                    </T>
                    <T variant="micro" color={colors.textMuted}>
                      {compassPoint(bearingDeg(center, p))}
                    </T>
                  </View>
                </View>
                <T variant="caption" color={colors.textSecondary}>
                  {p.blurb}
                </T>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Pill label={t(`cat.${p.category}`)} />
                  <Pill label={`${lengthBucketLabel(p.durationMin)} · ${durationLabel(p.durationMin)}`} tone="blue" icon="time-outline" />
                  <Pill label={p.cost ? `${priceTier(p.cost)} · ~${money(p.cost)}` : 'Free'} tone="yellow" />
                  {planned.has(p.id) ? <Pill label="On itinerary" tone="purple" icon="checkmark" /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {trip ? (
                    <Button
                      label="Add to plan"
                      size="sm"
                      icon="add"
                      style={{ flex: 1 }}
                      onPress={() =>
                        setDraft({ title: p.name, location: `${p.area}, ${destinationById(p.destinationId)?.city ?? ''}`, type: placeToActivityType[p.category], durationMin: p.durationMin, costPerPerson: p.cost, lat: p.lat, lng: p.lng, placeId: p.id, notes: p.blurb })
                      }
                    />
                  ) : null}
                  <Press
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)}
                    style={styles.mapBtn}
                    accessibilityLabel={`Directions to ${p.name}`}>
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <T variant="small" weight="semibold" color={colors.primary}>
                      Directions
                    </T>
                  </Press>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState icon="compass-outline" title="Nothing matches yet" body="Widen the radius, raise the max price or pick another category." />
      )}

      {trip ? <AddActivitySheet visible={!!draft} onClose={() => setDraft(null)} trip={trip} date={defaultDay} draft={draft} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryLine },
});
