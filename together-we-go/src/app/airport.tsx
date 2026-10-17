import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, Chip, Pill } from '@/components/ui/bits';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { getLocation, type LocationResult } from '@/services/location';
import { useNow } from '@/hooks/useTrip';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { bearingDeg, compassPoint, driveMinutes, kmLabel, nearestAirports } from '@/utils/geo';
import { partsInTz, time12, tzAbbrev } from '@/utils/time';

/** Tracks your location and finds the closest airports (works offline — the airport list is bundled). */
export default function AirportScreen() {
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const [from, setFrom] = useState<'trip' | 'me'>('trip');
  const [loc, setLoc] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const now = useNow(60000);

  const useMine = async () => {
    setFrom('me');
    if (loc) return;
    setLoading(true);
    setLoc(await getLocation(dest));
    setLoading(false);
  };

  const origin = from === 'me' && loc?.source === 'device' ? loc : { lat: dest.lat, lng: dest.lng };
  const list = nearestAirports(origin, 6);

  return (
    <Screen header={<Header title="Nearest airport" subtitle={from === 'me' ? 'From your current location' : `From central ${dest.city}`} />}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <Chip icon="business-outline" label={`${dest.city} centre`} active={from === 'trip'} onPress={() => setFrom('trip')} />
        <Chip icon="locate-outline" label="My location" active={from === 'me'} onPress={useMine} />
      </View>
      {loading ? (
        <View style={{ padding: 30, alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={colors.primary} />
          <T variant="small" color={colors.textSecondary}>
            Finding you…
          </T>
        </View>
      ) : null}
      {from === 'me' && loc?.source === 'fallback' ? (
        <Card style={{ marginBottom: 12, backgroundColor: colors.orangeSoft, borderColor: colors.orangeSoft }}>
          <T variant="small">Location permission is off, so we’re using central {dest.city}. Enable location in your phone settings to use GPS.</T>
        </Card>
      ) : null}
      <View style={{ gap: 10 }}>
        {list.map((a, i) => {
          const local = time12(partsInTz(now, a.tz).hhmm);
          return (
            <Card key={a.iata} style={[{ gap: 8 }, i === 0 && { borderColor: colors.primary, borderWidth: 2 }]}>
              <View style={styles.row}>
                <View style={[styles.code, i === 0 && { backgroundColor: colors.primary }]}>
                  <T variant="title" weight="bold" color={i === 0 ? colors.white : colors.primary}>
                    {a.iata}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="small" weight="semibold">
                    {a.name}
                  </T>
                  <T variant="caption" color={colors.textSecondary}>
                    {a.city}, {a.country}
                  </T>
                </View>
                {i === 0 ? <Pill label="Closest" /> : null}
              </View>
              <View style={[styles.row, { gap: 14 }]}>
                <View style={styles.stat}>
                  <Ionicons name="navigate-outline" size={13} color={colors.textSecondary} />
                  <T variant="caption">
                    {kmLabel(a.km)} {compassPoint(bearingDeg(origin, a))}
                  </T>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="car-outline" size={13} color={colors.textSecondary} />
                  <T variant="caption">~{driveMinutes(a.km)} min</T>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <T variant="caption">
                    {local} {tzAbbrev(a.tz)}
                  </T>
                </View>
              </View>
              <Button
                label="Directions"
                icon="navigate"
                size="sm"
                variant={i === 0 ? 'primary' : 'soft'}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`)}
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { width: 56, height: 44, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
