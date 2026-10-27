import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar, ProgressBar } from '@/components/ui/bits';
import { PlatePress } from '@/components/ui/Plate';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

import { podiumSlots, SECONDS, type BoardRow } from './quizLogic';

/** What a row is called on the podium: "You" for you, "This round" / "Your best" when you play alone, a first name for a friend. */
const who = (r: BoardRow) => (r.id === 'round' || r.id === 'best' ? r.name : r.me ? 'You' : r.name.split(' ')[0]);

/** One short segment per question: ink for the ones answered, the accent for the one you are on, an empty box for the rest. */
export function StepBar({ index, total, answered }: { index: number; total: number; answered: boolean }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Question ${index + 1} of ${total}`} accessibilityValue={{ min: 0, max: total, now: index + (answered ? 1 : 0) }} style={styles.steps}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < index || (i === index && answered);
        return <View key={i} style={[styles.step, done && { backgroundColor: colors.ink }, i === index && !answered && { backgroundColor: colors.accent }]} />;
      })}
    </View>
  );
}

/** The clock: the seconds left in mono and a bar that drains. The last five seconds turn red, with the alarm icon, so colour is not the only signal. */
export function Clock({ left }: { left: number }) {
  const low = left <= 5;
  const color = low ? colors.red : colors.accent;
  return (
    <View style={styles.clock} accessible accessibilityLabel={`${Math.max(0, left)} seconds left`}>
      <Ionicons name={low ? 'alarm-outline' : 'timer-outline'} size={22} color={low ? colors.red : colors.ink} />
      <View style={{ flex: 1 }}>
        <ProgressBar value={Math.max(0, left) / SECONDS} color={color} height={14} />
      </View>
      <T variant="numeralSm" color={low ? colors.red : colors.ink} style={{ width: 62, textAlign: 'right' }} importantForAccessibility="no">
        {Math.max(0, left)}s
      </T>
    </View>
  );
}

export type OptionState = 'open' | 'right' | 'reveal' | 'wrong' | 'dim';

/** A big answer button (60 points tall). Once the round is answered the right one gets a tick and the wrong pick a cross, in colour AND icon. */
export function AnswerOption({ letter, text, state, onPress, disabled }: { letter: string; text: string; state: OptionState; onPress: () => void; disabled: boolean }) {
  const good = state === 'right' || state === 'reveal';
  const bad = state === 'wrong';
  const tone = good ? colors.positive : bad ? colors.red : colors.ink;
  const label = `${letter}. ${text}${state === 'right' ? '. Correct' : state === 'wrong' ? '. Not this one' : state === 'reveal' ? '. The right answer' : ''}`;
  return (
    <PlatePress
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: state === 'right' || state === 'wrong' }}
      offset={3}
      color={good ? colors.positive : bad ? colors.red : colors.plate}
      wrapperStyle={state === 'dim' ? { opacity: 0.5 } : undefined}
      style={[styles.option, { borderColor: tone, backgroundColor: good ? colors.positiveSoft : bad ? colors.redSoft : colors.card }]}>
      <View style={[styles.letter, { borderColor: tone, backgroundColor: good ? colors.positive : bad ? colors.red : 'transparent' }]}>
        <T variant="kicker" color={good || bad ? colors.white : colors.ink} style={{ letterSpacing: 0 }} importantForAccessibility="no">
          {letter}
        </T>
      </View>
      <T variant="bodySm" weight="semibold" style={{ flex: 1 }} importantForAccessibility="no">
        {text}
      </T>
      {good ? <Ionicons name="checkmark-circle" size={24} color={colors.positive} /> : bad ? <Ionicons name="close-circle" size={24} color={colors.red} /> : null}
    </PlatePress>
  );
}

/**
 * The podium: three ink blocks of different heights (second, first, third), each with a face, a name and the score in mono.
 * The winner's block is the accent and you are marked with an accent name tag.
 */
export function Podium({ rows }: { rows: BoardRow[] }) {
  const slots = podiumSlots(rows);
  return (
    <View style={styles.podium} accessible accessibilityLabel={`Podium. ${rows.slice(0, 3).map((r, i) => `${i + 1}. ${who(r)}, ${r.score} points`).join('. ')}`}>
      {slots.map((s) => {
        const winner = s.rank === 1;
        return (
          <View key={s.id} style={styles.col}>
            <Avatar name={s.name} src={s.avatar} size={winner ? 56 : 46} />
            <View style={[styles.name, s.me && { backgroundColor: colors.accent }]}>
              <T variant="caption" weight="bold" color={s.me ? colors.onAccent : colors.ink} numberOfLines={1}>
                {who(s)}
              </T>
            </View>
            <View style={[styles.block, { height: s.height }, winner && { backgroundColor: colors.accent }]}>
              <T variant="numeralSm" color={winner ? colors.onAccent : colors.bg}>
                {s.score}
              </T>
              <T variant="kicker" color={winner ? colors.onAccent : colors.bg}>
                {s.rank === 1 ? '1st' : s.rank === 2 ? '2nd' : '3rd'}
              </T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 10, borderRadius: 3, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.card },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.button, borderWidth: line },
  letter: { width: 34, height: 34, borderRadius: radius.xs, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  name: { alignSelf: 'center', maxWidth: '100%', paddingHorizontal: 6, borderRadius: 3 },
  block: { alignSelf: 'stretch', backgroundColor: colors.ink, borderWidth: line, borderColor: colors.ink, borderTopLeftRadius: radius.chip, borderTopRightRadius: radius.chip, alignItems: 'center', paddingTop: 6, gap: 2 },
});
