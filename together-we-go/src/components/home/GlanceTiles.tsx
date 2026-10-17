import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Destination } from '@/data/destinations';
import type { useWeather } from '@/hooks/useTrip';
import { weatherInfo } from '@/services/weather';
import { colors, radius, shadow } from '@/theme';
import { partsInTz, time12 } from '@/utils/time';

/** Two small tiles: today's weather in the destination, and the local time there (with the time at home). */
export function GlanceTiles({ dest, weather, now, tz, homeTz }: { dest: Destination | undefined; weather: ReturnType<typeof useWeather>; now: number; tz: string; homeTz: string }) {
  const todayWx = weather?.daily[0];
  return (
    <FadeIn delay={80}>
      <View style={styles.tiles}>
        <Press onPress={() => router.push('/weather')} style={styles.tile} accessibilityLabel={`Weather in ${dest?.city}`}>
          <T variant="kicker" color={colors.textSecondary}>
            Weather
          </T>
          <View style={styles.tileRow}>
            <Ionicons name={weather ? weatherInfo(weather.current.code).icon : 'partly-sunny'} size={34} color="#F5A524" />
            <T variant="h1" weight="extrabold" style={{ fontSize: 36, lineHeight: 40 }}>
              {weather ? `${weather.current.temp}°` : '—'}
            </T>
          </View>
          <T variant="micro" color={colors.textSecondary}>
            {todayWx ? `H ${Math.round(todayWx.max)}° · L ${Math.round(todayWx.min)}°` : 'Loading forecast…'}
          </T>
        </Press>
        <View style={styles.tile} accessible accessibilityLabel={`Local time in ${dest?.city}`}>
          <T variant="kicker" color={colors.textSecondary}>
            Local time
          </T>
          <T variant="h1" weight="extrabold" style={{ marginTop: 6 }}>
            {time12(partsInTz(now, tz).hhmm)}
          </T>
          <T variant="micro" color={colors.textSecondary} style={{ marginTop: 4 }}>
            Home {time12(partsInTz(now, homeTz).hhmm)}
          </T>
        </View>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, minHeight: 112, ...shadow },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
});
