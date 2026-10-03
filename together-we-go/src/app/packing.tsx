import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Card, Chip, ProgressBar } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { packingBase } from '@/data/reference';
import { useWeather } from '@/hooks/useTrip';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';

const COUNTRY_EXTRAS: Record<string, string[]> = {
  JP: ['IC transit card (Suica / ICOCA)', 'Type A plug adapter', 'Coin purse — lots of cash & coins', 'Small towel (many restrooms lack dryers)', 'Slip-on shoes for temples & ryokan'],
  FR: ['Type E plug adapter', 'Reusable shopping bag'],
  IT: ['Type L/F plug adapter', 'Scarf to cover shoulders in churches'],
  TH: ['Mosquito repellent', 'Light clothes covering knees for temples'],
  ID: ['Reef-safe sunscreen', 'Mosquito repellent'],
};

export default function Packing() {
  const trip = useActiveTrip();
  const toggle = useAppStore((s) => s.togglePacked);
  const addItems = useAppStore((s) => s.addPackingItems);
  const del = useAppStore((s) => s.deletePackingItem);
  const weather = useWeather(trip?.destinationId);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('Extras');
  const [err, setErr] = useState<string | null>(null);
  if (!trip) return <NoTrip />;

  const dest = destinationById(trip.destinationId);
  const packed = trip.packing.filter((p) => p.packed).length;
  const groups = Array.from(new Set(trip.packing.map((p) => p.category)));
  const have = new Set(trip.packing.map((p) => p.text.toLowerCase()));
  const suggestions = [
    ...(COUNTRY_EXTRAS[dest?.countryCode ?? ''] ?? []),
    ...(weather?.daily.some((d) => d.rain >= 50) ? ['Compact umbrella'] : []),
    ...(weather && Math.max(...weather.daily.map((d) => d.max)) >= 27 ? ['Sunglasses & hat'] : []),
    ...(weather && Math.min(...weather.daily.map((d) => d.min)) <= 10 ? ['Warm jacket'] : []),
  ].filter((s) => !have.has(s.toLowerCase()));

  const add = () => {
    const t = text.trim();
    if (!t) return setErr('Type an item to add');
    if (t.length > 50) return setErr('Keep items under 50 characters');
    if (have.has(t.toLowerCase())) return setErr('That’s already on the list');
    addItems(trip.id, [{ text: t, category: cat }]);
    setText('');
    setErr(null);
    tap('success');
  };

  return (
    <Screen header={<Header title="Packing list" subtitle={`Shared with ${trip.members.length} travellers`} />}>
      <Card style={{ gap: 8 }}>
        <View style={styles.between}>
          <T variant="title">
            {packed}/{trip.packing.length} packed
          </T>
          <T variant="small" weight="semibold" color={colors.primary}>
            {trip.packing.length ? Math.round((packed / trip.packing.length) * 100) : 0}%
          </T>
        </View>
        <ProgressBar value={trip.packing.length ? packed / trip.packing.length : 0} height={8} />
      </Card>

      {suggestions.length ? (
        <Card style={{ marginTop: 12, gap: 8, backgroundColor: colors.primarySofter, borderColor: colors.primaryLine }}>
          <View style={styles.between}>
            <T variant="small" weight="semibold">
              ✨ Smart suggestions for {dest?.city}
            </T>
            <Press
              onPress={() => {
                addItems(trip.id, suggestions.map((s) => ({ text: s, category: 'Suggested' })));
                toast(`Added ${suggestions.length} items`);
              }}
              hitSlop={8}>
              <T variant="caption" weight="semibold" color={colors.primary}>
                Add all
              </T>
            </Press>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s) => (
              <Chip key={s} small icon="add" label={s} onPress={() => addItems(trip.id, [{ text: s, category: 'Suggested' }])} />
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={text} onChangeText={(v) => { setText(v); setErr(null); }} placeholder="Add an item…" placeholderTextColor={colors.textMuted} style={[styles.input, err && { borderColor: colors.red }]} onSubmitEditing={add} returnKeyType="done" accessibilityLabel="New packing item" />
          <Press onPress={add} style={styles.addBtn} accessibilityLabel="Add item">
            <Ionicons name="add" size={22} color={colors.white} />
          </Press>
        </View>
        {err ? (
          <T variant="caption" color={colors.red}>
            {err}
          </T>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[...packingBase.map((g) => g.category), 'Weather', 'Suggested'].map((c) => (
            <Chip key={c} small label={c} active={cat === c} onPress={() => setCat(c)} />
          ))}
        </ScrollView>
      </Card>

      {groups.map((g) => (
        <View key={g} style={{ marginTop: 16 }}>
          <T variant="kicker" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            {g}
          </T>
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {trip.packing
              .filter((p) => p.category === g)
              .map((p, i, arr) => (
                <View key={p.id} style={[styles.item, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Press onPress={() => toggle(trip.id, p.id)} style={styles.itemMain} accessibilityRole="checkbox" accessibilityState={{ checked: p.packed }} accessibilityLabel={p.text}>
                    <Ionicons name={p.packed ? 'checkbox' : 'square-outline'} size={22} color={p.packed ? colors.primary : colors.borderStrong} />
                    <T variant="small" color={p.packed ? colors.textMuted : colors.text} style={[{ flex: 1 }, p.packed && { textDecorationLine: 'line-through' }]}>
                      {p.text}
                    </T>
                  </Press>
                  <Press onPress={() => del(trip.id, p.id)} hitSlop={8} accessibilityLabel={`Remove ${p.text}`}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Press>
                </View>
              ))}
          </Card>
        </View>
      ))}
      {!trip.packing.length ? (
        <Button
          label="Start with the essentials"
          icon="sparkles-outline"
          variant="soft"
          style={{ marginTop: 16 }}
          onPress={() => addItems(trip.id, packingBase.flatMap((g) => g.items.map((text) => ({ text, category: g.category }))))}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
});
