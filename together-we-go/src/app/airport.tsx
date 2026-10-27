import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip, IconButton, SectionHeader } from '@/components/ui/bits';
import { Header, Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { destinationById } from '@/data/destinations';
import { useNow } from '@/hooks/useTrip';
import { getLocation, type LocationResult } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';
import { durationLabel } from '@/utils/format';
import { bearingDeg, compassPoint, driveMinutes, kmLabel, nearestAirports } from '@/utils/geo';
import { partsInTz, time12, tzAbbrev } from '@/utils/time';

/** "~25m", or "~19h 14m" for an airport a day's drive away. */
const drive = (km: number) => `~${durationLabel(driveMinutes(km))}`;
const directions = (a: { lat: number; lng: number }) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`);

/** A small caps label over a mono value: one column of the ticket stub. */
function Stat({ label, value, icon }: { label: string; value: string; icon: 'navigate-outline' | 'car-outline' | 'time-outline' }) {
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={13} color={colors.textSecondary} />
        <T variant="kicker" color={colors.textSecondary}>
          {label}
        </T>
      </View>
      <T variant="numeralSm" style={{ fontSize: 17, lineHeight: 22 }}>
        {value}
      </T>
    </View>
  );
}

/** Tracks your location and finds the closest airports (works offline: the airport list is bundled). */
export default function AirportScreen() {
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const [from, setFrom] = useState<'trip' | 'me'>('trip');
  const [loc, setLoc] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const now = useNow(60000);

  const locateMe = async () => {
    setFrom('me');
    if (loc) return;
    setLoading(true);
    setLoc(await getLocation(dest));
    setLoading(false);
  };

  const origin = from === 'me' && loc?.source === 'device' ? loc : { lat: dest.lat, lng: dest.lng };
  const list = nearestAirports(origin, 6);
  const [first, ...rest] = list;

  return (
    <Screen header={<Header kicker="Around town" title="Nearest airport" subtitle={from === 'me' ? 'From your current location' : `From central ${dest.city}`} backLabel="More" />}>
      <View style={styles.chips}>
        <Chip icon="business-outline" label={`${dest.city} centre`} active={from === 'trip'} onPress={() => setFrom('trip')} />
        <Chip icon="locate-outline" label="My location" active={from === 'me'} onPress={locateMe} />
      </View>

      {from === 'me' && loc?.source === 'fallback' ? (
        <View style={styles.notice} accessibilityRole="alert">
          <Ionicons name="location-outline" size={20} color={colors.warn} />
          <T variant="small" color={colors.warn} style={{ flex: 1 }}>
            Location permission is off, so this uses central {dest.city}. Turn on location in your phone settings to use GPS.
          </T>
        </View>
      ) : null}

      {loading ? (
        <View style={{ gap: space.md }} accessibilityLabel="Finding you">
          <Skeleton height={330} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : (
        <>
          <Ticket
            style={{ marginTop: space.xs }}
            stub={
              <View style={styles.stub}>
                <View style={styles.stats}>
                  <Stat icon="navigate-outline" label="Distance" value={`${kmLabel(first.km)} ${compassPoint(bearingDeg(origin, first))}`} />
                  <Stat icon="car-outline" label="Drive" value={drive(first.km)} />
                  <Stat icon="time-outline" label="There" value={`${time12(partsInTz(now, first.tz).hhmm)}`} />
                </View>
                <Button label="Directions" icon="navigate" size="md" onPress={() => directions(first)} accessibilityHint={`Opens maps to ${first.name}`} />
              </View>
            }>
            <View style={styles.main}>
              <View style={styles.top}>
                <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
                  Nearest · {tzAbbrev(first.tz)}
                </T>
                <Stamp label="Closest" tone="accent" />
              </View>
              <T variant="hero" accessibilityRole="header">
                {first.iata}
              </T>
              <View>
                <T variant="title" weight="bold">
                  {first.name}
                </T>
                <T variant="small" color={colors.textSecondary}>
                  {first.city}, {first.country}
                </T>
              </View>
            </View>
          </Ticket>

          {rest.length ? (
            <View style={{ marginTop: space.section }}>
              <SectionHeader title="Other airports" />
              {rest.map((a, i) => (
                <View key={a.iata} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
                  <View style={styles.code} accessible accessibilityLabel={`Airport code ${a.iata}`}>
                    <T variant="numeralSm" style={{ fontSize: 18, lineHeight: 24 }}>
                      {a.iata}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="bodySm" weight="semibold">
                      {a.name}
                    </T>
                    <T variant="caption" color={colors.textSecondary}>
                      {a.city}, {a.country}
                    </T>
                    <T variant="kicker" color={colors.textSecondary} style={{ marginTop: 3 }}>
                      {kmLabel(a.km)} {compassPoint(bearingDeg(origin, a))} · {drive(a.km)}
                    </T>
                  </View>
                  <IconButton icon="navigate-outline" label={`Directions to ${a.name}`} onPress={() => directions(a)} />
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.lg, borderRadius: radius.card, borderWidth: line, borderColor: colors.warn, backgroundColor: colors.warnSoft },
  main: { padding: 16, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stub: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: space.lg },
  stats: { flexDirection: 'row', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.lg, borderTopWidth: hair, borderTopColor: colors.border },
  code: { minWidth: 64, height: 44, paddingHorizontal: 8, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
