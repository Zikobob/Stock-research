import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById, destinations } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useDraft } from '@/hooks/useDraft';
import { useAppStore } from '@/store/useAppStore';
import { colors, line, radius, space } from '@/theme';
import { money } from '@/utils/format';
import { addDays, dayLabel, daysBetween, todayInTz } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount, validateTripDates } from '@/utils/validation';

/** Create a trip (or edit one with ?edit=<tripId>). A half-filled form is kept if the person leaves and comes back. */
export default function NewTrip() {
  const params = useLocalSearchParams<{ edit?: string; destination?: string }>();
  const editing = useAppStore((s) => (params.edit ? s.trips.find((t) => t.id === params.edit) : undefined));
  const createTrip = useAppStore((s) => s.createTrip);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const today = todayInTz('UTC');

  const initialDest = editing?.destinationId ?? params.destination ?? 'tokyo';
  const key = editing ? `edit-trip-${editing.id}` : 'new-trip';
  const [destId, setDestId] = useState(initialDest);
  const [name, setName, clearName] = useDraft(`${key}-name`, editing?.name ?? '');
  const [start, setStart, clearStart] = useDraft(`${key}-start`, editing?.startDate ?? addDays(today, 30));
  const [end, setEnd, clearEnd] = useDraft(`${key}-end`, editing?.endDate ?? addDays(today, 36));
  const [budget, setBudget, clearBudget] = useDraft(`${key}-budget`, editing ? String(editing.budget) : '');
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
      [clearName, clearStart, clearEnd, clearBudget].forEach((c) => c());
      router.back();
    } else {
      createTrip({ name, destinationId: destId, startDate: start, endDate: end, budget: b });
      tap('success');
      toast('Trip created. Share the invite code with your group');
      [clearName, clearStart, clearEnd, clearBudget].forEach((c) => c());
      router.dismissAll?.();
      router.replace('/crew');
    }
  };

  return (
    <Screen header={<Header kicker="Group trip" title={editing ? 'Edit trip' : 'New trip'} subtitle={editing ? editing.name : 'Where is the group headed?'} />} bottomInset={30}>
      <View style={{ gap: space.xxl }}>
        <View style={{ gap: 10 }}>
          <T variant="kicker" color={colors.ink}>
            Destination
          </T>
          <Input placeholder="Search destinations…" icon="search" value={q} onChangeText={setQ} accessibilityLabel="Search destinations" />
          {filtered.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 4 }} style={{ marginHorizontal: -20 }}>
              {filtered.map((d) => {
                const on = d.id === destId;
                return (
                  <Press key={d.id} onPress={() => setDestId(d.id)} scaleTo={0.97} style={[styles.dest, on && { backgroundColor: colors.accent }]} accessibilityState={{ selected: on }} accessibilityLabel={`${d.city}, ${d.country}`}>
                    <Image source={imageSource(d.image)} style={styles.destImg} contentFit="cover" />
                    {on ? (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={16} color={colors.onAccent} />
                      </View>
                    ) : null}
                    <View style={styles.destText}>
                      <T variant="caption" weight="bold" color={on ? colors.onAccent : colors.text} numberOfLines={1}>
                        {d.city}
                      </T>
                      <T variant="micro" color={on ? colors.onAccent : colors.textSecondary} numberOfLines={1}>
                        {d.country}
                      </T>
                    </View>
                  </Press>
                );
              })}
            </ScrollView>
          ) : (
            <T variant="small" color={colors.textSecondary}>
              No destination matches “{q}”.
            </T>
          )}
        </View>

        <Input label="Trip name" placeholder={`e.g. ${dest.city} with the crew`} value={name} onChangeText={setName} error={errors.name} maxLength={45} />

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Input label="Start date" value={dayLabel(start) + `, ${start.slice(0, 4)}`} onPressField={() => setPicker('start')} error={errors.start} containerStyle={{ flex: 1 }} />
            <Input label="End date" value={dayLabel(end) + `, ${end.slice(0, 4)}`} onPressField={() => setPicker('end')} error={errors.end} containerStyle={{ flex: 1 }} />
          </View>
          <T variant="kicker" color={colors.textSecondary}>
            {days} {days === 1 ? 'day' : 'days'} / local time in {dest.city} ({dest.tz.split('/').pop()?.replace('_', ' ')})
          </T>
        </View>

        <View style={{ gap: 10 }}>
          <Input label="Group budget (USD)" placeholder={String(suggested)} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" error={errors.budget} hint={`Tip: about ${money(dest.dailyCost)} a person a day in ${dest.city}. For 4 people including flights, around ${money(suggested)}.`} />
          {!budget ? <Button label={`Use ${money(suggested)}`} variant="secondary" size="md" full={false} onPress={() => setBudget(String(suggested))} /> : null}
        </View>

        {!editing ? (
          <View style={styles.note}>
            <Ionicons name="key-outline" size={18} color={colors.ink} />
            <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              You’ll get an invite code like <T variant="caption" weight="bold">{dest.city.slice(0, 3).toUpperCase()}-1234</T> to share, so friends can join in a tap.
            </T>
          </View>
        ) : null}

        <Button label={editing ? 'Save changes' : 'Create trip'} icon={editing ? 'checkmark' : 'airplane-outline'} onPress={save} />
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
  dest: { width: 120, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, overflow: 'hidden' },
  destImg: { width: '100%', height: 84, borderBottomWidth: line, borderBottomColor: colors.ink },
  destText: { paddingHorizontal: 10, paddingVertical: 8, minHeight: 50 },
  check: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
