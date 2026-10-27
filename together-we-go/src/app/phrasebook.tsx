import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, EmptyState } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { phrasebook } from '@/data/reference';
import { copy } from '@/services/share';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, line, radius, space } from '@/theme';

/** Offline phrasebook with native text-to-speech pronunciation. */
export default function Phrasebook() {
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo');
  const initial = dest && phrasebook[dest.language] ? dest.language : 'Japanese';
  const [lang, setLang] = useState(initial);
  const [q, setQ] = useState('');
  const [speaking, setSpeaking] = useState<string | null>(null);
  const book = phrasebook[lang];
  const list = book.phrases.filter((p) => !q || `${p.en} ${p.local} ${p.roman ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  const say = (text: string) => {
    Speech.stop();
    setSpeaking(text);
    Speech.speak(text, {
      language: book.speechCode,
      rate: 0.85,
      onDone: () => setSpeaking(null),
      onStopped: () => setSpeaking(null),
      onError: () => {
        setSpeaking(null);
        toast(`Install the ${book.lang} voice in your phone settings to hear this`, { tone: 'warn' });
      },
    });
  };

  return (
    <Screen header={<Header kicker="Around town" title="Phrasebook" subtitle={`${book.phrases.length} ${book.lang} phrases. Tap the speaker to hear one.`} backLabel="More" />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        {Object.keys(phrasebook).map((l) => (
          <Chip key={l} label={l} active={l === lang} onPress={() => setLang(l)} />
        ))}
      </ScrollView>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search phrases…" accessibilityLabel="Search phrases" returnKeyType="search" autoCorrect={false} containerStyle={{ marginVertical: space.lg }} />
      {list.length ? (
        <View style={{ gap: space.md }}>
          {list.map((p) => {
            const on = speaking === p.local;
            return (
              <Card key={p.en} style={styles.card}>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="small" color={colors.textSecondary}>
                    {p.en}
                  </T>
                  <T variant="h2" selectable>
                    {p.local}
                  </T>
                  {p.roman ? (
                    <T variant="small" color={colors.accentText} style={{ fontStyle: 'italic' }}>
                      {p.roman}
                    </T>
                  ) : null}
                </View>
                <View style={styles.buttons}>
                  <Press onPress={() => copy(p.local, 'Phrase copied')} style={styles.copy} accessibilityLabel={`Copy ${p.en}`}>
                    <Ionicons name="copy-outline" size={20} color={colors.ink} />
                  </Press>
                  <PlatePress onPress={() => say(p.local)} accessibilityLabel={`Hear ${p.en} in ${book.lang}`} offset={3} corner={radius.button} style={[styles.speak, on && { backgroundColor: colors.accent }]}>
                    <Ionicons name={on ? 'volume-high' : 'volume-high-outline'} size={26} color={on ? colors.onAccent : colors.ink} />
                  </PlatePress>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState icon="language-outline" title="No phrases match" body="Try a different word, or clear the search." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: 20, paddingRight: 28 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  speak: { width: 56, height: 56, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  copy: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
