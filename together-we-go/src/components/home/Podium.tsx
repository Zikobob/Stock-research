import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

import { ordinal, podiumSlots, type PodiumView } from './logic';

const first = (name: string) => name.split(' ')[0];

/**
 * Crew points as a podium of three ink blocks of different heights (second, first, third), each with a face, a name and the points in mono.
 * The winner's block is the accent. When you are not on the podium your own row sits underneath, highlighted. The whole thing opens the crew.
 */
export function Podium({ view, userId }: { view: PodiumView; userId: string }) {
  const slots = podiumSlots(view.top);
  const summary = view.top.map((s) => `${ordinal(s.rank)} ${s.memberId === userId ? 'you' : first(s.name)}, ${s.points} points`).join('. ');
  return (
    <Press onPress={() => router.push('/crew')} scaleTo={0.99} style={{ gap: 12 }} accessibilityLabel={`Crew points. ${summary}${view.me ? `. You are ${ordinal(view.me.rank)} with ${view.me.points} points` : ''}. Open the crew`}>
      <View style={styles.row}>
        {slots.map((s) => {
          const winner = s.rank === 1;
          const me = s.memberId === userId;
          return (
            <View key={s.memberId} style={styles.col}>
              <Avatar name={s.name} src={s.avatar} size={winner ? 56 : 46} />
              <View style={[styles.name, me && { backgroundColor: colors.accent }]}>
                <T variant="caption" weight="bold" color={me ? colors.onAccent : colors.ink} numberOfLines={1}>
                  {me ? 'You' : first(s.name)}
                </T>
              </View>
              <View style={[styles.block, { height: s.height }, winner && { backgroundColor: colors.accent }]}>
                <T variant="numeralSm" color={winner ? colors.onAccent : colors.bg}>
                  {s.rank}
                </T>
                <T variant="kicker" color={winner ? colors.onAccent : colors.bg}>
                  {s.points} pts
                </T>
              </View>
            </View>
          );
        })}
      </View>
      {view.me ? (
        <View style={styles.mine}>
          <Avatar name={view.me.name} src={view.me.avatar} size={32} />
          <T variant="bodySm" weight="bold" color={colors.onAccent} style={{ flex: 1 }}>
            You are {ordinal(view.me.rank)}
          </T>
          <T variant="numeralSm" color={colors.onAccent} style={{ fontSize: 17 }}>
            {view.me.points} pts
          </T>
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  name: { alignSelf: 'center', maxWidth: '100%', paddingHorizontal: 6, borderRadius: 3 },
  block: { alignSelf: 'stretch', backgroundColor: colors.ink, borderWidth: line, borderColor: colors.ink, borderTopLeftRadius: radius.chip, borderTopRightRadius: radius.chip, alignItems: 'center', paddingTop: 6, gap: 2 },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent },
});
