import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { AddToTripSheet } from '@/components/explore';
import { MatchRow, OptionTile, TopPick } from '@/components/play/SurveyParts';
import { optionArt, recommend, sameAnswer, type Match } from '@/components/play/recommend';
import { Button } from '@/components/ui/Button';
import { Card, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { surveyQuestions } from '@/data/reference';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors } from '@/theme';

const GAP = 16;

/** The travel survey: one question per screen with big answer tiles, then the five destinations that fit best. */
export default function Survey() {
  const saved = useAppStore((s) => s.surveyResult);
  const save = useAppStore((s) => s.setSurveyResult);
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(saved ? surveyQuestions.length : 0);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [results, setResults] = useState<Match[]>(saved ? saved.map((id, i) => ({ id, match: 98 - i * 4 })) : []);
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
    const [top, ...rest] = results;
    const topDest = top ? destinationById(top.id) : undefined;
    return (
      <Screen header={<Header kicker="Based on your travel style" title="Your matches" />}>
        <T variant="small" color={colors.textSecondary} style={{ marginBottom: 20 }}>
          We matched your answers against 32 destinations. Tap one to explore it, or add it to a trip.
        </T>
        {top && topDest ? <TopPick dest={topDest} match={top.match} onAdd={() => setAdding(topDest.id)} /> : null}
        {rest.length ? (
          <View style={{ marginTop: 32 }}>
            <SectionHeader title="Also good for you" />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {rest.map((r, i) => {
                const d = destinationById(r.id);
                return d ? <MatchRow key={r.id} dest={d} match={r.match} last={i === rest.length - 1} onAdd={() => setAdding(d.id)} /> : null;
              })}
            </Card>
          </View>
        ) : null}
        <Button
          label="Retake survey"
          variant="secondary"
          icon="refresh-outline"
          style={{ marginTop: 32 }}
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
  // two tiles side by side in the phone-wide column (the plate under each tile adds 3 points)
  const tile = Math.floor((Math.min(width, MAX_WIDTH) - 40 - GAP) / 2) - 3;
  return (
    <Screen header={<Header kicker={`Question ${step + 1} of ${surveyQuestions.length}`} title="Find your next trip" />}>
      <ProgressBar value={step / surveyQuestions.length} />
      <T variant="headline" style={{ marginTop: 24, marginBottom: 20 }} accessibilityRole="header">
        {q.q}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP - 3 }}>
        {q.options.map((o) => (
          <OptionTile key={o.label} label={o.label} art={optionArt(q, o.label)} width={tile} chosen={sameAnswer(answers[step], o.tags)} onPress={() => pick(o.tags)} />
        ))}
      </View>
      {step > 0 ? <Button label="Back" variant="ghost" icon="arrow-back" onPress={() => setStep(step - 1)} style={{ marginTop: 24 }} /> : null}
    </Screen>
  );
}
