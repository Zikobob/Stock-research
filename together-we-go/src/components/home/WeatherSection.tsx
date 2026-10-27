import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { useWeather } from '@/hooks/useTrip';
import { weatherInfo } from '@/services/weather';
import { colors, isDark, line, radius } from '@/theme';
import { dayLabel, deviceTimeZone, weekdayShort } from '@/utils/time';

import { clockPair, typicalIcon, weatherView, type WeatherDay } from './logic';
import type { TripCtx } from './useHomeContext';

/** The board is black with paper-coloured print in the light mode; at night it is the dark card with cream print and a cream outline. */
const BOARD = isDark ? { bg: colors.card, fg: colors.ink } : { bg: colors.ink, fg: colors.bg };

/** Today's column is lit in the accent; in the Ink theme the accent is the board's own colour, so it is lit in paper instead. */
const LIT = colors.accent === BOARD.bg ? { bg: BOARD.fg, fg: BOARD.bg } : { bg: colors.accent, fg: colors.onAccent };

/** One trip day as a column of the board: the weekday, the date, an icon, the high and the low. Today is the highlighted column. */
function DayColumn({ d, today }: { d: WeatherDay; today: boolean }) {
  const icon = d.code === null ? typicalIcon(d.max) : weatherInfo(d.code).icon;
  const fg = today ? LIT.fg : BOARD.fg;
  return (
    <View style={[styles.col, today && { backgroundColor: LIT.bg }]} accessible accessibilityLabel={`${weekdayShort(d.date)} ${dayLabel(d.date)}: high ${d.max}, low ${d.min}`}>
      <T variant="kicker" color={fg}>
        {weekdayShort(d.date)}
      </T>
      <T variant="kicker" color={fg} style={{ opacity: 0.7 }}>
        {Number(d.date.slice(8))}
      </T>
      <Ionicons name={icon} size={24} color={fg} style={{ marginVertical: 8 }} />
      <T variant="numeralSm" color={fg}>
        {d.max}°
      </T>
      <T variant="kicker" color={fg} style={{ opacity: 0.7, fontSize: 13, lineHeight: 18 }}>
        {d.min}°
      </T>
    </View>
  );
}

/** The same size as the board, so nothing jumps when the forecast arrives. */
function BoardSkeleton() {
  return (
    <View accessibilityLabel="Loading the forecast">
      <Skeleton height={188} corner={radius.card} />
    </View>
  );
}

/**
 * Weather as a departures board: a dark panel with one column per day of the trip (weekday, icon, high and low, today lit in
 * the accent), scrolling sideways when the trip is long, and the time there and at home in mono along the bottom.
 * Before the forecast reaches the trip it says "Typical weather", and says why.
 */
export function WeatherSection({ ctx }: { ctx: TripCtx }) {
  const { trip, dest, today, now, tz } = ctx;
  const snapshot = useWeather(dest?.id);
  const city = dest?.city ?? 'your destination';
  const view = snapshot ? weatherView({ startDate: trip.startDate, endDate: trip.endDate, today, lat: dest?.lat ?? 0, snapshot }) : null;
  const clocks = clockPair(now, tz, deviceTimeZone());
  const open = () => router.push('/weather');
  return (
    <View>
      <SectionHeader title="Weather" action="Details" onAction={open} />
      {view ? (
        <>
          <Press onPress={open} scaleTo={0.99} style={styles.board} accessibilityLabel={`${view.title} in ${city}. Open the weather`}>
            <View style={styles.boardHead}>
              <View style={styles.bullet} />
              <T variant="kicker" color={BOARD.fg} numberOfLines={1} style={{ flex: 1 }}>
                {view.title} · {city}
              </T>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cols}>
              {view.days.map((d) => (
                <DayColumn key={d.date} d={d} today={d.date === today} />
              ))}
            </ScrollView>
            <View style={styles.clocks}>
              <View accessible accessibilityLabel={`${clocks.there} in ${city}`}>
                <T variant="kicker" color={BOARD.fg} style={{ opacity: 0.7, fontSize: 9.5 }}>
                  {city}
                </T>
                <T variant="numeralSm" color={BOARD.fg} style={{ fontSize: 17, lineHeight: 22 }}>
                  {clocks.there}
                </T>
              </View>
              <View accessible accessibilityLabel={clocks.same ? `${clocks.home} at home, the same time` : `${clocks.home} at home`}>
                <T variant="kicker" color={BOARD.fg} style={{ opacity: 0.7, fontSize: 9.5, textAlign: 'right' }}>
                  Home
                </T>
                <T variant="numeralSm" color={BOARD.fg} style={{ fontSize: 17, lineHeight: 22, textAlign: 'right' }}>
                  {clocks.home}
                </T>
              </View>
            </View>
          </Press>
          {view.kind === 'typical' ? (
            <T variant="caption" color={colors.textSecondary} style={{ marginTop: 10 }}>
              {view.note}
            </T>
          ) : null}
        </>
      ) : (
        <BoardSkeleton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: BOARD.bg, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, paddingTop: 14, paddingBottom: 12, overflow: 'hidden' },
  boardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  bullet: { width: 10, height: 10, backgroundColor: LIT.bg },
  cols: { flexGrow: 1, paddingHorizontal: 8, gap: 2 },
  col: { flex: 1, minWidth: 50, alignItems: 'center', paddingVertical: 10, borderRadius: radius.chip },
  clocks: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.textMuted },
});
