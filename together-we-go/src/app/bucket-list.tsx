import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BucketTicket } from '@/components/play/BucketTicket';
import { Button } from '@/components/ui/Button';
import { EmptyState, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { Fab } from '@/components/ui/Fab';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById, destinations } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useDraft } from '@/hooks/useDraft';
import { useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';

export default function BucketList() {
  const bucket = useAppStore((s) => s.bucket);
  const favorites = useAppStore((s) => s.favorites);
  const add = useAppStore((s) => s.addBucket);
  const toggle = useAppStore((s) => s.toggleBucket);
  const del = useAppStore((s) => s.deleteBucket);
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [text, setText, clearText] = useDraft('bucket-add', '');
  const [err, setErr] = useState<string | null>(null);
  const [slam, setSlam] = useState<string | null>(null);
  const done = bucket.filter((b) => b.done).length;
  const ideas = destinations
    .filter((d) => !bucket.some((b) => b.destinationId === d.id))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || b.rating - a.rating)
    .slice(0, 8);

  const submit = () => {
    const t = text.trim();
    if (t.length < 3) return setErr('Write a few words about your dream');
    if (t.length > 80) return setErr('Keep it under 80 characters');
    add(t);
    clearText();
    setErr(null);
    setAdding(false);
    tap('success');
    toast('Added to your bucket list');
  };

  const tick = (id: string, wasDone: boolean) => {
    toggle(id);
    if (wasDone) return;
    setSlam(id);
    tap('success');
    // the last dream ticked off is a real achievement (only with a few on the list)
    if (bucket.length >= 3 && done + 1 === bucket.length) celebrate('Bucket list complete');
  };

  return (
    <Screen
      header={<Header title="Bucket list" subtitle="Places and moments for one day" />}
      fab={bucket.length ? <Fab icon="add" label="Add" accessibilityLabel="Add to bucket list" onPress={() => setAdding(true)} /> : undefined}
      fabBottom={insets.bottom + 16}>
      {bucket.length ? (
        <View style={styles.progress} accessible accessibilityLabel={`${done} of ${bucket.length} ticked off`}>
          <View style={styles.count}>
            <T variant="title" importantForAccessibility="no">
              <T variant="numeralSm">{done}</T> of <T variant="numeralSm">{bucket.length}</T> ticked off
            </T>
            {done === bucket.length ? <Stamp label="All done" tone="positive" icon="checkmark" rotate={0} /> : null}
          </View>
          <ProgressBar value={done / bucket.length} color={done === bucket.length ? colors.positive : colors.accent} />
        </View>
      ) : (
        <EmptyState icon="flag-outline" title="No bucket list yet" body="Add the places and moments you want to share with your crew one day.">
          <Button label="Add a place" icon="add" onPress={() => setAdding(true)} />
        </EmptyState>
      )}

      {bucket.length ? (
        <View style={styles.list}>
          {bucket.map((b, i) => {
            const d = b.destinationId ? destinationById(b.destinationId) : undefined;
            return (
              <BucketTicket
                key={b.id}
                item={b}
                dest={d}
                index={i}
                slam={slam === b.id}
                onToggle={() => tick(b.id, b.done)}
                onOpen={() => (d ? router.push({ pathname: '/destination/[id]', params: { id: d.id } }) : tick(b.id, b.done))}
                onRemove={() => confirmAction('Remove from bucket list?', b.text, () => del(b.id), { confirmLabel: 'Remove', destructive: true })}
              />
            );
          })}
        </View>
      ) : null}

      {ideas.length ? (
        <View style={{ marginTop: 32 }}>
          <SectionHeader title={bucket.length ? 'More ideas' : 'Ideas to start'} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ideas} style={{ marginHorizontal: -20 }}>
            {ideas.map((d) => (
              <Press
                key={d.id}
                onPress={() => {
                  add(`Visit ${d.city}, ${d.country}`, d.id);
                  tap('success');
                  toast(`${d.city} added`);
                }}
                scaleTo={0.97}
                style={styles.idea}
                accessibilityLabel={`Add ${d.city} to bucket list`}>
                <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
                <View style={styles.plus}>
                  <Ionicons name="add" size={22} color={colors.onAccent} />
                </View>
                <View style={styles.ideaTag}>
                  <T variant="kicker" color={colors.ink} numberOfLines={1}>
                    {d.city}
                  </T>
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Sheet
        visible={adding}
        onClose={() => {
          setAdding(false);
          setErr(null);
        }}
        title="Add to your list"
        subtitle="A place, a meal, a moment: anything you want to do together"
        footer={<Button label="Add to list" icon="add" onPress={submit} />}>
        <Input
          label="Your dream"
          accessibilityLabel="New bucket list item"
          placeholder="Someday I want to…"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setErr(null);
          }}
          error={err}
          onSubmitEditing={submit}
          returnKeyType="done"
          maxLength={90}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 10, marginBottom: 24 },
  count: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 },
  list: { gap: 18 },
  ideas: { gap: 14, paddingHorizontal: 20, paddingBottom: 6 },
  idea: { width: 132, height: 168, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden', backgroundColor: colors.bgAlt },
  plus: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ideaTag: { position: 'absolute', left: 8, bottom: 8, maxWidth: 114, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs },
});
