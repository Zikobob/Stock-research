import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TimePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityType, Trip } from '@/store/types';
import { colors } from '@/theme';
import { durationLabel } from '@/utils/format';
import { dayLabel, time12, tripDays, weekdayShort } from '@/utils/time';
import { maxLen, parseAmount, required, validateAmount, firstError } from '@/utils/validation';

import { activityTypes } from './meta';

export interface ActivityDraft {
  title?: string;
  location?: string;
  type?: ActivityType;
  durationMin?: number;
  costPerPerson?: number;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
}

const DURATIONS = [30, 60, 90, 120, 180, 300, 480];

interface Props {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  date: string;
  editing?: Activity | null;
  draft?: ActivityDraft | null;
}

export function AddActivitySheet({ visible, onClose, trip, date, editing, draft }: Props) {
  const t = useT();
  const add = useAppStore((s) => s.addActivity);
  const update = useAppStore((s) => s.updateActivity);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const [type, setType] = useState<ActivityType>('sightseeing');
  const [day, setDay] = useState(date);
  const [time, setTime] = useState('10:00');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState(90);
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [vote, setVote] = useState(false);
  const [remind, setRemind] = useState(true);
  const [timeOpen, setTimeOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Reset the form whenever the sheet opens for a new activity / edit / draft.
  const [openedFor, setOpenedFor] = useState<string | object | null>(null);
  const openKey = visible ? (editing?.id ?? draft ?? 'new') : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (visible) resetForm();
  }

  function resetForm() {
    const src = editing ?? draft ?? {};
    setType(src.type ?? 'sightseeing');
    setDay(editing?.date ?? date);
    setTime(editing?.time ?? '10:00');
    setTitle(src.title ?? '');
    setLocation(src.location ?? '');
    setDuration(src.durationMin ?? 90);
    setCost(src.costPerPerson ? String(src.costPerPerson) : '');
    setNotes(src.notes ?? '');
    setVote(editing ? editing.status === 'voting' : false);
    setRemind(editing ? editing.reminder : true);
    setErrors({});
  }

  const days = tripDays(trip.startDate, trip.endDate);

  // Semantic check: warn about overlapping plans on the same day.
  const clash = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const start = h * 60 + m;
    const end = start + duration;
    return trip.activities.find((a) => {
      if (a.date !== day || a.id === editing?.id) return false;
      const [ah, am] = a.time.split(':').map(Number);
      const s = ah * 60 + am;
      return start < s + a.durationMin && s < end;
    });
  }, [trip.activities, day, time, duration, editing?.id]);

  const submit = async () => {
    const e = {
      title: firstError(title, required('an activity name'), maxLen(60, 'Activity name')),
      location: firstError(location, required('a location'), maxLen(60, 'Location')),
      cost: cost.trim() ? validateAmount(cost, { min: 0, max: 10000 }) : null,
      notes: maxLen(280, 'Notes')(notes),
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return tap('warning');
    const payload = {
      date: day,
      time,
      title: title.trim(),
      location: location.trim(),
      type,
      durationMin: duration,
      costPerPerson: cost.trim() ? parseAmount(cost) ?? 0 : 0,
      notes: notes.trim() || undefined,
      status: vote ? ('voting' as const) : editing && editing.status !== 'voting' ? editing.status : ('confirmed' as const),
      reminder: remind,
    };
    if (remind) ensurePermission().catch(() => {});
    if (editing) {
      update(trip.id, editing.id, payload);
      toast('Activity updated');
    } else {
      add(trip.id, { ...payload, assigned: [userId], lat: draft?.lat, lng: draft?.lng, placeId: draft?.placeId });
      toast(`Added to ${dayLabel(day)}${vote ? ' — group vote started' : ''}`);
    }
    tap('success');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit Activity' : t('add.title')}
      subtitle={t('add.subtitle')}
      footer={<Button label={editing ? t('add.save') : t('add.submit')} onPress={submit} testID="add-activity-submit" />}>
      <View style={{ gap: 8 }}>
        <T variant="small" weight="semibold">
          {t('add.type')}
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {activityTypes.map((a) => (
            <Chip key={a.key} label={a.label} icon={a.icon} active={type === a.key} onPress={() => setType(a.key)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="small" weight="semibold">
          Day
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => (
            <Chip key={d} small label={`Day ${i + 1} · ${weekdayShort(d)} ${dayLabel(d)}`} active={day === d} onPress={() => setDay(d)} />
          ))}
        </ScrollView>
      </View>

      <Input
        label={t('add.time')}
        icon="time-outline"
        value={time12(time)}
        onPressField={() => setTimeOpen(true)}
        right={<Ionicons name="pencil" size={15} color={colors.textMuted} />}
      />

      <Input label={t('add.name')} placeholder={t('add.namePh')} value={title} onChangeText={setTitle} error={errors.title} maxLength={70} testID="activity-name" />
      <Input label={t('add.location')} placeholder={t('add.locationPh')} icon="location-sharp" value={location} onChangeText={setLocation} error={errors.location} maxLength={70} testID="activity-location" />

      <View style={{ gap: 8 }}>
        <T variant="small" weight="semibold">
          {t('add.duration')}
        </T>
        <View style={styles.wrap}>
          {DURATIONS.map((d) => (
            <Chip key={d} small label={d === 300 ? 'Half day' : d === 480 ? 'Full day' : durationLabel(d)} active={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>
      </View>

      {clash ? (
        <View style={styles.warn} accessibilityLiveRegion="polite">
          <Ionicons name="warning-outline" size={16} color="#B45A1C" />
          <T variant="caption" color="#B45A1C" style={{ flex: 1 }}>
            Overlaps with “{clash.title}” at {time12(clash.time)}. You can still add it.
          </T>
        </View>
      ) : null}

      <Input label={t('add.cost')} placeholder="0 = free" icon="cash-outline" value={cost} onChangeText={setCost} keyboardType="decimal-pad" error={errors.cost} />
      <Input label={t('add.notes')} placeholder={t('add.notesPh')} value={notes} onChangeText={setNotes} multiline error={errors.notes} maxLength={300} />

      <View>
        <ToggleRow icon="people-outline" label={t('add.vote')} sub="Everyone gets a vote; majority confirms it" value={vote} onChange={setVote} />
        <ToggleRow icon="notifications-outline" label={t('add.remind')} value={remind} onChange={setRemind} />
      </View>

      <TimePickerSheet visible={timeOpen} value={time} onClose={() => setTimeOpen(false)} onChange={setTime} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.orangeSoft, padding: 10, borderRadius: 10 },
});
