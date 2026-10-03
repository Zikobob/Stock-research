import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById, destinations } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { money } from '@/utils/format';
import { addDays, dayLabel, daysBetween, todayInTz } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount, validateTripDates } from '@/utils/validation';

/** Create a trip (or edit one with ?edit=<tripId>). */
export default function NewTrip() {
  const params = useLocalSearchParams<{ edit?: string; destination?: string }>();
  const editing = useAppStore((s) => (params.edit ? s.trips.find((t) => t.id === params.edit) : undefined));
  const createTrip = useAppStore((s) => s.createTrip);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const today = todayInTz('UTC');

  const initialDest = editing?.destinationId ?? params.destination ?? 'tokyo';
  const [destId, setDestId] = useState(initialDest);
  const [name, setName] = useState(editing?.name ?? '');
  const [start, setStart] = useState(editing?.startDate ?? addDays(today, 30));
  const [end, setEnd] = useState(editing?.endDate ?? addDays(today, 36));
  const [budget, setBudget] = useState(editing ? String(editing.budget) : '');
  const [q, setQ] = useState('');
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});

  const dest = destinationById(destId)!;
  const days = Math.max(1, daysBetween(start, end) + 1);
  const suggested = Math.round(dest.dailyCost * days * 4 + 900 * 4);
  const filtered = useMemo(() => destinations.filter((d) => !q || `${d.city} ${d.country}`.toLowerCase().includes(q.toLowerCase())), [q]);

  const save = () => {
    const dateErr = validateTripDates(start, end);
    const e = {
      name: firstError(name, required('a trip name'), maxLen(40, 'Trip name')),
      budget: validateAmount(budget, { min: 50, max: 1_000_000, label: 'a group budget' }),
      start: dateErr.start ?? (!editing && daysBetween(today, start) < -1 ? 'Start date can’t be in the past' : null),
      end: dateErr.end,
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return tap('warning');
    const b = parseAmount(budget)!;
    if (editing) {
      updateTrip(editing.id, { name: name.trim(), startDate: start, endDate: end, budget: b, destinationId: destId, cover: destId !== editing.destinationId ? dest.image : editing.cover });
      toast('Trip updated');
      router.back();
    } else {
      createTrip({ name, destinationId: destId, startDate: start, endDate: end, budget: b });
      tap('success');
      toast('Trip created 🎉 — share the invite code with your group');
      router.dismissAll?.();
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <Screen header={<Header title={editing ? 'Edit trip' : 'New trip'} subtitle={editing ? editing.name : 'Where is the group headed?'} />}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <T variant="small" weight="semibold">
            Destination
          </T>
          <Input placeholder="Search destinations…" icon="search" value={q} onChangeText={setQ} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {filtered.map((d) => {
              const on = d.id === destId;
              return (
                <Press key={d.id} onPress={() => setDestId(d.id)} style={[styles.dest, on && styles.destOn]} accessibilityState={{ selected: on }} accessibilityLabel={`${d.city}, ${d.country}`}>
                  <Image source={imageSource(d.image)} style={styles.destImg} contentFit="cover" />
                  {on ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  ) : null}
                  <T variant="caption" weight="semibold" numberOfLines={1} style={{ marginTop: 6 }}>
                    {d.city}
                  </T>
                  <T variant="micro" color={colors.textMuted} numberOfLines={1}>
                    {d.country}
                  </T>
                </Press>
              );
            })}
          </ScrollView>
        </View>

        <Input label="Trip name" placeholder={`e.g. ${dest.city} with the crew`} value={name} onChangeText={setName} error={errors.name} maxLength={45} icon="create-outline" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Input label="Start date" icon="calendar-outline" value={dayLabel(start) + `, ${start.slice(0, 4)}`} onPressField={() => setPicker('start')} error={errors.start} containerStyle={{ flex: 1 }} />
          <Input label="End date" icon="calendar-outline" value={dayLabel(end) + `, ${end.slice(0, 4)}`} onPressField={() => setPicker('end')} error={errors.end} containerStyle={{ flex: 1 }} />
        </View>
        <T variant="caption" color={colors.textSecondary}>
          {days} day{days === 1 ? '' : 's'} · local time in {dest.city} ({dest.tz.split('/').pop()?.replace('_', ' ')})
        </T>

        <Input label="Group budget (USD)" placeholder={String(suggested)} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" error={errors.budget} icon="wallet-outline" hint={`Tip: ~${money(dest.dailyCost)}/person/day in ${dest.city}. For 4 people incl. flights ≈ ${money(suggested)}.`} />
        {!budget ? <Button label={`Use suggested ${money(suggested)}`} variant="soft" size="sm" onPress={() => setBudget(String(suggested))} /> : null}

        {!editing ? (
          <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name="key-outline" size={18} color={colors.primary} />
            <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              We’ll generate an invite code like <T variant="caption" weight="bold">{dest.city.slice(0, 3).toUpperCase()}-1234</T> so friends can join instantly.
            </T>
          </Card>
        ) : null}

        <Button label={editing ? 'Save changes' : 'Create trip'} icon={editing ? 'checkmark' : 'airplane'} onPress={save} />
      </View>

      <DatePickerSheet visible={picker === 'start'} value={start} title="Start date" onClose={() => setPicker(null)} onChange={(v) => {
        setStart(v);
        if (daysBetween(v, end) < 0) setEnd(addDays(v, 5));
      }} />
      <DatePickerSheet visible={picker === 'end'} value={end} min={start} max={addDays(start, 60)} title="End date" onClose={() => setPicker(null)} onChange={setEnd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dest: { width: 104, padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  destOn: { borderColor: colors.primary, backgroundColor: colors.primarySofter },
  destImg: { width: '100%', height: 76, borderRadius: radius.sm },
  check: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
