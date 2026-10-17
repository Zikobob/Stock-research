import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { colors, fonts, radius } from '@/theme';

/** Start a poll: a question and two to five options. */
export function NewPollSheet({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (q: string, opts: string[]) => void }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet visible={visible} onClose={onClose} title="New poll" subtitle="Let the group decide">
      <Input label="Question" value={q} onChangeText={setQ} placeholder="e.g. Where should we eat on Day 3?" maxLength={80} />
      {opts.map((o, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={o}
            onChangeText={(v) => setOpts((arr) => arr.map((x, j) => (j === i ? v : x)))}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={colors.textMuted}
            style={styles.optInput}
            maxLength={50}
            accessibilityLabel={`Option ${i + 1}`}
          />
          {opts.length > 2 ? (
            <Press onPress={() => setOpts((arr) => arr.filter((_, j) => j !== i))} accessibilityLabel={`Remove option ${i + 1}`}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Press>
          ) : null}
        </View>
      ))}
      {opts.length < 5 ? <Button label="Add option" variant="ghost" size="sm" icon="add" onPress={() => setOpts((a) => [...a, ''])} /> : null}
      {err ? (
        <T variant="caption" color={colors.red}>
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
          setQ('');
          setOpts(['', '']);
          setErr(null);
          toast('Poll started — the group has been notified');
          onClose();
        }}
      />
    </Sheet>
  );
}
const styles = StyleSheet.create({
  optInput: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 12, fontFamily: fonts.regular, color: colors.text },
});
