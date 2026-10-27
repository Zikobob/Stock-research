import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NearbyFilters, type NearbyFilterState } from '@/components/more/NearbyFilters';
import { AddActivitySheet, type ActivityDraft } from '@/components/trip/AddActivitySheet';
import { placeCategoryIcon, placeToActivityType } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { EmptyState, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { PlatePress } from '@/components/ui/Plate';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor, type Place } from '@/data/places';
import { useT } from '@/i18n';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';
import { durationLabel, matchesLength, money, priceTier } from '@/utils/format';
import { bearingDeg, compassPoint, distanceKm, kmLabel, type LatLng } from '@/utils/geo';
import { todayInTz, tripDays } from '@/utils/time';

type Sort = 'distance' | 'rating' | 'price';

/** The Filter button: an outlined square-cornered button with a small accent count of the filters in use. */
function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={count ? `Filters, ${count} in use` : 'Filters'} offset={3} corner={radius.button} style={styles.filterFace}>
      <Ionicons name="options-outline" size={18} color={colors.ink} />
      <T variant="small" weight="bold">
        Filter
      </T>
      {count ? (
        <View style={styles.count}>
          <T variant="kicker" color={colors.onAccent} style={{ fontSize: 11, lineHeight: 14 }}>
            {count}
          </T>
        </View>
      ) : null}
    </PlatePress>
  );
}

/** One place: the kind icon, the name, the distance in mono, a line about it, what it costs, and what you can do with it. */
function PlaceRow({ p, km, bearing, focus, planned, canAdd, onAdd }: { p: Place; km: number; bearing: string; focus: boolean; planned: boolean; canAdd: boolean; onAdd: () => void }) {
  const t = useT();
  return (
    <View style={[styles.row, focus && styles.focus]}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name={placeCategoryIcon[p.category]} size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold">
            {p.name}
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {p.area} · {p.rating.toFixed(1)} stars
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }} accessible accessibilityLabel={`${kmLabel(km)} ${bearing}`}>
          <T variant="numeralSm">{kmLabel(km)}</T>
          <T variant="kicker" color={colors.textSecondary}>
            {bearing}
          </T>
        </View>
      </View>
      <T variant="small" color={colors.textSecondary}>
        {p.blurb}
      </T>
      <View style={styles.meta}>
        <T variant="kicker" color={colors.textSecondary}>
          {t(`cat.${p.category}`)} · {durationLabel(p.durationMin)} · {p.cost ? `${priceTier(p.cost)} ~${money(p.cost)}` : 'Free'}
        </T>
        {planned ? <Stamp label="On plan" tone="positive" icon="checkmark" rotate={0} /> : null}
      </View>
      <View style={styles.actions}>
        {canAdd ? <Button label="Add to plan" icon="add" size="sm" variant="secondary" style={{ flex: 1 }} onPress={onAdd} /> : <View style={{ flex: 1 }} />}
        <IconButton icon="navigate-outline" label={`Directions to ${p.name}`} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)} />
      </View>
    </View>
  );
}

