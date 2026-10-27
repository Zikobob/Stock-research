import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { typeIcon } from '@/components/trip/meta';
import { SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import type { Activity } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, hair, line, radius } from '@/theme';
import { time12 } from '@/utils/time';

import { checklistProgress, dateKicker, mapsUrl, nextPlanned, startsIn, startsSoon, timeParts, todaysChecklist, votingCount } from './logic';
import type { TripCtx } from './useHomeContext';

const openPlan = () => router.navigate('/(tabs)/itinerary');

/**
 * Up next: the next planned thing as a ticket (what and where on the main part; the start time and a way to get there on the stub),
 * today's checklist while the trip is on, and a quiet row when something is waiting for votes. With nothing planned it invites you to Plan.
 */
export function UpNextSection({ ctx }: { ctx: TripCtx }) {
  const { trip, status, tz, now, today, dayNo, tripLen } = ctx;
  const updateActivity = useAppStore((s) => s.updateActivity);
  const next = nextPlanned(trip.activities, tz, now);
  const todays = status === 'active' ? todaysChecklist(trip.activities, today) : [];
  const progress = checklistProgress(todays);
  const voting = votingCount(trip.activities);

  const openMaps = () => {
    if (next) Linking.openURL(mapsUrl(next.a)).catch(() => toast('Could not open maps on this device', { tone: 'warn' }));
  };

  return (
    <View>
      <SectionHeader title="Up next" action="See all" onAction={openPlan} />

      {next ? (
        <TicketOf
          a={next.a}
          ms={next.startUtc - now}
          onOpen={openPlan}
          onMaps={openMaps}
        />
      ) : (
        <View style={styles.invite}>
          <T variant="h3">Nothing planned yet</T>
          <T variant="small" color={colors.textSecondary}>
            Add the first thing to the plan and the crew can vote on it.
          </T>
          <Button label="Open the plan" icon="calendar-outline" variant="secondary" size="md" full={false} onPress={openPlan} />
        </View>
      )}

      {status === 'active' ? (
        <View style={{ marginTop: 20 }}>
          <View style={styles.listHead}>
            <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
              Today · Day {dayNo} of {tripLen}
            </T>
            <T variant="kicker" color={colors.ink}>
              {progress.done} / {progress.total} done
            </T>
          </View>
          {todays.length ? (
            todays.map((a) => (
              <Press
                key={a.id}
                onPress={() => updateActivity(trip.id, a.id, { done: !a.done })}
                style={styles.checkRow}
                scaleTo={0.99}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!a.done }}
                accessibilityLabel={`${a.title} at ${time12(a.time)}`}>
                <View style={[styles.box, a.done && { backgroundColor: colors.accent }]}>{a.done ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}</View>
                <T variant="kicker" color={colors.textSecondary} style={{ width: 70 }}>
                  {time12(a.time)}
                </T>
                <T variant="bodySm" weight="semibold" numberOfLines={1} style={[{ flex: 1 }, a.done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                  {a.title}
                </T>
              </Press>
            ))
          ) : (
            <T variant="small" color={colors.textSecondary} style={{ paddingVertical: 10 }}>
              A free day. Nothing on the plan.
            </T>
          )}
        </View>
      ) : null}

      {voting > 0 ? (
        <Press onPress={() => router.navigate({ pathname: '/(tabs)/itinerary', params: { tab: 'vote' } })} style={styles.voteRow} scaleTo={0.99} accessibilityLabel={`${voting} ${voting === 1 ? 'thing' : 'things'} to vote on. Open the Vote tab`}>
          <Ionicons name="thumbs-up-outline" size={18} color={colors.ink} />
          <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
            {voting} {voting === 1 ? 'thing' : 'things'} to vote on
          </T>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </Press>
      ) : null}
    </View>
  );
}

/** The ticket for one activity. The main part opens the plan; the stub holds the time and the maps button (siblings, never nested). */
function TicketOf({ a, ms, onOpen, onMaps }: { a: Activity; ms: number; onOpen: () => void; onMaps: () => void }) {
  const time = timeParts(a.time);
  const soon = startsSoon(ms);
  return (
    <Ticket
      plated={false}
      stub={
        <View style={styles.stub}>
          <View>
            <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 9.5 }}>
              Starts
            </T>
            <View style={styles.clock} accessible accessibilityLabel={`Starts at ${time12(a.time)}`}>
              <T variant="numeral">{time.clock}</T>
              <T variant="kicker" color={colors.ink}>
                {time.suffix}
              </T>
            </View>
          </View>
          <Button label="Open in maps" icon="navigate-outline" variant="secondary" size="sm" full={false} onPress={onMaps} accessibilityHint="Opens the place in your maps app" />
        </View>
      }>
      <Press onPress={onOpen} scaleTo={0.99} style={styles.main} accessibilityLabel={`Next: ${a.title}, ${a.location}. ${startsIn(ms)}. Open the plan`}>
        <View style={styles.topRow}>
          <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
            {dateKicker(a.date)}
          </T>
          <Stamp label={startsIn(ms)} tone={soon ? 'accent' : 'ink'} />
        </View>
        <View style={styles.titleRow}>
          <View style={styles.kind}>
            <Ionicons name={typeIcon(a.type)} size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="h2" numberOfLines={2}>
              {a.title}
            </T>
            <View style={styles.place}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <T variant="small" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {a.location}
              </T>
            </View>
          </View>
        </View>
      </Press>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  main: { padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kind: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stub: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 10, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  clock: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  invite: { gap: 8, padding: 16, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink, borderRadius: radius.card, alignItems: 'flex-start' },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: line, borderBottomColor: colors.ink },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: hair, borderBottomColor: colors.border },
  box: { width: 26, height: 26, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 8, borderBottomWidth: hair, borderBottomColor: colors.border },
});
