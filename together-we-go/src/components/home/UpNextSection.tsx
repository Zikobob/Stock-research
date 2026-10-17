import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { typeEmoji } from '@/components/trip/meta';
import { Card, SectionHeader } from '@/components/ui/bits';
import { FadeIn, Pulse } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { nextUpcoming } from '@/services/notifications';
import type { Activity, Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, shadow } from '@/theme';
import { countdownLabel, lengthTag } from '@/utils/format';
import { dayLabel, time12, weekdayShort } from '@/utils/time';

/** "Up next": today's checklist while the trip is on, and the next planned activity with a countdown. */
export function UpNextSection({ trip, status, todays, dayNo, tripLen, next, now }: { trip: Trip; status: 'planning' | 'active' | 'completed' | null; todays: Activity[]; dayNo: number; tripLen: number; next: ReturnType<typeof nextUpcoming>; now: number }) {
  const updateActivity = useAppStore((s) => s.updateActivity);
  return (
    <FadeIn delay={200}>
      <SectionHeader title="Up next" action="See all" onAction={() => router.navigate('/(tabs)/itinerary')} style={{ marginTop: 24 }} />
      {status === 'active' ? (
        <Card style={{ marginBottom: 10, gap: 10 }}>
          <View style={styles.rowBetween}>
            <T variant="title" weight="bold">
              Today · Day {dayNo} of {tripLen}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {todays.filter((a) => a.done).length}/{todays.length} done
            </T>
          </View>
          {todays.length ? (
            todays.map((a) => (
              <Press key={a.id} onPress={() => updateActivity(trip.id, a.id, { done: !a.done })} style={styles.todayRow} accessibilityRole="checkbox" accessibilityState={{ checked: !!a.done }} accessibilityLabel={`${a.title} at ${a.time}`}>
                <Ionicons name={a.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={a.done ? colors.positive : colors.borderStrong} />
                <T variant="caption" weight="bold" color={colors.textSecondary} style={{ width: 40 }}>
                  {a.time}
                </T>
                <T variant="small" weight="semibold" numberOfLines={1} style={[{ flex: 1 }, a.done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                  {a.title}
                </T>
              </Press>
            ))
          ) : (
            <T variant="small" color={colors.textSecondary}>
              A free day. Enjoy it!
            </T>
          )}
        </Card>
      ) : null}
      {next ? (
        <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.next} accessibilityLabel={`Next: ${next.a.title}`}>
          <View style={styles.nextBadge}>
            <T style={{ fontSize: 22, lineHeight: 28 }}>{typeEmoji[next.a.type]}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="small" weight="bold" numberOfLines={1}>
              {next.a.title}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {weekdayShort(next.a.date)}, {dayLabel(next.a.date)} · {time12(next.a.time)} · {lengthTag(next.a.durationMin)}
            </T>
          </View>
          {next.a.reminder ? (
            <Pulse>
              <Ionicons name="notifications" size={16} color={colors.primary} />
            </Pulse>
          ) : null}
          <View style={styles.countdown}>
            <T variant="micro" weight="bold" color={colors.onPrimary}>
              {next.startUtc - now > 0 ? `in ${countdownLabel(next.startUtc - now)}` : 'Now'}
            </T>
          </View>
        </Press>
      ) : (
        <Card>
          <T variant="small" color={colors.textSecondary}>
            Nothing scheduled yet.
          </T>
        </Card>
      )}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.xl, padding: 14, ...shadow },
  nextBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  countdown: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
