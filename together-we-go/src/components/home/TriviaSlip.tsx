import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';
import { dailyQuestion } from '@/utils/trivia';

import { answerState, streakLabel } from './logic';

const KEYS = ['A', 'B', 'C', 'D'];

/**
 * Today's trivia question as a quiz slip: four big answer buttons. Once you answer, the right one is marked with a tick, a wrong pick
 * with a cross (colour AND icon), the fact appears, and a streak stamp lands. Only the first answer of the day counts, and a right answer celebrates.
 */
export function TriviaSlip({ today }: { today: string }) {
  const trivia = useAppStore((s) => s.trivia);
  const answerTrivia = useAppStore((s) => s.answerTrivia);
  const q = dailyQuestion(today);
  const answered = trivia.day === today;
  const picked = answered ? trivia.picked : null;
  const [justNow, setJustNow] = useState(false);
  const right = picked !== null && picked === q.answer;
  const streak = streakLabel(trivia.streak);

  const pick = (i: number) => {
    if (answered) return;
    const correct = i === q.answer;
    answerTrivia(today, i, correct);
    setJustNow(true);
    if (correct) celebrate();
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
          Today’s trivia
        </T>
        {streak && answered ? <Stamp label={streak} tone="accent" slam={justNow} /> : null}
      </View>
      <T variant="h3" accessibilityRole="header">
        {q.q}
      </T>
      <View style={{ gap: 8 }}>
        {q.options.map((o, i) => {
          const st = answerState(i, q.answer, picked);
          const good = st === 'right' || st === 'reveal';
          const bad = st === 'wrong';
          return (
            <Press
              key={o}
              onPress={() => pick(i)}
              disabled={answered}
              scaleTo={0.985}
              accessibilityLabel={`${KEYS[i]}. ${o}${st === 'right' ? '. Correct' : st === 'wrong' ? '. Not this one' : st === 'reveal' ? '. The right answer' : ''}`}
              accessibilityState={{ disabled: answered, selected: i === picked }}
              style={[styles.option, good && { borderColor: colors.positive, backgroundColor: st === 'right' ? colors.positiveSoft : colors.card }, bad && { borderColor: colors.red, backgroundColor: colors.redSoft }, st === 'dim' && { opacity: 0.5 }]}>
              <View style={[styles.key, good && { borderColor: colors.positive }, bad && { borderColor: colors.red }]}>
                <T variant="kicker" color={good ? colors.positive : bad ? colors.red : colors.ink} style={{ letterSpacing: 0 }}>
                  {KEYS[i]}
                </T>
              </View>
              <T variant="bodySm" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>
                {o}
              </T>
              {good ? <Ionicons name="checkmark-circle" size={22} color={colors.positive} /> : bad ? <Ionicons name="close-circle" size={22} color={colors.red} /> : null}
            </Press>
          );
        })}
      </View>
      {answered ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <View style={styles.resultHead}>
            <Ionicons name={right ? 'checkmark-circle' : 'close-circle'} size={20} color={right ? colors.positive : colors.red} />
            <T variant="title" weight="bold" color={right ? colors.positive : colors.red}>
              {right ? 'Correct' : 'Not quite'}
            </T>
          </View>
          <T variant="small" color={colors.textSecondary}>
            {q.fact}
          </T>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  key: { width: 30, height: 30, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  result: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
