import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card, Chip, EmptyState } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { phrasebook } from '@/data/reference';
import { copy } from '@/services/share';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';

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
    <Screen header={<Header title="Phrasebook" subtitle={`${book.phrases.length} ${book.lang} phrases · tap 🔊 to hear them`} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
        {Object.keys(phrasebook).map((l) => (
          <Chip key={l} label={l} active={l === lang} onPress={() => setLang(l)} />
        ))}
      </ScrollView>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search phrases…" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Search phrases" />
      </View>
      {list.length ? (
        <View style={{ gap: 10 }}>
          {list.map((p) => (
            <Card key={p.en} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption" color={colors.textSecondary}>
                  {p.en}
                </T>
                <T variant="h3" selectable>
                  {p.local}
                </T>
                {p.roman ? (
                  <T variant="small" color={colors.primary} style={{ fontStyle: 'italic' }}>
                    {p.roman}
                  </T>
                ) : null}
              </View>
              <Press onPress={() => copy(p.local, 'Phrase copied')} style={styles.iconBtn} accessibilityLabel={`Copy ${p.en}`}>
                <Ionicons name="copy-outline" size={17} color={colors.primary} />
              </Press>
              <Press onPress={() => say(p.local)} style={[styles.iconBtn, speaking === p.local && { backgroundColor: colors.primary }]} accessibilityLabel={`Hear ${p.en} in ${book.lang}`}>
                <Ionicons name="volume-high-outline" size={18} color={speaking === p.local ? colors.white : colors.primary} />
              </Press>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState icon="language-outline" title="No phrases match" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, marginVertical: 14, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: '100%', ...({ outlineStyle: 'none' } as object) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
