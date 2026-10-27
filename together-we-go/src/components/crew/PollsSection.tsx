import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { celebrate } from '@/components/ui/Confetti';
import { confirmAction } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { AvatarStack, Card, Divider, EmptyState, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { useAppStore } from '@/store/useAppStore';
import type { Poll, Trip } from '@/store/types';
import { colors, line, radius, space } from '@/theme';

import { pollView } from './polls';

/** The group's polls: vote, close or delete, and start a new one. Each answer is an ink bar that grows as the votes come in. */
export function PollsSection({ trip, userId, owner, onNew }: { trip: Trip; userId: string; owner: boolean; onNew: () => void }) {
  return (
    <View>
      <SectionHeader title="Polls" action={trip.polls.length ? '+ New poll' : undefined} onAction={onNew} />
      {trip.polls.length ? (
        <View style={{ gap: 16 }}>
          {trip.polls.map((p) => (
            <PollCard key={p.id} poll={p} trip={trip} userId={userId} canManage={p.createdBy === userId || owner} />
          ))}
        </View>
      ) : (
        <EmptyState icon="stats-chart-outline" title="No polls yet" body="Put a question to the crew and watch the votes come in.">
          <Button label="New poll" icon="add" onPress={onNew} />
        </EmptyState>
      )}
    </View>
  );
}

function PollCard({ poll: p, trip, userId, canManage }: { poll: Poll; trip: Trip; userId: string; canManage: boolean }) {
  const s = useAppStore.getState();
  const view = pollView(p, userId, trip.members.map((m) => m.id));
  const voted = view.rows.some((r) => r.mine);
  // the stamp slams down on the poll the person has just closed, and only then
  const [slam, setSlam] = useState(false);

  const closeOrReopen = () => {
    const winner = view.rows.find((r) => r.id === view.winnerId);
    s.closePoll(trip.id, p.id);
    if (!p.closed && winner) {
      setSlam(true);
      celebrate(`Locked in: ${winner.text}`);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.top}>
        <T variant="h3" style={{ flex: 1 }}>
          {p.question}
        </T>
        {view.stamp === 'locked' ? <Stamp label="Locked in" tone="positive" icon="lock-closed" slam={slam} /> : view.stamp === 'closed' ? <Stamp label="Closed" tone="muted" slam={slam} /> : <Stamp label="Open" tone="ink" rotate={0} />}
      </View>
      <T variant="kicker" color={colors.textSecondary} style={{ marginTop: -8 }}>
        {view.total} {view.total === 1 ? 'vote' : 'votes'}
      </T>

      <View style={{ gap: 4 }}>
        {view.rows.map((o) => {
          const winner = p.closed && o.id === view.winnerId;
          return (
            <Press
              key={o.id}
              disabled={p.closed}
              onPress={() => {
                s.votePoll(trip.id, p.id, o.id);
                tap();
              }}
              scaleTo={0.99}
              style={styles.option}
              accessibilityState={{ selected: o.mine, disabled: !!p.closed }}
              accessibilityLabel={`${o.text}, ${o.pct} percent${o.mine ? ', your vote' : ''}`}>
              <View style={styles.optionTop}>
                {p.closed ? (
                  o.mine ? <Ionicons name="checkmark" size={18} color={colors.ink} /> : null
                ) : (
                  <View style={[styles.box, o.mine && { backgroundColor: colors.accent }]}>{o.mine ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}</View>
                )}
                <T variant="bodySm" weight={o.mine || winner ? 'bold' : 'regular'} style={{ flex: 1 }}>
                  {o.text}
                </T>
                <T variant="numeralSm" accessibilityElementsHidden importantForAccessibility="no">
                  {o.pct}%
                </T>
              </View>
              <ProgressBar value={o.pct / 100} color={winner ? colors.accent : colors.primary} track={colors.bgAlt} height={14} />
              {o.voters.length ? (
                <View style={styles.voters}>
                  <AvatarStack people={o.voters.map((id) => trip.members.find((m) => m.id === id) ?? { name: 'Former member' })} max={6} size={26} />
                </View>
              ) : null}
            </Press>
          );
        })}
      </View>

      <T variant="caption" color={colors.textMuted}>
        {p.closed ? (view.tie ? 'Voting closed. It was a tie.' : 'Voting closed') : voted ? 'Tap again to remove your vote' : 'Tap an answer to vote'}
      </T>

      {canManage ? (
        <>
          <Divider style={{ marginTop: -4 }} />
          <View style={styles.manage}>
            <Button label={p.closed ? 'Reopen' : 'Close poll'} variant="secondary" size="sm" full={false} icon={p.closed ? 'lock-open-outline' : 'lock-closed-outline'} onPress={closeOrReopen} />
            <Press
              onPress={() => confirmAction('Delete poll?', p.question, () => s.deletePoll(trip.id, p.id), { destructive: true, confirmLabel: 'Delete' })}
              accessibilityLabel={`Delete poll ${p.question}`}
              style={styles.delete}>
              <Ionicons name="trash-outline" size={16} color={colors.red} />
              <T variant="kicker" color={colors.red}>
                Delete
              </T>
            </Press>
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  option: { gap: 8, paddingVertical: 8, minHeight: 56 },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 22, height: 22, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  voters: { flexDirection: 'row', paddingLeft: 0 },
  manage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12 },
});
