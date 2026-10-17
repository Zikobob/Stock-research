import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TimePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notifications';
import { guessType, type PlaceHit } from '@/services/placeSearch';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityType, Trip } from '@/store/types';
import { colors } from '@/theme';
import { durationLabel } from '@/utils/format';
import { dayLabel, time12, tripDays, weekdayShort } from '@/utils/time';
import { maxLen, parseAmount, required, validateAmount, firstError } from '@/utils/validation';

import { activityTypes } from './meta';
import { PlaceSearch } from './PlaceSearch';

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
  // Until the person picks a type themselves, it follows the place they chose or the words they typed.
  const [typeTouched, setTypeTouched] = useState(false);
  const [day, setDay] = useState(date);
  const [time, setTime] = useState('10:00');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<PlaceHit | null>(null);
  const [location, setLocation] = useState('');
  const [more, setMore] = useState(false);
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
    setTypeTouched(!!src.type);
    setDay(editing?.date ?? date);
    setTime(editing?.time ?? '10:00');
    setTitle(src.title ?? '');
    setLocation(src.location ?? '');
    setPicked(src.lat !== undefined && src.lng !== undefined ? { id: src.placeId ?? 'saved', name: src.title ?? '', detail: src.location ?? '', lat: src.lat, lng: src.lng, type: src.type ?? 'sightseeing', source: 'saved', placeId: src.placeId } : null);
    setDuration(src.durationMin ?? 90);
    setCost(src.costPerPerson ? String(src.costPerPerson) : '');
    setNotes(src.notes ?? '');
    setVote(editing ? editing.status === 'voting' : false);
    setRemind(editing ? editing.reminder : true);
    setMore(!!editing);
    setErrors({});
  }

  const pick = (h: PlaceHit) => {
    tap();
    setPicked(h);
    setTitle(h.name);
    setLocation(h.detail);
    if (!typeTouched) setType(h.type);
    if (h.durationMin) setDuration(DURATIONS.reduce((a, b) => (Math.abs(b - h.durationMin!) < Math.abs(a - h.durationMin!) ? b : a)));
    if (h.costPerPerson !== undefined) setCost(h.costPerPerson ? String(h.costPerPerson) : '');
    setErrors((e) => ({ ...e, title: null }));
  };

  const typePlace = (text: string) => {
    setTitle(text);
    if (picked && text !== picked.name) setPicked(null);
    if (!typeTouched) setType(guessType(text));
  };

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
      title: firstError(title, required('a place'), maxLen(60, 'The place')),
      location: maxLen(60, 'The address')(location),
      cost: cost.trim() ? validateAmount(cost, { min: 0, max: 10000 }) : null,
      notes: maxLen(280, 'Notes')(notes),
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      if (e.location || e.cost || e.notes) setMore(true); // the problem is in a field that is folded away
      return tap('warning');
    }
    const payload = {
      date: day,
      time,
      title: title.trim(),
      location: location.trim() || picked?.detail || destinationById(trip.destinationId)?.city || '',
      type,
      durationMin: duration,
      costPerPerson: cost.trim() ? parseAmount(cost) ?? 0 : 0,
      notes: notes.trim() || undefined,
      status: vote ? ('voting' as const) : editing && editing.status !== 'voting' ? editing.status : ('confirmed' as const),
      reminder: remind,
    };
    const where = { lat: picked?.lat, lng: picked?.lng, placeId: picked?.placeId };
    if (remind) ensurePermission().catch(() => {});
    if (editing) {
      update(trip.id, editing.id, { ...payload, ...where });
      toast('Activity updated');
    } else {
      add(trip.id, { ...payload, assigned: [userId], ...where });
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
      <PlaceSearch
        trip={trip}
        visible={visible}
        value={title}
        onChangeText={typePlace}
        picked={picked}
        onPick={pick}
        onClear={() => {
          setTitle('');
          setPicked(null);
        }}
        error={errors.title}
      />

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

      <ToggleRow icon="people-outline" label={t('add.vote')} sub="Everyone gets a vote; majority confirms it" value={vote} onChange={setVote} />

      <Press onPress={() => setMore((m) => !m)} style={styles.moreBtn} accessibilityLabel="More options" accessibilityState={{ expanded: more }}>
        <T variant="small" weight="semibold" color={colors.textSecondary}>
          {more ? 'Fewer options' : 'More options'}
        </T>
        <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </Press>

      {more ? (
        <>
          <View style={{ gap: 8 }}>
            <T variant="small" weight="semibold">
              {t('add.type')}
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {activityTypes.map((a) => (
                <Chip
                  key={a.key}
                  label={a.label}
                  icon={a.icon}
                  active={type === a.key}
                  onPress={() => {
                    setType(a.key);
                    setTypeTouched(true);
                  }}
                />
              ))}
            </ScrollView>
          </View>
          <Input label="Address (optional)" placeholder="Street or area" icon="location-sharp" value={location} onChangeText={setLocation} error={errors.location} maxLength={70} testID="activity-location" />
          <Input label={t('add.cost')} placeholder="0 = free" icon="cash-outline" value={cost} onChangeText={setCost} keyboardType="decimal-pad" error={errors.cost} />
          <Input label={t('add.notes')} placeholder={t('add.notesPh')} value={notes} onChangeText={setNotes} multiline error={errors.notes} maxLength={300} />
          <ToggleRow icon="notifications-outline" label={t('add.remind')} value={remind} onChange={setRemind} />
        </>
      ) : null}

      <TimePickerSheet visible={timeOpen} value={time} onClose={() => setTimeOpen(false)} onChange={setTime} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.orangeSoft, padding: 10, borderRadius: 10 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
});
