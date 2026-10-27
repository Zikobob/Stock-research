import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { Rule } from '@/components/ui/Rule';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';
import { dayLabel, time12, weekdayShort } from '@/utils/time';

import { nextToVote, voteLine, voteLocks, voteTally } from './logic';
import type { TripCtx } from './useHomeContext';

/** One small square per yes vote the activity needs: filled with the accent when someone has said yes. */
function Ballot({ ups, needed }: { ups: number; needed: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: Math.min(needed, 8) }, (_, i) => (
        <View key={i} style={[styles.box, i < ups && { backgroundColor: colors.accent }]}>
          {i < ups ? <Ionicons name="checkmark" size={13} color={colors.onAccent} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * "Up for a vote": the first plan item still waiting for your vote, with big yes and no buttons and the live tally.
 * Your vote counts at once; if it is the one that makes a majority the item locks in with a stamp and a small celebration.
 * The item stays on screen, now settled, until you move on to the next one.
 */
export function VoteCard({ ctx }: { ctx: TripCtx }) {
  const { trip, userId } = ctx;
  const vote = useAppStore((s) => s.voteActivity);
  const [done, setDone] = useState<{ id: string; value: 1 | -1; locked: boolean } | null>(null);
  const next = nextToVote(trip.activities, userId);
  const shown = done ? trip.activities.find((a) => a.id === done.id) : next;
  if (!shown) return null;
  const n = trip.members.length;
  const tally = voteTally(shown, n);

  const cast = (value: 1 | -1) => {
    const locked = voteLocks(shown, userId, n, value);
    vote(trip.id, shown.id, value);
    setDone({ id: shown.id, value, locked });
    if (locked) celebrate(`Locked in: ${shown.title}`);
    else toast(value === 1 ? 'Your yes is counted' : 'Your no is counted', { icon: value === 1 ? 'thumbs-up' : 'thumbs-down' });
  };

  return (
    <View style={{ marginTop: 24, gap: 12 }}>
      <Rule weight={1} />
      <View style={styles.head}>
        <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
          Up for a vote
        </T>
        {done ? <Stamp label={done.locked || shown.status !== 'voting' ? 'Locked in' : 'Vote counted'} tone={done.locked || shown.status !== 'voting' ? 'positive' : 'ink'} icon={done.locked || shown.status !== 'voting' ? 'lock-closed' : 'checkmark'} slam /> : null}
      </View>
      <View style={{ gap: 2 }}>
        <T variant="h2" numberOfLines={2}>
          {shown.title}
        </T>
        <T variant="small" color={colors.textSecondary} numberOfLines={1}>
          {weekdayShort(shown.date)} {dayLabel(shown.date)} · {time12(shown.time)} · {shown.location}
        </T>
      </View>
      <View style={styles.tally}>
        <Ballot ups={tally.ups} needed={tally.needed} />
        <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
          {voteLine(shown, n)}
        </T>
      </View>
      {done ? (
        <View style={{ gap: 8 }}>
          <T variant="bodySm" weight="semibold">
            {done.value === 1 ? 'You voted yes.' : 'You voted no.'}
          </T>
          {next ? <Button label="Next vote" iconRight="arrow-forward" variant="secondary" size="md" full={false} onPress={() => setDone(null)} /> : (
            <Button label="See the plan" iconRight="arrow-forward" variant="secondary" size="md" full={false} onPress={() => router.navigate('/(tabs)/itinerary')} />
          )}
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button label="I’m in" icon="thumbs-up-outline" variant="accent" size="md" style={{ flex: 1 }} onPress={() => cast(1)} accessibilityHint={`Vote yes on ${shown.title}`} />
          <Button label="Not for me" icon="thumbs-down-outline" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => cast(-1)} accessibilityHint={`Vote no on ${shown.title}`} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  tally: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttons: { flexDirection: 'row', gap: 12 },
  box: { width: 22, height: 22, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
