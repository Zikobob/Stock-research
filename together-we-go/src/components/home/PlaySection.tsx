import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/bits';
import { Rule } from '@/components/ui/Rule';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';
import { crewStandings } from '@/utils/points';

import { podiumView } from './logic';
import { Podium } from './Podium';
import { TriviaSlip } from './TriviaSlip';
import type { HomeCtx } from './useHomeContext';
import { hasTrip } from './useHomeContext';
import { VoteCard } from './VoteCard';

/**
 * Play: today's trivia, the crew-points podium and one thing to vote on. Each part shows only when it has something to show,
 * and they sit open on the page, told apart by a small label and a rule, not by three boxes.
 */
export function PlaySection({ ctx }: { ctx: HomeCtx }) {
  const trip = hasTrip(ctx) ? ctx.trip : undefined;
  const podium = trip ? podiumView(crewStandings(trip), ctx.userId) : null;
  return (
    <View>
      <SectionHeader title="Play" />
      <TriviaSlip today={ctx.today} />
      {podium ? (
        <View style={styles.part}>
          <Rule weight={1} />
          <T variant="kicker" color={colors.textSecondary}>
            Crew points
          </T>
          <Podium view={podium} userId={ctx.userId} />
        </View>
      ) : null}
      {trip ? <VoteCard ctx={{ ...ctx, trip }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { marginTop: 24, gap: 12 },
});
