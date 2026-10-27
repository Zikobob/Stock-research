import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineRadar } from '@/components/map/OfflineRadar';
import { PinBadge } from '@/components/map/PinBadge';
import { TripMap } from '@/components/map/TripMap';
import type { MapPoint } from '@/components/map/types';
import { typeIcon } from '@/components/trip/meta';
import { NoTrip } from '@/components/trip/NoTrip';
import { Chip, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Plate, PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { MAX_WIDTH, colors, line, radius, space } from '@/theme';
import { durationLabel } from '@/utils/format';
import { distanceKm, kmLabel, nearestAirports } from '@/utils/geo';
import { dayLabel, time12, tripDays } from '@/utils/time';

const MODES = [
  { key: 'live', label: 'Map', icon: 'map-outline' },
  { key: 'offline', label: 'Offline', icon: 'cloud-offline-outline' },
] as const;

/**
 * The trip on a map. The chrome is paper: outlined squares for back and locate, a two-way switch between the street map and the offline radar,
 * chips for the days and the layers, and a bottom sheet with the picked pin and the search radius. Your plan is numbered 1, 2, 3 in the
 * order you will do it, places are small dots and airports carry a plane, so the kinds are told apart by shape, not by colour.
 */
export default function MapScreen() {
  const trip = useActiveTrip();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'live' | 'offline'>('live');
  const [day, setDay] = useState<string>('all');
  const [layers, setLayers] = useState({ plan: true, places: true, airports: true });
  const [radiusKm, setRadiusKm] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const [center, setCenter] = useState({ lat: dest.lat, lng: dest.lng });

  const points = useMemo<MapPoint[]>(() => {
    if (!trip) return [];
    const out: MapPoint[] = [];
    if (layers.plan)
      trip.activities
        .filter((a) => a.lat && a.lng && (day === 'all' || a.date === day))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .forEach((a, i) => out.push({ id: a.id, lat: a.lat!, lng: a.lng!, title: a.title, subtitle: `${dayLabel(a.date)} · ${time12(a.time)} · ${durationLabel(a.durationMin)}`, color: colors.primary, kind: 'activity', label: String(i + 1), icon: typeIcon(a.type) }));
    if (layers.places) {
      const planned = new Set(trip.activities.map((a) => a.placeId));
      [trip.destinationId, ...trip.extraDestinationIds]
        .flatMap((id) => placesFor(id))
        .filter((p) => !planned.has(p.id))
        .forEach((p) => out.push({ id: p.id, lat: p.lat, lng: p.lng, title: p.name, subtitle: `${p.category} · ${p.rating.toFixed(1)} stars`, color: colors.textMuted, kind: 'place' }));
    }
    if (layers.airports) nearestAirports(center, 3).forEach((a) => out.push({ id: `air-${a.iata}`, lat: a.lat, lng: a.lng, title: `${a.iata} · ${a.name}`, subtitle: `${kmLabel(a.km)} away`, color: colors.blue, kind: 'airport', icon: 'airplane' }));
    if (me) out.push({ id: 'me', lat: me.lat, lng: me.lng, title: 'You are here', subtitle: '', color: colors.accent, kind: 'me' });
    return out;
  }, [trip, layers, day, center, me]);

  if (!trip) return <NoTrip />;
  const sel = points.find((p) => p.id === selected);
  const days = tripDays(trip.startDate, trip.endDate);

  const locate = async () => {
    const loc = await getLocation(dest);
    if (loc.source !== 'device') return toast('Location unavailable. Showing the trip centre', { tone: 'warn' });
    setMe(loc);
    if (distanceKm(loc, dest) < 80) setCenter(loc);
    else toast(`You’re ${kmLabel(distanceKm(loc, dest))} from ${dest.city}`, { icon: 'navigate-outline' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        {mode === 'live' ? (
          <TripMap center={center} points={points} radiusKm={radiusKm} selectedId={selected} onSelect={setSelected} showsUser={!!me} />
        ) : (
          <OfflineRadar center={center} points={points} radiusKm={radiusKm} selectedId={selected} onSelect={setSelected} />
        )}
      </View>

      <View style={[styles.layer, { paddingTop: insets.top + 8, top: 0 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <IconButton icon="arrow-back" label="Back" size={48} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} />
          <Plate offset={3} corner={radius.button}>
            <View style={styles.seg}>
              {MODES.map((m) => {
                const on = mode === m.key;
                return (
                  <Press key={m.key} onPress={() => setMode(m.key)} style={[styles.segBtn, on && styles.segOn]} accessibilityLabel={m.label} accessibilityState={{ selected: on }} scaleTo={0.97}>
                    <Ionicons name={m.icon} size={16} color={on ? colors.onPrimary : colors.ink} />
                    <T variant="small" weight="bold" color={on ? colors.onPrimary : colors.ink}>
                      {m.label}
                    </T>
                  </Press>
                );
              })}
            </View>
          </Plate>
          <IconButton icon="locate-outline" label="Show my location" size={48} onPress={locate} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipRow}>
          <Chip label="All days" active={day === 'all'} onPress={() => setDay('all')} />
          {days.map((d, i) => (
            <Chip key={d} label={`Day ${i + 1}`} active={day === d} onPress={() => setDay(d)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipRow}>
          <Chip icon="calendar-outline" label="Itinerary" active={layers.plan} onPress={() => setLayers((l) => ({ ...l, plan: !l.plan }))} />
          <Chip icon="compass-outline" label="Places" active={layers.places} onPress={() => setLayers((l) => ({ ...l, places: !l.places }))} />
          <Chip icon="airplane-outline" label="Airports" active={layers.airports} onPress={() => setLayers((l) => ({ ...l, airports: !l.airports }))} />
        </ScrollView>
      </View>

      <View style={[styles.layer, { bottom: 0 }]} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          {sel ? (
            <View style={styles.selRow}>
              <View style={styles.badge}>
                {sel.kind === 'activity' || sel.kind === 'place' ? <PinBadge p={sel} selected={false} /> : <Ionicons name={sel.kind === 'airport' ? 'airplane' : 'locate'} size={22} color={colors.ink} />}
              </View>
              <View style={{ flex: 1 }}>
                <T variant="title" weight="bold" numberOfLines={1}>
                  {sel.title}
                </T>
                {sel.subtitle ? (
                  <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {sel.subtitle}
                  </T>
                ) : null}
                <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
                  {kmLabel(distanceKm(center, sel))} from centre
                </T>
              </View>
              <PlatePress onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`)} accessibilityLabel="Get directions" offset={3} corner={radius.button} color={colors.accent} style={styles.go}>
                <Ionicons name="navigate" size={20} color={colors.onPrimary} />
              </PlatePress>
            </View>
          ) : (
            <T variant="kicker" color={colors.textSecondary}>
              {points.length} pins · tap one for details{mode === 'offline' ? ' · works with no internet' : Platform.OS === 'web' ? ' · web preview uses OpenStreetMap' : ''}
            </T>
          )}
          <View>
            <View style={styles.radiusHead}>
              <T variant="kicker" color={colors.textSecondary}>
                Radius
              </T>
              <T variant="numeralSm">{radiusKm} km</T>
            </View>
            <Slider value={radiusKm} min={2} max={40} onChange={setRadiusKm} label="Map radius" formatValue={(v) => `${v} km`} />
          </View>
          {mode === 'live' && Platform.OS === 'web' && points.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {points
                .filter((p) => p.kind !== 'place')
                .slice(0, 12)
                .map((p) => (
                  <Chip key={p.id} label={`${p.label ? `${p.label}. ` : ''}${p.title.slice(0, 22)}`} active={p.id === selected} onPress={() => setSelected(p.id)} />
                ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { ...StyleSheet.absoluteFill },
  // each chrome layer is as wide as the screen, with its content kept to the phone column
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 16 },
  // a centred column would size a row of chips to its content (wider than the screen); keep it as wide as the screen
  chips: { width: '100%', maxWidth: MAX_WIDTH, flexGrow: 0 },
  chipRow: { gap: space.sm, paddingHorizontal: 16, paddingRight: 24 },
  seg: { flexDirection: 'row', height: 48, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, overflow: 'hidden' },
  segBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 44, paddingHorizontal: 14 },
  segOn: { backgroundColor: colors.primary },
  sheet: { width: '100%', maxWidth: MAX_WIDTH, backgroundColor: colors.card, borderTopLeftRadius: radius.modal, borderTopRightRadius: radius.modal, borderWidth: line, borderBottomWidth: 0, borderColor: colors.ink, paddingHorizontal: 16, paddingTop: 16, gap: space.md },
  selRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  go: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  radiusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
