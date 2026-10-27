import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { PlatePress } from '@/components/ui/Plate';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { useDraft } from '@/hooks/useDraft';
import { colors, line, radius } from '@/theme';

/** Start a poll: a question and two to five answers. A half-written poll is kept if the sheet is closed by accident. */
export function NewPollSheet({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (q: string, opts: string[]) => void }) {
  const [q, setQ, clearQ] = useDraft('poll-question', '');
  const [opts, setOpts, clearOpts] = useDraft('poll-options', ['', '']);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet visible={visible} onClose={onClose} title="New poll" subtitle="Let the group decide">
      <Input label="Question" value={q} onChangeText={setQ} placeholder="e.g. Where should we eat on Day 3?" maxLength={80} />
      <View style={{ gap: 10 }}>
        <T variant="kicker" color={colors.ink}>
          Answers
        </T>
        {opts.map((o, i) => (
          <View key={i} style={styles.option}>
            <Input
              containerStyle={{ flex: 1 }}
              value={o}
              onChangeText={(v) => setOpts((arr) => arr.map((x, j) => (j === i ? v : x)))}
              placeholder={`Answer ${i + 1}`}
              maxLength={50}
              accessibilityLabel={`Option ${i + 1}`}
            />
            {opts.length > 2 ? (
              <PlatePress onPress={() => setOpts((arr) => arr.filter((_, j) => j !== i))} accessibilityLabel={`Remove option ${i + 1}`} offset={3} corner={radius.button} style={styles.remove}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </PlatePress>
            ) : null}
          </View>
        ))}
        {opts.length < 5 ? <Button label="Add an answer" variant="secondary" size="md" icon="add" onPress={() => setOpts((a) => [...a, ''])} /> : null}
      </View>
      {err ? (
        <T variant="caption" color={colors.red} accessibilityLiveRegion="polite">
          {err}
        </T>
      ) : null}
      <Button
        label="Start poll"
        icon="stats-chart-outline"
        onPress={() => {
          const clean = opts.map((o) => o.trim()).filter(Boolean);
          if (!q.trim()) return setErr('Write a question for the poll');
          if (clean.length < 2) return setErr('Add at least two options');
          if (new Set(clean.map((c) => c.toLowerCase())).size !== clean.length) return setErr('Options must be different');
          onCreate(q, clean);
          clearQ();
          clearOpts();
          setErr(null);
          toast('Poll started. The group has been notified');
          onClose();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  remove: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
