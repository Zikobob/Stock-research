import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { useWeather } from '@/hooks/useTrip';
import { weatherInfo } from '@/services/weather';
import { colors, radius } from '@/theme';
import { dayLabel, deviceTimeZone, weekdayShort } from '@/utils/time';

import { timeLine, typicalIcon, weatherView, type WeatherDay } from './logic';
import type { TripCtx } from './useHomeContext';

const TILE = 64;

function DayTile({ d, first }: { d: WeatherDay; first: boolean }) {
  const icon = d.code === null ? typicalIcon(d.max) : weatherInfo(d.code).icon;
  return (
    <View style={[styles.tile, first && { backgroundColor: colors.accentSoft }]} accessible accessibilityLabel={`${weekdayShort(d.date)} ${dayLabel(d.date)}: high ${d.max}, low ${d.min}`}>
      <T variant="caption" weight="bold" color={colors.textSecondary}>
        {weekdayShort(d.date)} {Number(d.date.slice(8))}
      </T>
      <Ionicons name={icon} size={26} color={colors.text} />
      <T variant="title" weight="bold">
        {d.max}°
      </T>
      <T variant="small" color={colors.textMuted}>
        {d.min}°
      </T>
    </View>
  );
}

/** A tile-shaped grey block per day while the forecast loads, so nothing moves when it arrives. */
function WeatherSkeleton() {
  return (
    <View accessibilityLabel="Loading the forecast" style={{ gap: 12 }}>
      <Skeleton width={150} height={14} corner={7} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={TILE} height={116} corner={radius.card} />
        ))}
      </View>
      <Skeleton width={220} height={14} corner={7} />
    </View>
  );
}

/** One card: the trip’s days with icon and high / low, and the time there and at home. Before the forecast reaches the trip it says "Typical weather". */
export function WeatherSection({ ctx }: { ctx: TripCtx }) {
  const { trip, dest, today, now, tz } = ctx;
  const snapshot = useWeather(dest?.id);
  const city = dest?.city ?? 'your destination';
  const view = snapshot ? weatherView({ startDate: trip.startDate, endDate: trip.endDate, today, lat: dest?.lat ?? 0, snapshot }) : null;
  return (
    <View>
      <SectionHeader title="Weather" action="Details" onAction={() => router.push('/weather')} />
      <Card padded={false}>
        <Press onPress={() => router.push('/weather')} scaleTo={0.99} style={styles.body} accessibilityLabel={view ? `${view.title} in ${city}. Open the weather` : `Weather in ${city}. Loading`}>
          {view ? (
            <>
              <View style={styles.titleRow}>
                <T variant="kicker" color={colors.textSecondary}>
                  {view.title} · {city}
                </T>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days} contentContainerStyle={styles.daysInner}>
                {view.days.map((d, i) => (
                  <DayTile key={d.date} d={d} first={i === 0 && d.date === today} />
                ))}
              </ScrollView>
              {view.kind === 'typical' ? (
                <T variant="caption" color={colors.textSecondary}>
                  {view.note}
                </T>
              ) : null}
            </>
          ) : (
            <WeatherSkeleton />
          )}
          <View style={styles.clock}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <T variant="small" weight="semibold" color={colors.textSecondary} numberOfLines={2} style={{ flex: 1 }}>
              {timeLine(now, tz, deviceTimeZone(), city)}
            </T>
          </View>
        </Press>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  days: { marginHorizontal: -16 },
  daysInner: { gap: 8, paddingHorizontal: 16 },
  tile: { width: TILE, minHeight: 116, borderRadius: radius.card, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
