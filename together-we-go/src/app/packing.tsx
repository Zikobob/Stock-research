import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PackRow } from '@/components/play/PackingParts';
import { completesList, needsSomeone as findNeeds, splitFairly } from '@/components/play/packingLogic';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, Divider, EmptyState, ProgressBar } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { PlatePress } from '@/components/ui/Plate';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { packingBase } from '@/data/reference';
import { useWeather } from '@/hooks/useTrip';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';

type Filter = 'all' | 'mine' | 'open';

const COUNTRY_EXTRAS: Record<string, string[]> = {
  JP: ['IC transit card (Suica / ICOCA)', 'Type A plug adapter', 'Coin purse — lots of cash & coins', 'Small towel (many restrooms lack dryers)', 'Slip-on shoes for temples & ryokan'],
  FR: ['Type E plug adapter', 'Reusable shopping bag'],
  IT: ['Type L/F plug adapter', 'Scarf to cover shoulders in churches'],
  TH: ['Mosquito repellent', 'Light clothes covering knees for temples'],
  ID: ['Reef-safe sunscreen', 'Mosquito repellent'],
};

/** The shared packing list: how much is packed, who is bringing what, and every item in a section of its own. */
export default function Packing() {
  const trip = useActiveTrip();
  const me = useAppStore((s) => s.session?.userId);
  const toggle = useAppStore((s) => s.togglePacked);
  const assign = useAppStore((s) => s.assignPacking);
  const addItems = useAppStore((s) => s.addPackingItems);
  const del = useAppStore((s) => s.deletePackingItem);
  const markFired = useAppStore((s) => s.markReminderFired);
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
  const memberIds = trip.members.map((m) => m.id);
  const bringer = (broughtBy?: string) => trip.members.find((m) => m.id === broughtBy);
  const needsSomeone = findNeeds(trip.packing, memberIds);
  const shown = trip.packing.filter((p) => (filter === 'mine' ? p.broughtBy === me : filter === 'open' ? !p.packed && !bringer(p.broughtBy) : true));
  const groups = Array.from(new Set(shown.map((p) => p.category)));
  const have = new Set(trip.packing.map((p) => p.text.toLowerCase()));
  const picking = trip.packing.find((p) => p.id === pickId);
  const allPacked = total > 0 && packed === total;
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

  // Packing the very last thing is the moment worth a celebration, once per trip (so un-ticking and ticking again stays quiet).
  const tick = (id: string, wasPacked: boolean) => {
    toggle(trip.id, id);
    const key = `packed:${trip.id}`;
    if (completesList(packed, total, wasPacked) && !(key in useAppStore.getState().firedReminders)) {
      markFired(key);
      celebrate('Everything is packed');
    }
  };

  const split = () => {
    const plan = splitFairly(trip.packing, memberIds);
    if (!plan.length) return;
    plan.forEach((p) => assign(trip.id, p.itemId, p.memberId));
    tap('success');
    toast(`Assigned ${plan.length} item${plan.length === 1 ? '' : 's'}`);
  };

  return (
    <Screen header={<Header title="Packing list" subtitle={`Shared with ${trip.members.length} travellers`} />}>
      {total ? (
        <View>
          <View style={styles.progress} accessible accessibilityLabel={`${packed} of ${total} packed`}>
            <View style={styles.count}>
              <T variant="title" importantForAccessibility="no">
                <T variant="numeral">{packed}</T> of <T variant="numeral">{total}</T> packed
              </T>
              {allPacked ? <Stamp label="All packed" tone="positive" icon="checkmark" rotate={-3} slam /> : null}
            </View>
            <ProgressBar value={packed / total} color={allPacked ? colors.positive : colors.accent} />
          </View>
          <View style={styles.crew}>
            {trip.members.map((m) => (
              <View key={m.id} style={styles.load} accessible accessibilityLabel={`${m.name.split(' ')[0]} is bringing ${trip.packing.filter((p) => p.broughtBy === m.id).length}`}>
                <Avatar name={m.name} src={m.avatar} size={28} />
                <T variant="caption" weight="bold" importantForAccessibility="no">
                  {m.name.split(' ')[0]} · {trip.packing.filter((p) => p.broughtBy === m.id).length}
                </T>
              </View>
            ))}
            {needsSomeone.length ? (
              <View style={styles.load} accessible accessibilityLabel={`${needsSomeone.length} still need someone`}>
                <T variant="caption" weight="bold" color={colors.textSecondary} importantForAccessibility="no">
                  Anyone · {needsSomeone.length}
                </T>
              </View>
            ) : null}
          </View>
          <View style={{ marginTop: 16 }}>
            <Button label="Split the rest fairly" icon="shuffle-outline" size="md" variant="secondary" disabled={!needsSomeone.length} onPress={split} />
          </View>

          <View style={{ marginTop: 24 }}>
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
        </View>
      ) : (
        <EmptyState icon="bag-handle-outline" title="Nothing to pack yet" body="Start with the essentials, then add your own. The whole crew shares this list.">
          <Button label="Start with the essentials" icon="list-outline" onPress={() => addItems(trip.id, packingBase.flatMap((g) => g.items.map((text) => ({ text, category: g.category }))))} />
        </EmptyState>
      )}

      {groups.map((g) => {
        const rows = shown.filter((p) => p.category === g);
        return (
          <View key={g} style={{ marginTop: 28 }}>
            <View style={styles.groupHead}>
              <T variant="kicker" color={colors.ink} accessibilityRole="header">
                {g}
              </T>
              <T variant="kicker" color={colors.textSecondary}>
                {rows.filter((p) => p.packed).length} / {rows.length}
              </T>
            </View>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {rows.map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <Divider /> : null}
                  <PackRow item={p} who={bringer(p.broughtBy)} me={me} onToggle={() => tick(p.id, p.packed)} onWho={() => setPickId(p.id)} onRemove={() => del(trip.id, p.id)} />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      {total && !shown.length ? (
        <T variant="small" color={colors.textSecondary} center style={{ marginTop: 28 }}>
          {filter === 'mine' ? 'Nothing is assigned to you yet. Tap “Anyone” on an item to pick it up.' : 'Every item has someone bringing it.'}
        </T>
      ) : null}

      {total ? (
        <View style={styles.addBlock}>
          {suggestions.length ? (
            <Card style={styles.tip}>
              <View style={styles.tipHead}>
                <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
                  Suggested for {dest?.city}
                </T>
                <Press
                  onPress={() => {
                    addItems(trip.id, suggestions.map((s) => ({ text: s, category: 'Suggested' })));
                    toast(`Added ${suggestions.length} items`);
                  }}
                  style={styles.addAll}
                  accessibilityLabel="Add all suggestions">
                  <T variant="kicker" color={colors.ink}>
                    Add all
                  </T>
                  <Ionicons name="add" size={16} color={colors.ink} />
                </Press>
              </View>
              <View style={styles.wrap}>
                {suggestions.map((s) => (
                  <Chip key={s} icon="add" label={s} onPress={() => addItems(trip.id, [{ text: s, category: 'Suggested' }])} />
                ))}
              </View>
            </Card>
          ) : null}
          <View style={styles.add}>
            <Input
              containerStyle={{ flex: 1 }}
              label="Add an item"
              accessibilityLabel="New packing item"
              placeholder="Add an item…"
              value={text}
              onChangeText={(v) => {
                setText(v);
                setErr(null);
              }}
              error={err}
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <PlatePress onPress={add} accessibilityLabel="Add item" corner={radius.button} color={colors.accent} wrapperStyle={{ marginTop: 21 }} style={styles.addBtn}>
              <Ionicons name="add" size={26} color={colors.onPrimary} />
            </PlatePress>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 12 }}>
            {[...packingBase.map((g) => g.category), 'Weather', 'Suggested'].map((c) => (
              <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
        </View>
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
  progress: { gap: 12 },
  count: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 },
  crew: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8, marginTop: 16 },
  load: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tip: { marginBottom: 24, gap: 12 },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  addAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addBlock: { marginTop: 32 },
  add: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
