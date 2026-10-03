import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineRadar } from '@/components/map/OfflineRadar';
import { TripMap } from '@/components/map/TripMap';
import type { MapPoint } from '@/components/map/types';
import { typeMeta } from '@/components/trip/meta';
import { NoTrip } from '@/components/trip/NoTrip';
import { Chip, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { MAX_WIDTH, colors, radius, shadowStrong } from '@/theme';
import { durationLabel } from '@/utils/format';
import { distanceKm, kmLabel, nearestAirports } from '@/utils/geo';
import { dayLabel, time12, tripDays } from '@/utils/time';

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
        .forEach((a) => out.push({ id: a.id, lat: a.lat!, lng: a.lng!, title: a.title, subtitle: `${dayLabel(a.date)} · ${time12(a.time)} · ${durationLabel(a.durationMin)}`, color: typeMeta(a.type).color, kind: 'activity' }));
    if (layers.places) {
      const planned = new Set(trip.activities.map((a) => a.placeId));
      [trip.destinationId, ...trip.extraDestinationIds]
        .flatMap((id) => placesFor(id))
        .filter((p) => !planned.has(p.id))
        .forEach((p) => out.push({ id: p.id, lat: p.lat, lng: p.lng, title: p.name, subtitle: `${p.category} · ★ ${p.rating}`, color: '#9AA390', kind: 'place' }));
    }
    if (layers.airports) nearestAirports(center, 3).forEach((a) => out.push({ id: `air-${a.iata}`, lat: a.lat, lng: a.lng, title: `${a.iata} · ${a.name}`, subtitle: `${kmLabel(a.km)} away`, color: colors.blue, kind: 'airport' }));
    if (me) out.push({ id: 'me', lat: me.lat, lng: me.lng, title: 'You are here', subtitle: '', color: colors.red, kind: 'me' });
    return out;
  }, [trip, layers, day, center, me]);

  if (!trip) return <NoTrip />;
  const sel = points.find((p) => p.id === selected);
  const days = tripDays(trip.startDate, trip.endDate);

  const locate = async () => {
    const loc = await getLocation(dest);
    if (loc.source !== 'device') return toast('Location unavailable — showing the trip centre', { tone: 'warn' });
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

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} bordered={false} />
          <View style={styles.seg}>
            {(['live', 'offline'] as const).map((m) => (
              <Press key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && styles.segOn]} accessibilityState={{ selected: mode === m }}>
                <Ionicons name={m === 'live' ? 'map' : 'cloud-offline-outline'} size={13} color={mode === m ? colors.white : colors.textSecondary} />
                <T variant="caption" weight="semibold" color={mode === m ? colors.white : colors.textSecondary}>
                  {m === 'live' ? 'Map' : 'Offline'}
                </T>
              </Press>
            ))}
          </View>
          <IconButton icon="locate-outline" label="Show my location" onPress={locate} bordered={false} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
          <Chip small label="All days" active={day === 'all'} onPress={() => setDay('all')} />
          {days.map((d, i) => (
            <Chip key={d} small label={`Day ${i + 1}`} active={day === d} onPress={() => setDay(d)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
          <Chip small icon="calendar-outline" label="Itinerary" active={layers.plan} onPress={() => setLayers((l) => ({ ...l, plan: !l.plan }))} />
          <Chip small icon="compass-outline" label="Places" active={layers.places} onPress={() => setLayers((l) => ({ ...l, places: !l.places }))} />
          <Chip small icon="airplane-outline" label="Airports" active={layers.airports} onPress={() => setLayers((l) => ({ ...l, airports: !l.airports }))} />
        </ScrollView>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {sel ? (
          <View style={styles.selCard}>
            <View style={[styles.selDot, { backgroundColor: sel.color }]} />
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold" numberOfLines={1}>
                {sel.title}
              </T>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {sel.subtitle} · {kmLabel(distanceKm(center, sel))} from centre
              </T>
            </View>
            <Press onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`)} style={styles.go} accessibilityLabel="Get directions">
              <Ionicons name="navigate" size={16} color={colors.white} />
            </Press>
          </View>
        ) : (
          <T variant="caption" color={colors.textSecondary}>
            {points.length} pins · tap one for details{mode === 'offline' ? ' · works with no internet' : Platform.OS === 'web' ? ' · web preview uses OpenStreetMap' : ''}
          </T>
        )}
        <View style={styles.radiusRow}>
          <T variant="caption" weight="semibold">
            Radius {radiusKm} km
          </T>
          <View style={{ flex: 1 }}>
            <Slider value={radiusKm} min={2} max={40} onChange={setRadiusKm} label="Map radius" formatValue={(v) => `${v} km`} />
          </View>
        </View>
        {mode === 'live' && Platform.OS === 'web' && points.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {points.filter((p) => p.kind !== 'place').slice(0, 12).map((p) => (
              <Chip key={p.id} small label={p.title.slice(0, 22)} active={p.id === selected} onPress={() => setSelected(p.id)} />
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { ...StyleSheet.absoluteFill },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: 8, alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 16 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 3, ...shadowStrong },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: colors.primary },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 16, gap: 8, alignSelf: 'center', maxWidth: MAX_WIDTH, ...shadowStrong },
  selCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selDot: { width: 12, height: 12, borderRadius: 6 },
  go: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