/** Places around the middle of the trip's city (or around you), closest first. The many filters live behind one button. */
export default function Nearby() {
  const params = useLocalSearchParams<{ focus?: string; maxCost?: string }>();
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const defaultRadius = params.focus ? 25 : 6;
  const [center, setCenter] = useState<LatLng & { label: string }>({ lat: dest.lat, lng: dest.lng, label: `Central ${dest.city}` });
  const [f, setF] = useState<Omit<NearbyFilterState, 'fromMe'>>({ radiusKm: defaultRadius, cat: 'all', len: 'any', maxCost: params.maxCost ? Math.min(100, Number(params.maxCost)) : 100 });
  const [sort, setSort] = useState<Sort>(params.focus ? 'distance' : 'rating');
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const fromMe = center.label === 'My location';

  const all = useMemo(() => (trip ? [trip.destinationId, ...trip.extraDestinationIds] : ['tokyo']).flatMap((id) => placesFor(id)), [trip]);
  const results = useMemo(
    () =>
      all
        .map((p) => ({ p, km: distanceKm(center, p) }))
        .filter(({ p, km }) => km <= f.radiusKm && (f.cat === 'all' || p.category === f.cat) && matchesLength(p.durationMin, f.len) && (f.maxCost >= 100 || p.cost <= f.maxCost))
        .sort((a, b) => (sort === 'distance' ? a.km - b.km : sort === 'rating' ? b.p.rating - a.p.rating : a.p.cost - b.p.cost)),
    [all, center, f, sort],
  );
  const planned = new Set(trip?.activities.map((a) => a.placeId).filter(Boolean));
  const inUse = [f.cat !== 'all', f.len !== 'any', f.maxCost < 100, fromMe, f.radiusKm !== defaultRadius].filter(Boolean).length;

  const toCentre = () => setCenter({ lat: dest.lat, lng: dest.lng, label: `Central ${dest.city}` });
  const locateMe = async () => {
    setLocating(true);
    const loc = await getLocation(dest);
    setLocating(false);
    if (loc.source === 'device') {
      const far = distanceKm(loc, dest) > 60;
      setCenter({ lat: loc.lat, lng: loc.lng, label: 'My location' });
      if (far) {
        setF((x) => ({ ...x, radiusKm: 25 }));
        toast(`You’re ${kmLabel(distanceKm(loc, dest))} from ${dest.city}. Results will appear once you’re there`, { tone: 'info', icon: 'navigate-outline' });
      } else toast('Using your current location');
    } else toast('Location unavailable. Using the trip centre', { tone: 'warn' });
  };
  const reset = () => {
    setF({ radiusKm: defaultRadius, cat: 'all', len: 'any', maxCost: 100 });
    toCentre();
  };

  const today = trip ? todayInTz(dest.tz) : '';
  const defaultDay = trip ? (tripDays(trip.startDate, trip.endDate).includes(today) ? today : trip.startDate) : '';

  return (
    <Screen header={<Header kicker="Around town" title="Nearby" subtitle={`${results.length} ${results.length === 1 ? 'place' : 'places'} · ${center.label}`} backLabel="More" />}>
      <Segmented
        value={sort}
        onChange={setSort}
        options={[
          { key: 'distance', label: 'Closest' },
          { key: 'rating', label: 'Top rated' },
          { key: 'price', label: 'Cheapest' },
        ]}
      />
      <View style={styles.bar}>
        <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
          Within {f.radiusKm} km
        </T>
        <FilterButton count={inUse} onPress={() => setFiltersOpen(true)} />
      </View>

      {locating ? (
        <View style={{ gap: space.md }} accessibilityLabel="Finding places near you">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={168} />
          ))}
        </View>
      ) : results.length ? (
        <View>
          {results.map(({ p, km }) => (
            <PlaceRow
              key={p.id}
              p={p}
              km={km}
              bearing={compassPoint(bearingDeg(center, p))}
              focus={params.focus === p.id}
              planned={planned.has(p.id)}
              canAdd={!!trip}
              onAdd={() => setDraft({ title: p.name, location: `${p.area}, ${destinationById(p.destinationId)?.city ?? ''}`, type: placeToActivityType[p.category], durationMin: p.durationMin, costPerPerson: p.cost, lat: p.lat, lng: p.lng, placeId: p.id, notes: p.blurb })}
            />
          ))}
        </View>
      ) : (
        <EmptyState icon="compass-outline" title="Nothing matches yet" body="Widen the radius, raise the max price or pick another kind of place.">
          <Button label="Reset filters" onPress={reset} />
        </EmptyState>
      )}

      <NearbyFilters
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        state={{ ...f, fromMe }}
        onChange={(patch) => setF((x) => ({ ...x, ...patch }))}
        cityName={dest.city}
        locating={locating}
        onLocate={locateMe}
        onCentre={toCentre}
        onReset={reset}
        count={results.length}
      />
      {trip ? <AddActivitySheet visible={!!draft} onClose={() => setDraft(null)} trip={trip} date={defaultDay} draft={draft} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, marginBottom: space.sm },
  filterFace: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  count: { minWidth: 22, height: 22, paddingHorizontal: 4, borderRadius: radius.xs, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  row: { gap: space.md, paddingVertical: space.lg, borderTopWidth: hair, borderTopColor: colors.border },
  focus: { backgroundColor: colors.accentSoft, borderWidth: line, borderColor: colors.ink, borderRadius: radius.card, padding: space.md, marginVertical: space.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm, rowGap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
