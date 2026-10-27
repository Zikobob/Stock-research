import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ordinal } from '@/components/home/logic';
import { ShareSheet } from '@/components/ShareSheet';
import { AnswerOption, Clock, Podium, StepBar, type OptionState } from '@/components/play/QuizParts';
import { ROUND, SECONDS, crewBoard, isNewBest, pointsFor, resultRows, roundTitle, shouldCelebrate, shuffle } from '@/components/play/quizLogic';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Divider, SectionHeader } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { tap } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Header, Screen } from '@/components/ui/Screen';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { photos } from '@/data/images';
import { quizQuestions, type QuizQuestion } from '@/data/reference';
import { useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';

type Phase = 'intro' | 'play' | 'done';

export default function Quiz() {
  const best = useAppStore((s) => s.quizBest);
  const setBest = useAppStore((s) => s.setQuizBest);
  const trip = useActiveTrip();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('intro');
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestAtStart, setBestAtStart] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [share, setShare] = useState(false);

  const start = () => {
    setQs(shuffle(quizQuestions).slice(0, ROUND));
    setI(0);
    setScore(0);
    setGained(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setBestAtStart(best);
    setPicked(null);
    setLeft(SECONDS);
    setPhase('play');
  };

  // Running out of time counts as answer -1 (derived, so no extra state to keep in step).
  const answer = picked ?? (phase === 'play' && left <= 0 ? -1 : null);
  const ticking = phase === 'play' && answer === null;

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking, i]);

  const choose = (k: number) => {
    if (answer !== null) return;
    setPicked(k);
    if (k === qs[i].answer) {
      const pts = pointsFor(left, streak);
      setGained(pts);
      setScore((s) => s + pts);
      setCorrect((c) => c + 1);
      setStreak(streak + 1);
      setBestStreak((b) => Math.max(b, streak + 1));
      tap('success');
    } else {
      setGained(0);
      setStreak(0);
      tap('warning');
    }
  };

  const next = () => {
    if (answer === -1) {
      setGained(0);
      setStreak(0);
    }
    if (i + 1 >= qs.length) {
      setPhase('done');
      setBest(score);
      if (shouldCelebrate(correct, qs.length, score, bestAtStart)) celebrate();
      return;
    }
    setI(i + 1);
    setPicked(null);
    setGained(0);
    setLeft(SECONDS);
  };

  const me = useMemo(() => ({ id: user?.id, name: user?.name, avatar: user?.avatar }), [user]);
  // The crew board: friends get a steady friendly score, you get your real one (your best before a round, this round after it).
  const board = useMemo(() => crewBoard(trip?.members ?? [], me, phase === 'done' ? score : best), [trip, me, phase, score, best]);

  if (phase === 'play') {
    const q = qs[i];
    const stateOf = (k: number): OptionState => {
      if (answer === null) return 'open';
      if (k === q.answer) return k === answer ? 'right' : 'reveal';
      return k === answer ? 'wrong' : 'dim';
    };
    const last = i + 1 >= qs.length;
    return (
      <Screen
        header={
          <Header
            kicker="Travel quiz"
            title={`Question ${i + 1}`}
            right={
              <View style={styles.points} accessible accessibilityLabel={`${score} points`}>
                <T variant="numeralSm" importantForAccessibility="no">
                  {score}
                </T>
                <T variant="kicker" color={colors.textSecondary} importantForAccessibility="no">
                  pts
                </T>
              </View>
            }
          />
        }
        footer={
          answer !== null ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <Button label={last ? 'See results' : 'Next question'} iconRight="arrow-forward" onPress={next} />
            </View>
          ) : undefined
        }>
        <StepBar index={i} total={qs.length} answered={answer !== null} />
        <View style={{ marginTop: 12 }}>
          <Clock left={left} />
        </View>
        <T variant="h1" style={{ marginTop: 16, marginBottom: 20 }} accessibilityRole="header">
          {q.q}
        </T>
        <View style={{ gap: 12 }}>
          {q.options.map((o, k) => (
            <AnswerOption key={o} letter={'ABCD'[k]} text={o} state={stateOf(k)} disabled={answer !== null} onPress={() => choose(k)} />
          ))}
        </View>
        {answer !== null ? (
          <View style={styles.fact} accessibilityLiveRegion="polite">
            <Rule />
            <View style={styles.factHead}>
              {answer === q.answer ? <Stamp label="Correct" tone="positive" icon="checkmark" slam /> : answer === -1 ? <Stamp label="Time’s up" tone="warn" icon="alarm-outline" slam /> : <Stamp label="Not quite" tone="danger" icon="close" slam />}
              {gained > 0 ? (
                <T variant="numeralSm" accessibilityLabel={`${gained} points`}>
                  +{gained}
                </T>
              ) : null}
              <View style={{ flex: 1 }} />
              {streak > 1 ? <Stamp label={`${streak} in a row`} tone="accent" rotate={2} /> : null}
            </View>
            <T variant="bodySm" color={colors.textSecondary}>
              {q.fact}
            </T>
          </View>
        ) : null}
      </Screen>
    );
  }

  if (phase === 'done') {
    const rows = resultRows(board, me, score, bestAtStart);
    const record = isNewBest(score, bestAtStart);
    const solo = rows.some((r) => r.id === 'round');
    const myRank = rows.findIndex((r) => r.me) + 1;
    return (
      <Screen header={<Header kicker="Travel quiz" title="Round complete" />}>
        <View style={styles.resultTop}>
          <View style={{ flex: 1 }}>
            <T variant="kicker" color={colors.textSecondary}>
              Your score
            </T>
            <T variant="hero" accessibilityLabel={`${score} points`}>
              {score}
            </T>
          </View>
          {record ? <Stamp label="New best" tone="accent" icon="star" slam rotate={-6} /> : null}
        </View>
        <T variant="headline" style={{ marginTop: 4 }}>
          {roundTitle(correct, qs.length)}
        </T>
        <T variant="small" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {correct} of {qs.length} right · best streak {bestStreak}
          {!record && bestAtStart > 0 ? ` · your best is ${bestAtStart}` : ''}
        </T>

        <View style={styles.block}>
          <SectionHeader title={solo ? 'This round' : 'Crew podium'} />
          <Podium rows={rows} />
          {!solo && myRank > 3 ? (
            <View style={styles.mine} accessible accessibilityLabel={`You are ${ordinal(myRank)} with ${score} points`}>
              <Avatar name={me.name ?? 'You'} src={me.avatar} size={32} />
              <T variant="bodySm" weight="bold" color={colors.onAccent} style={{ flex: 1 }} importantForAccessibility="no">
                You are {ordinal(myRank)}
              </T>
              <T variant="numeralSm" color={colors.onAccent} style={{ fontSize: 17 }} importantForAccessibility="no">
                {score} pts
              </T>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12, marginTop: 32 }}>
          <Button label="Play again" icon="play" onPress={start} />
          <Button label="Challenge the group" icon="share-social-outline" variant="secondary" onPress={() => setShare(true)} />
        </View>
        <ShareSheet visible={share} onClose={() => setShare(false)} title="Share your score" message={`I scored ${score} points on the TogetherWeGo travel quiz. Think you can beat me?`} />
      </Screen>
    );
  }

  return (
    <Screen header={<Header kicker="Trip trivia" title="Travel quiz" subtitle="Test your globe-trotting knowledge" />}>
      <Ticket
        stub={
          <View style={styles.stub}>
            <Field value={`${ROUND}`} label="Questions" />
            <Field value={`${SECONDS}s`} label="Each" />
            <Field value="+2" label="Per streak" />
          </View>
        }>
        <View style={styles.photo}>
          <Image source={photos['fuji-blossom']} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
          <View style={styles.tag}>
            <T variant="kicker" color={colors.ink}>
              Trip trivia
            </T>
          </View>
        </View>
        <View style={styles.main}>
          <T variant="kicker" color={colors.textSecondary}>
            Your best
          </T>
          <View style={styles.bestRow}>
            <T variant="hero" accessibilityLabel={`Your best score is ${best} points`}>
              {best}
            </T>
            <T variant="kicker" color={colors.textSecondary} style={{ paddingBottom: 12 }}>
              points
            </T>
          </View>
          <T variant="small" color={colors.textSecondary}>
            {best > 0 ? 'Faster answers and streaks earn bonus points.' : 'Play a round to set your first best. Faster answers and streaks earn bonus points.'}
          </T>
        </View>
      </Ticket>

      <View style={{ marginTop: 24 }}>
        <Button label="Play" icon="play" onPress={start} />
      </View>

      {board.length > 1 ? (
        <View style={styles.block}>
          <SectionHeader title="Crew best" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {board.map((b, k) => (
              <View key={b.id}>
                {k > 0 ? <Divider /> : null}
                <View style={[styles.boardRow, b.me && { backgroundColor: colors.accent }]}>
                  <T variant="kicker" color={b.me ? colors.onAccent : colors.textSecondary} style={{ width: 26 }}>
                    {String(k + 1).padStart(2, '0')}
                  </T>
                  <Avatar name={b.name} src={b.avatar} size={32} />
                  <T variant="bodySm" weight="semibold" color={b.me ? colors.onAccent : colors.text} style={{ flex: 1 }} numberOfLines={1}>
                    {b.me ? 'You' : b.name.split(' ')[0]}
                  </T>
                  <T variant="numeralSm" color={b.me ? colors.onAccent : colors.text}>
                    {b.score}
                  </T>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

/** One printed field on the stub of the ticket: a number in mono over a small caps label. */
function Field({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T variant="numeralSm">{value}</T>
      <T variant="kicker" color={colors.textSecondary}>
        {label}
      </T>
    </View>
  );
}

const CORNER = Math.max(0, radius.card - line);

const styles = StyleSheet.create({
  photo: { height: 124, borderTopLeftRadius: CORNER, borderTopRightRadius: CORNER, borderBottomWidth: line, borderBottomColor: colors.ink, overflow: 'hidden', backgroundColor: colors.bgAlt },
  tag: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs },
  main: { padding: 16, gap: 2 },
  bestRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  stub: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  block: { marginTop: 32 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  points: { alignItems: 'flex-end', paddingBottom: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: line, borderTopColor: colors.ink, backgroundColor: colors.bg },
  fact: { marginTop: 24, gap: 12 },
  factHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 14, paddingHorizontal: 10, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent },
  resultTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
