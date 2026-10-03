import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, ProgressBar } from '@/components/ui/bits';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { photos } from '@/data/images';
import { quizQuestions, type QuizQuestion } from '@/data/reference';
import { useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

const ROUND = 8;
const SECONDS = 20;

function shuffle<T>(a: T[]): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

export default function Quiz() {
  const best = useAppStore((s) => s.quizBest);
  const setBest = useAppStore((s) => s.setQuizBest);
  const trip = useActiveTrip();
  const user = useCurrentUser();
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [share, setShare] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setQs(shuffle(quizQuestions).slice(0, ROUND));
    setI(0);
    setScore(0);
    setStreak(0);
    setPicked(null);
    setLeft(SECONDS);
    setPhase('play');
  };

  // Running out of time counts as answer -1 (derived, so no extra state sync needed).
  const answer = picked ?? (phase === 'play' && left <= 0 ? -1 : null);
  const ticking = phase === 'play' && answer === null;

  useEffect(() => {
    if (!ticking) return;
    timer.current = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ticking, i]);

  const choose = (k: number) => {
    if (answer !== null) return;
    setPicked(k);
    const q = qs[i];
    if (k === q.answer) {
      const bonus = Math.max(0, Math.round(left / 4));
      setScore((s) => s + 10 + bonus + streak * 2);
      setStreak((s) => s + 1);
      tap('success');
    } else {
      setStreak(0);
      tap('warning');
    }
  };

  const next = () => {
    if (answer === -1) setStreak(0);
    if (i + 1 >= qs.length) {
      setPhase('done');
      setBest(score);
      return;
    }
    setI(i + 1);
    setPicked(null);
    setLeft(SECONDS);
  };

  // Friendly leaderboard: group members get stable pseudo-scores, you get your real best.
  const board = useMemo(() => {
    const others = (trip?.members ?? []).filter((m) => m.id !== user?.id).map((m) => ({ name: m.name, avatar: m.avatar, score: 60 + ((m.name.charCodeAt(0) * 7 + m.name.length * 13) % 90) }));
    return [...others, { name: user?.name ?? 'You', avatar: user?.avatar, score: Math.max(best, phase === 'done' ? score : 0), me: true }].sort((a, b) => b.score - a.score);
  }, [trip, user, best, score, phase]);

  if (phase === 'intro' || phase === 'done') {
    const finished = phase === 'done';
    return (
      <Screen header={<Header title="Travel quiz" subtitle="Test your globe-trotting knowledge" />}>
        <View style={styles.hero}>
          <Image source={photos['fuji-blossom']} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.heroShade} />
          <T variant="kicker" color="rgba(255,255,255,0.85)">
            {finished ? 'Round complete' : `${ROUND} questions · ${SECONDS}s each`}
          </T>
          <T variant="display" color={colors.white}>
            {finished ? `${score} pts` : 'Trip Trivia'}
          </T>
          <T variant="small" color="rgba(255,255,255,0.9)">
            {finished ? (score >= 100 ? 'Legendary navigator! 🧭' : score >= 60 ? 'Seasoned traveller ✈️' : 'Every expert was once a tourist 🌱') : 'Faster answers and streaks earn bonus points.'}
          </T>
        </View>
        <Button label={finished ? 'Play again' : 'Start quiz'} icon="play" onPress={start} style={{ marginTop: 16 }} />
        {finished ? <Button label="Challenge the group" icon="share-social-outline" variant="secondary" onPress={() => setShare(true)} style={{ marginTop: 10 }} /> : null}
        <Card style={{ marginTop: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="title">Group leaderboard</T>
            <T variant="caption" color={colors.textSecondary}>
              Your best: {best}
            </T>
          </View>
          {board.map((b, k) => (
            <View key={b.name} style={[styles.boardRow, 'me' in b && styles.me]}>
              <T variant="small" weight="bold" style={{ width: 22 }}>
                {k === 0 ? '🥇' : k === 1 ? '🥈' : k === 2 ? '🥉' : k + 1}
              </T>
              <Avatar name={b.name} src={b.avatar} size={28} />
              <T variant="small" style={{ flex: 1 }}>
                {b.name.split(' ')[0]}
                {'me' in b ? ' (you)' : ''}
              </T>
              <T variant="small" weight="semibold">
                {b.score}
              </T>
            </View>
          ))}
        </Card>
        <ShareSheet visible={share} onClose={() => setShare(false)} title="Share your score" message={`I scored ${score} points on the TogetherWeGo travel quiz 🧭 Think you can beat me?`} />
      </Screen>
    );
  }

  const q = qs[i];
  return (
    <Screen header={<Header title={`Question ${i + 1} of ${qs.length}`} subtitle={`${score} pts${streak > 1 ? ` · 🔥 ${streak} streak` : ''}`} />}>
      <ProgressBar value={(i + (answer !== null ? 1 : 0)) / qs.length} height={6} />
      <View style={styles.timerRow}>
        <Ionicons name="timer-outline" size={16} color={left <= 5 ? colors.red : colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <ProgressBar value={left / SECONDS} color={left <= 5 ? colors.red : colors.orange} height={5} />
        </View>
        <T variant="small" weight="bold" color={left <= 5 ? colors.red : colors.text} style={{ width: 28, textAlign: 'right' }}>
          {Math.max(0, left)}s
        </T>
      </View>
      <T variant="h2" style={{ marginVertical: 16 }} accessibilityRole="header">
        {q.q}
      </T>
      <View style={{ gap: 10 }}>
        {q.options.map((o, k) => {
          const isRight = answer !== null && k === q.answer;
          const isWrong = answer === k && k !== q.answer;
          return (
            <Press
              key={o}
              onPress={() => choose(k)}
              disabled={answer !== null}
              style={[styles.option, isRight && styles.right, isWrong && styles.wrong]}
              accessibilityLabel={o}
              accessibilityState={{ selected: answer === k }}>
              <View style={[styles.letter, isRight && { backgroundColor: colors.primary }, isWrong && { backgroundColor: colors.red }]}>
                <T variant="small" weight="bold" color={isRight || isWrong ? colors.white : colors.primary}>
                  {'ABCD'[k]}
                </T>
              </View>
              <T variant="bodySm" weight="medium" style={{ flex: 1 }}>
                {o}
              </T>
              {isRight ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : isWrong ? <Ionicons name="close-circle" size={20} color={colors.red} /> : null}
            </Press>
          );
        })}
      </View>
      {answer !== null ? (
        <Card style={{ marginTop: 16, gap: 10, backgroundColor: answer === q.answer ? colors.primarySofter : colors.orangeSoft }}>
          <T variant="small" weight="semibold">
            {answer === q.answer ? 'Correct! 🎉' : answer === -1 ? 'Time’s up ⏰' : 'Not quite'}
          </T>
          <T variant="small" color={colors.textSecondary}>
            {q.fact}
          </T>
          <Button label={i + 1 >= qs.length ? 'See results' : 'Next question'} iconRight="arrow-forward" onPress={next} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220, borderRadius: radius.xl, overflow: 'hidden', padding: 20, justifyContent: 'flex-end', gap: 4 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,25,10,0.45)' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.sm },
  me: { backgroundColor: colors.primarySofter },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  right: { borderColor: colors.primary, backgroundColor: colors.primarySofter },
  wrong: { borderColor: colors.red, backgroundColor: colors.redSoft },
  letter: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
