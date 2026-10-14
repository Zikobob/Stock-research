import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, ProgressBar } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { packingBase } from '@/data/reference';
import { useWeather } from '@/hooks/useTrip';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';

type Filter = 'all' | 'mine' | 'open';

const COUNTRY_EXTRAS: Record<string, string[]> = {
  JP: ['IC transit card (Suica / ICOCA)', 'Type A plug adapter', 'Coin purse — lots of cash & coins', 'Small towel (many restrooms lack dryers)', 'Slip-on shoes for temples & ryokan'],
  FR: ['Type E plug adapter', 'Reusable shopping bag'],
  IT: ['Type L/F plug adapter', 'Scarf to cover shoulders in churches'],
  TH: ['Mosquito repellent', 'Light clothes covering knees for temples'],
  ID: ['Reef-safe sunscreen', 'Mosquito repellent'],
};

export default function Packing() {
  const trip = useActiveTrip();
  const me = useAppStore((s) => s.session?.userId);
  const toggle = useAppStore((s) => s.togglePacked);
  const assign = useAppStore((s) => s.assignPacking);
  const addItems = useAppStore((s) => s.addPackingItems);
  const del = useAppStore((s) => s.deletePackingItem);
  const weather = useWeather(trip?.destinationId);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('Extras');
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [pickId, setPickId] = useState<string | null>(null);
  if (!trip) return <NoTrip />;

  const dest = destinationById(trip.destinationId);
  const total = trip.packing.length;
  const packed = trip.packing.filter((p) => p.packed).length;
  const bringer = (broughtBy?: string) => trip.members.find((m) => m.id === broughtBy);
  const needsSomeone = trip.packing.filter((p) => !p.packed && !bringer(p.broughtBy));
  const shown = trip.packing.filter((p) => (filter === 'mine' ? p.broughtBy === me : filter === 'open' ? !p.packed && !bringer(p.broughtBy) : true));
  const groups = Array.from(new Set(shown.map((p) => p.category)));
  const have = new Set(trip.packing.map((p) => p.text.toLowerCase()));
  const picking = trip.packing.find((p) => p.id === pickId);
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

  const splitFairly = () => {
    if (!needsSomeone.length || !trip.members.length) return;
    const load: Record<string, number> = {};
    trip.members.forEach((m) => (load[m.id] = trip.packing.filter((p) => p.broughtBy === m.id).length));
    needsSomeone.forEach((p) => {
      const next = trip.members.reduce((a, b) => (load[b.id] < load[a.id] ? b : a));
      assign(trip.id, p.id, next.id);
      load[next.id] += 1;
    });
    tap('success');
    toast(`Assigned ${needsSomeone.length} item${needsSomeone.length === 1 ? '' : 's'}`);
  };

  return (
    <Screen header={<Header title="Packing list" subtitle={`Shared with ${trip.members.length} travellers`} />}>
      <Card style={[styles.card, styles.stack]}>
        <View style={styles.between}>
          <T variant="headline">Shared checklist</T>
          <View style={styles.pct}>
            <T variant="small" weight="bold" color={colors.onAccent}>
              {total ? Math.round((packed / total) * 100) : 0}%
            </T>
          </View>
        </View>
        <T variant="bodySm" weight="semibold">
          {packed} of {total} packed · {needsSomeone.length} still need someone
        </T>
        <ProgressBar value={total ? packed / total : 0} height={10} />
        {total ? (
          <View style={styles.wrap}>
            {trip.members.map((m) => (
              <View key={m.id} style={styles.load}>
                <Avatar name={m.name} src={m.avatar} size={22} />
                <T variant="caption" weight="semibold">
                  {m.name.split(' ')[0]} · {trip.packing.filter((p) => p.broughtBy === m.id).length}
                </T>
              </View>
            ))}
          </View>
        ) : null}
        <Button label="Split the rest fairly" icon="shuffle-outline" size="md" disabled={!needsSomeone.length} onPress={splitFairly} />
      </Card>

      <View style={{ marginTop: 14 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'All' },
            { key: 'mine', label: 'Mine' },
            { key: 'open', label: 'Unassigned' },
          ]}
        />
      </View>

      {suggestions.length ? (
        <Card style={[styles.card, styles.stack, { marginTop: 14, backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <View style={styles.between}>
            <T variant="small" weight="bold" color={colors.onAccent}>
              Smart suggestions for {dest?.city}
            </T>
            <Press
              onPress={() => {
                addItems(trip.id, suggestions.map((s) => ({ text: s, category: 'Suggested' })));
                toast(`Added ${suggestions.length} items`);
              }}
              hitSlop={8}
              style={styles.addAll}>
              <T variant="caption" weight="bold" color={colors.onPrimary}>
                Add all
              </T>
            </Press>
          </View>
          <View style={styles.wrap}>
            {suggestions.map((s) => (
              <Chip key={s} small icon="add" label={s} onPress={() => addItems(trip.id, [{ text: s, category: 'Suggested' }])} />
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={[styles.card, { marginTop: 14, gap: 8 }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={text} onChangeText={(v) => { setText(v); setErr(null); }} placeholder="Add an item…" placeholderTextColor={colors.textMuted} style={[styles.input, err && { borderColor: colors.red }]} onSubmitEditing={add} returnKeyType="done" accessibilityLabel="New packing item" />
          <Press onPress={add} style={styles.addBtn} accessibilityLabel="Add item">
            <Ionicons name="add" size={22} color={colors.onPrimary} />
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
        <View key={g} style={{ marginTop: 20 }}>
          <T variant="headline" style={{ marginBottom: 10 }} accessibilityRole="header">
            {g}
          </T>
          <Card padded={false} style={[styles.card, { paddingHorizontal: 14 }]}>
            {shown
              .filter((p) => p.category === g)
              .map((p, i, arr) => {
                const who = bringer(p.broughtBy);
                return (
                  <View key={p.id} style={[styles.item, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                    <Press onPress={() => toggle(trip.id, p.id)} style={styles.itemMain} accessibilityRole="checkbox" accessibilityState={{ checked: p.packed }} accessibilityLabel={p.text}>
                      <Ionicons name={p.packed ? 'checkbox' : 'square-outline'} size={22} color={p.packed ? colors.primary : colors.borderStrong} />
                      <T variant="small" color={p.packed ? colors.textMuted : colors.text} style={[{ flex: 1 }, p.packed && { textDecorationLine: 'line-through' }]}>
                        {p.text}
                      </T>
                    </Press>
                    <Press onPress={() => setPickId(p.id)} hitSlop={6} style={[styles.who, !who && styles.whoEmpty]} accessibilityLabel={who ? `${p.text} is brought by ${who.name}. Change` : `Assign ${p.text}`}>
                      {who ? (
                        <>
                          <Avatar name={who.name} src={who.avatar} size={22} />
                          <T variant="caption" weight="semibold" numberOfLines={1} style={{ maxWidth: 56 }}>
                            {who.id === me ? 'Me' : who.name.split(' ')[0]}
                          </T>
                        </>
                      ) : (
                        <T variant="caption" weight="semibold" color={colors.textSecondary}>
                          Anyone
                        </T>
                      )}
                    </Press>
                    <Press onPress={() => del(trip.id, p.id)} hitSlop={8} accessibilityLabel={`Remove ${p.text}`}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Press>
                  </View>
                );
              })}
          </Card>
        </View>
      ))}
      {total && !shown.length ? (
        <Card style={[styles.card, { marginTop: 20, alignItems: 'center' }]}>
          <T variant="small" color={colors.textSecondary} center>
            {filter === 'mine' ? 'Nothing is assigned to you yet. Tap “Anyone” on an item to pick it up.' : 'Every item has someone bringing it. Nice teamwork!'}
          </T>
        </Card>
      ) : null}
      {!total ? (
        <Button
          label="Start with the essentials"
          icon="sparkles-outline"
          variant="secondary"
          style={{ marginTop: 16 }}
          onPress={() => addItems(trip.id, packingBase.flatMap((g) => g.items.map((text) => ({ text, category: g.category }))))}
        />
      ) : null}

      <MemberPickerSheet
        visible={!!picking}
        onClose={() => setPickId(null)}
        members={trip.members}
        selected={picking?.broughtBy ? [picking.broughtBy] : []}
        onToggle={(id) => picking && assign(trip.id, picking.id, picking.broughtBy === id ? undefined : id)}
        title={picking ? `Who’s bringing ${picking.text}?` : 'Who’s bringing it?'}
        single
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl },
  stack: { gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pct: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  load: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 3, height: 28, borderRadius: radius.pill, backgroundColor: colors.bgAlt },
  addAll: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, height: 26, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 18, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingLeft: 4, paddingRight: 10, borderRadius: radius.pill, backgroundColor: colors.bgAlt },
  whoEmpty: { paddingLeft: 10, backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
