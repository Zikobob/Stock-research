import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AvatarStack, Card, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';

import { crewCounts } from './logic';
import type { TripCtx } from './useHomeContext';

/**
 * Who is coming: four faces and "+N", how many are going and how many are only invited, and the Invite button that copies the code.
 * The strip opens the crew; the button is its sibling (never inside it).
 */
export function CrewSection({ ctx, onInvite }: { ctx: TripCtx; onInvite: () => void }) {
  const { trip } = ctx;
  const { going, invited } = crewCounts(trip.members);
  return (
    <View>
      <SectionHeader title="Your crew" action="Open" onAction={() => router.push('/crew')} />
      <Card style={styles.card}>
        <Press
          onPress={() => router.push('/crew')}
          scaleTo={0.98}
          style={styles.strip}
          accessibilityLabel={`${going} going${invited ? `, ${invited} invited` : ''}. Open the crew`}>
          <AvatarStack people={trip.members} max={4} size={38} />
          <View style={styles.count}>
            <T variant="numeralSm">{going}</T>
            <T variant="small" weight="bold">
              Going
            </T>
            {invited ? (
              <T variant="small" color={colors.textSecondary}>
                · {invited} Invited
              </T>
            ) : null}
          </View>
        </Press>
        <Button label="Invite" icon="person-add-outline" size="md" full={false} onPress={onInvite} accessibilityHint={`Copies the invite code ${trip.inviteCode}`} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 12 },
  strip: { flexGrow: 1, flexShrink: 1, minHeight: 56, justifyContent: 'center', gap: 8 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
});
