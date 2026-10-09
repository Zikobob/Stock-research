import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card, EmptyState, ProgressBar } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById, destinations } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';

export default function BucketList() {
  const bucket = useAppStore((s) => s.bucket);
  const favorites = useAppStore((s) => s.favorites);
  const add = useAppStore((s) => s.addBucket);
  const toggle = useAppStore((s) => s.toggleBucket);
  const del = useAppStore((s) => s.deleteBucket);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const done = bucket.filter((b) => b.done).length;
  const ideas = destinations.filter((d) => !bucket.some((b) => b.destinationId === d.id)).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || b.rating - a.rating).slice(0, 8);

  const submit = () => {
    const t = text.trim();
    if (t.length < 3) return setErr('Write a few words about your dream');
    if (t.length > 80) return setErr('Keep it under 80 characters');
    add(t);
    setText('');
    setErr(null);
    tap('success');
    toast('Added to your bucket list ✨');
  };

  return (
    <Screen header={<Header title="Bucket list" subtitle={`${done} of ${bucket.length} dreams ticked off`} />}>
      <Card style={{ gap: 8 }}>
        <ProgressBar value={bucket.length ? done / bucket.length : 0} height={8} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <TextInput value={text} onChangeText={(v) => { setText(v); setErr(null); }} placeholder="Someday I want to…" placeholderTextColor={colors.textMuted} style={[styles.input, err && { borderColor: colors.red }]} onSubmitEditing={submit} returnKeyType="done" accessibilityLabel="New bucket list item" maxLength={90} />
          <Press onPress={submit} style={styles.addBtn} accessibilityLabel="Add to bucket list">
            <Ionicons name="add" size={22} color={colors.white} />
          </Press>
        </View>
        {err ? (
          <T variant="caption" color={colors.red}>
            {err}
          </T>
        ) : null}
      </Card>

      <T variant="h3" style={{ marginTop: 18, marginBottom: 10 }}>
        Inspiration
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
        {ideas.map((d) => (
          <Press
            key={d.id}
            onPress={() => {
              add(`Visit ${d.city}, ${d.country}`, d.id);
              toast(`${d.city} added ✨`);
            }}
            style={styles.idea}
            accessibilityLabel={`Add ${d.city} to bucket list`}>
            <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.ideaShade} />
            <Ionicons name="add-circle" size={22} color={colors.white} style={{ position: 'absolute', top: 8, right: 8 }} />
            <T variant="small" weight="bold" color={colors.white} style={{ position: 'absolute', left: 10, bottom: 10 }}>
              {d.city}
            </T>
          </Press>
        ))}
      </ScrollView>

      <T variant="h3" style={{ marginTop: 18, marginBottom: 10 }}>
        My list
      </T>
      {bucket.length ? (
        <View style={{ gap: 8 }}>
          {bucket.map((b) => {
            const d = b.destinationId ? destinationById(b.destinationId) : undefined;
            return (
              <View key={b.id} style={[styles.item, b.done && { opacity: 0.7 }]}>
                <Press onPress={() => toggle(b.id)} accessibilityRole="checkbox" accessibilityState={{ checked: b.done }} accessibilityLabel={b.text} hitSlop={6}>
                  <Ionicons name={b.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={b.done ? colors.primary : colors.borderStrong} />
                </Press>
                {d ? <Image source={imageSource(d.image)} style={styles.thumb} contentFit="cover" /> : null}
                <Press style={{ flex: 1 }} onPress={() => (d ? router.push({ pathname: '/destination/[id]', params: { id: d.id } }) : toggle(b.id))}>
                  <T variant="small" weight="semibold" style={b.done && { textDecorationLine: 'line-through' }}>
                    {b.text}
                  </T>
                  {d ? (
                    <T variant="caption" color={colors.textSecondary}>
                      {d.country} · best {d.bestMonths.split(',')[0]}
                    </T>
                  ) : null}
                </Press>
                <Press onPress={() => confirmAction('Remove from bucket list?', b.text, () => del(b.id), { confirmLabel: 'Remove', destructive: true })} hitSlop={8} accessibilityLabel="Remove">
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Press>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState icon="flag-outline" title="Dream big" body="Add places and experiences you want to do with your crew one day." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  idea: { width: 120, height: 150, borderRadius: radius.lg, overflow: 'hidden' },
  ideaShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 44, height: 44, borderRadius: 10 },
});
