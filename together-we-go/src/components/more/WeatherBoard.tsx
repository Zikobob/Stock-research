import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';
import { cToF, weatherInfo } from '@/services/weather';
import type { WeatherSnapshot } from '@/store/types';
import { colors, isDark, line, radius } from '@/theme';
import { dayLabel, weekdayShort } from '@/utils/time';

/** The board is black with paper-coloured print in the light mode; at night it is the dark card with cream print. */
const BOARD = isDark ? { bg: colors.card, fg: colors.ink } : { bg: colors.ink, fg: colors.bg };
/** Today's row is lit in the accent (in the Ink theme the accent is the board's own colour, so it is lit in paper instead). */
const LIT = colors.accent === BOARD.bg ? { bg: BOARD.fg, fg: BOARD.bg } : { bg: colors.accent, fg: colors.onAccent };

/**
 * The week as a departures board: one row per day with the weekday and date, the sky, the chance of rain, the low, a bar from low to
 * high and the high, all in mono print. Today is the row that is lit.
 */
export function WeatherBoard({ daily, city, unitF }: { daily: WeatherSnapshot['daily']; city: string; unitF: boolean }) {
  const maxT = Math.max(...daily.map((x) => x.max));
  const minT = Math.min(...daily.map((x) => x.min));
  const span = Math.max(1, maxT - minT);
  const deg = (c: number) => `${unitF ? cToF(c) : c}°`;
  return (
    <View style={styles.board}>
      <View style={styles.head}>
        <View style={styles.bullet} />
        <T variant="kicker" color={BOARD.fg} numberOfLines={1} style={{ flex: 1 }}>
          {daily.length} days · {city}
        </T>
      </View>
      <View style={[styles.row, { paddingVertical: 0, minHeight: 22 }]} accessibilityElementsHidden importantForAccessibility="no">
        <T variant="kicker" color={BOARD.fg} style={[styles.day, styles.small]}>
          Day
        </T>
        <View style={styles.sky} />
        <T variant="kicker" color={BOARD.fg} style={[styles.rain, styles.small]}>
          Rain
        </T>
        <T variant="kicker" color={BOARD.fg} style={[styles.temp, styles.small]}>
          Low
        </T>
        <View style={{ flex: 1 }} />
        <T variant="kicker" color={BOARD.fg} style={[styles.temp, styles.small]}>
          High
        </T>
      </View>
      {daily.map((x, i) => {
        const today = i === 0;
        const fg = today ? LIT.fg : BOARD.fg;
        return (
          <View key={x.date} style={[styles.row, today && { backgroundColor: LIT.bg }]} accessible accessibilityLabel={`${today ? 'Today' : weekdayShort(x.date)} ${dayLabel(x.date)}: ${weatherInfo(x.code).label}, ${x.rain} percent chance of rain, low ${deg(x.min)}, high ${deg(x.max)}`}>
            <View style={styles.day}>
              <T variant="kicker" color={fg}>
                {today ? 'Today' : weekdayShort(x.date)}
              </T>
              <T variant="kicker" color={fg} style={styles.dim}>
                {dayLabel(x.date)}
              </T>
            </View>
            <View style={styles.sky}>
              <Ionicons name={weatherInfo(x.code).icon} size={22} color={fg} />
            </View>
            <T variant="kicker" color={fg} style={styles.rain}>
              {x.rain}%
            </T>
            <T variant="numeralSm" color={fg} style={[styles.temp, styles.num]}>
              {deg(x.min)}
            </T>
            <View style={[styles.track, { backgroundColor: fg + '40' }]}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${((x.min - minT) / span) * 100}%`, right: `${((maxT - x.max) / span) * 100}%`, backgroundColor: fg }} />
            </View>
            <T variant="numeralSm" color={fg} style={[styles.temp, styles.num]}>
              {deg(x.max)}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: BOARD.bg, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, padding: 8, paddingTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 10 },
  bullet: { width: 10, height: 10, backgroundColor: LIT.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 6, minHeight: 52, borderRadius: radius.chip },
  day: { width: 50 },
  sky: { width: 24, alignItems: 'center' },
  rain: { width: 34, textAlign: 'right' },
  temp: { width: 36, textAlign: 'right' },
  num: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 9.5, opacity: 0.7 },
  dim: { fontSize: 10, opacity: 0.7 },
  track: { flex: 1, height: 8 },
});
