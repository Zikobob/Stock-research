import { StyleSheet, View } from 'react-native';

import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Card, Pill, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { confirmAction } from '@/components/ui/feedback';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors, radius } from '@/theme';

/** The group's polls: vote, close or delete, and start a new one. */
export function PollsSection({ trip, userId, owner, onNew }: { trip: Trip; userId: string; owner: boolean; onNew: () => void }) {
  const t = useT();
  const s = useAppStore.getState();
  return (
    <>
      <SectionHeader title={t('hub.vote')} action="+ New poll" onAction={onNew} style={{ marginTop: 26 }} />
      <View style={{ gap: 10 }}>
        {trip.polls.length ? (
          trip.polls.map((p) => {
            const total = p.options.reduce((n, o) => n + o.votes.length, 0);
            const voted = p.options.find((o) => o.votes.includes(userId));
            return (
              <Card key={p.id} style={{ gap: 10 }}>
                <View style={styles.rowBetween}>
                  <T variant="title" weight="bold" style={{ flex: 1 }}>
                    {p.question}
                  </T>
                  {p.closed ? <Pill label="Closed" tone="gray" /> : <Pill label={`${total} vote${total === 1 ? '' : 's'}`} tone="yellow" />}
                </View>
                {p.options.map((o) => {
                  const pctv = total ? Math.round((o.votes.length / total) * 100) : 0;
                  const mine = o.votes.includes(userId);
                  return (
                    <Press
                      key={o.id}
                      disabled={p.closed}
                      onPress={() => {
                        s.votePoll(trip.id, p.id, o.id);
                        tap();
                      }}
                      style={[styles.option, mine && styles.optionOn]}
                      accessibilityLabel={`${o.text}, ${pctv} percent${mine ? ', your vote' : ''}`}>
                      <View style={styles.rowBetween}>
                        <T variant="caption" weight={mine ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                          {mine ? '✓ ' : ''}
                          {o.text}
                        </T>
                        <T variant="caption" color={colors.textSecondary}>
                          {pctv}%
                        </T>
                      </View>
                      <ProgressBar value={pctv / 100} height={5} />
                    </Press>
                  );
                })}
                <View style={styles.rowBetween}>
                  <T variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
                    {voted ? 'Tap again to remove your vote' : p.closed ? 'Voting closed' : 'Tap an option to vote'}
                  </T>
                  {p.createdBy === userId || owner ? (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Press onPress={() => s.closePoll(trip.id, p.id)} hitSlop={6}>
                        <T variant="caption" weight="semibold" color={colors.text}>
                          {p.closed ? 'Reopen' : 'Close'}
                        </T>
                      </Press>
                      <Press
                        onPress={() => confirmAction('Delete poll?', p.question, () => s.deletePoll(trip.id, p.id), { destructive: true, confirmLabel: 'Delete' })}
                        hitSlop={6}>
                        <T variant="caption" weight="semibold" color={colors.red}>
                          Delete
                        </T>
                      </Press>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <T variant="small" color={colors.textSecondary}>
              No polls yet — start one to settle a decision fast.
            </T>
          </Card>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  option: { gap: 6, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  optionOn: { borderColor: colors.primaryLine, backgroundColor: colors.primarySofter },
});
