import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddToTripSheet } from '@/components/explore';
import { Button } from '@/components/ui/Button';
import { Pill, ProgressBar } from '@/components/ui/bits';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById, destinations } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { surveyQuestions } from '@/data/reference';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { money } from '@/utils/format';

/** Scores every destination against the answers: tag matches + budget fit + rating. */
function recommend(answers: string[][]): { id: string; match: number }[] {
  const tags = answers.flat();
  const budgetTag = tags.find((t) => t.startsWith('$'));
  const budget = budgetTag ? Number(budgetTag.slice(1)) : 2;
  const scored = destinations.map((d) => {
    let s = 0;
    for (const t of tags) if (!t.startsWith('$') && d.tags.includes(t as never)) s += 2;
    s -= Math.abs(d.priceLevel - budget) * 1.5;
    s += (d.rating - 4.5) * 4;
    return { id: d.id, s };
  });
  const max = Math.max(...scored.map((x) => x.s));
  const min = Math.min(...scored.map((x) => x.s));
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => ({ id: x.id, match: Math.round(70 + ((x.s - min) / Math.max(1, max - min)) * 29) }));
}

export default function Survey() {
  const saved = useAppStore((s) => s.surveyResult);
  const save = useAppStore((s) => s.setSurveyResult);
  const [step, setStep] = useState(saved ? surveyQuestions.length : 0);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [results, setResults] = useState<{ id: string; match: number }[]>(saved ? saved.map((id, i) => ({ id, match: 98 - i * 4 })) : []);
  const [adding, setAdding] = useState<string | null>(null);

  const pick = (tags: string[]) => {
    const next = [...answers.slice(0, step), tags];
    setAnswers(next);
    tap();
    if (step + 1 >= surveyQuestions.length) {
      const r = recommend(next);
      setResults(r);
      save(r.map((x) => x.id));
    }
    setStep(step + 1);
  };

  if (step >= surveyQuestions.length) {
    return (
      <Screen header={<Header title="Your matches" subtitle="Based on your travel style" />}>
        <T variant="small" color={colors.textSecondary} style={{ marginBottom: 14 }}>
          We matched your answers against 32 destinations — tap one to explore it, or add it to a trip.
        </T>
        <View style={{ gap: 14 }}>
          {results.map((r, i) => {
            const d = destinationById(r.id)!;
            return (
              <Press key={r.id} onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} style={[styles.result, i === 0 && { height: 300 }]} scaleTo={0.985}>
                <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
                <View style={styles.match}>
                  <T variant="micro" weight="bold" color={colors.primary}>
                    {r.match}% match
                  </T>
                </View>
                <View style={styles.resultText}>
                  {i === 0 ? (
                    <T variant="kicker" color="rgba(255,255,255,0.85)">
                      Top pick for you
                    </T>
                  ) : null}
                  <T variant={i === 0 ? 'display' : 'h2'} color={colors.white}>
                    {d.city}
                  </T>
                  <T variant="small" color="rgba(255,255,255,0.9)" numberOfLines={2}>
                    {d.blurb}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <Pill label={`~${money(d.dailyCost)}/day`} tone="yellow" />
                    <Pill label={`★ ${d.rating}`} />
                    <View style={{ flex: 1 }} />
                    <Button label="Add" size="sm" full={false} variant="light" icon="add" onPress={() => setAdding(d.id)} />
                  </View>
                </View>
              </Press>
            );
          })}
        </View>
        <Button
          label="Retake survey"
          variant="secondary"
          icon="refresh-outline"
          style={{ marginTop: 16 }}
          onPress={() => {
            setAnswers([]);
            setStep(0);
          }}
        />
        <AddToTripSheet destinationId={adding} onClose={() => setAdding(null)} />
      </Screen>
    );
  }

  const q = surveyQuestions[step];
  return (
    <Screen header={<Header title="Find your next trip" subtitle={`Question ${step + 1} of ${surveyQuestions.length}`} />}>
      <ProgressBar value={step / surveyQuestions.length} height={6} />
      <T variant="h1" style={{ marginTop: 22, marginBottom: 18 }} accessibilityRole="header">
        {q.q}
      </T>
      <View style={styles.grid}>
        {q.options.map((o) => (
          <Press key={o.label} onPress={() => pick(o.tags)} style={styles.option} accessibilityLabel={o.label}>
            <T style={{ fontSize: 40, lineHeight: 48 }}>{o.emoji}</T>
            <T variant="small" weight="semibold" center>
              {o.label}
            </T>
          </Press>
        ))}
      </View>
      {step > 0 ? <Button label="Back" variant="ghost" icon="arrow-back" onPress={() => setStep(step - 1)} style={{ marginTop: 16 }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: { width: '47.5%', aspectRatio: 1.05, borderRadius: radius.xl, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  result: { height: 220, borderRadius: radius.xl, overflow: 'hidden' },
  match: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  resultText: { position: 'absolute', left: 16, right: 16, bottom: 14 },
});
