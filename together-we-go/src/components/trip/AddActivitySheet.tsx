import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TimePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Perforation } from '@/components/ui/Rule';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useDraft } from '@/hooks/useDraft';
import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notifications';
import { guessType, type PlaceHit } from '@/services/placeSearch';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { dayLabel, time12, tripDays } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount } from '@/utils/validation';

import { DayTabs } from './DayTabs';
import { activityTypes } from './meta';
import { PlaceSearch } from './PlaceSearch';
import { type ActivityDraft, type Form, blank, formFrom, hasExtras, mergeDraft } from './addForm';
import { DURATIONS, clockParts, durationText, stepDuration } from './plan';

export type { ActivityDraft };

interface Props {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  /** The day to start on (the one the Plan is showing). */
  date: string;
  editing?: Activity | null;
  draft?: ActivityDraft | null;
  /** Start with "put it to a group vote" on (the Vote tab asks for this). */
  voting?: boolean;
}

export function AddActivitySheet({ visible, onClose, trip, date, editing, draft, voting }: Props) {
  const t = useT();
  const add = useAppStore((s) => s.addActivity);
  const update = useAppStore((s) => s.updateActivity);
  const userId = useAppStore((s) => s.session?.userId ?? '');

  // A new activity is a draft that survives closing the sheet; editing one (or adding from a place) starts from that activity instead.
  const isNew = !editing && !draft;
  const [saved, setSaved, clearSaved] = useDraft<Form | null>('add-activity', null);
  const [local, setLocal] = useState<Form>(() => blank(trip.id));
  const form = isNew ? (saved && saved.tripId === trip.id ? saved : blank(trip.id)) : local;
  const patch = (p: Partial<Form>) => (isNew ? setSaved((cur) => mergeDraft(cur, trip.id, p)) : setLocal((cur) => ({ ...cur, ...p })));

  const { title, picked, location, type, time, duration, cost, notes, remind } = form;
  const day = form.day ?? date;
  const vote = form.vote ?? !!voting;

  const [more, setMore] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // When the sheet opens: fill the form for an edit, show the folded part if the draft uses it, forget old errors.
  const [openedFor, setOpenedFor] = useState<string | object | null>(null);
  const openKey = visible ? (editing?.id ?? draft ?? 'new') : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (visible) {
      setErrors({});
      if (isNew) setMore(hasExtras(form));
      else {
        setLocal(formFrom(trip.id, date, editing, draft));
        setMore(!!editing);
      }
    }
  }

  const pick = (h: PlaceHit) => {
    tap();
    patch({
      picked: h,
      title: h.name,
      location: h.detail,
      ...(form.typeTouched ? {} : { type: h.type }),
      ...(h.durationMin ? { duration: DURATIONS.reduce((a, b) => (Math.abs(b - h.durationMin!) < Math.abs(a - h.durationMin!) ? b : a)) } : {}),
      ...(h.costPerPerson !== undefined ? { cost: h.costPerPerson ? String(h.costPerPerson) : '' } : {}),
    });
    setErrors((e) => ({ ...e, title: null }));
  };

  const typePlace = (text: string) =>
    patch({
      title: text,
      ...(picked && text !== picked.name ? { picked: null } : {}),
      ...(form.typeTouched ? {} : { type: guessType(text) }),
    });

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
      if (isNew) clearSaved();
    }
    tap('success');
    onClose();
  };

  const clock = clockParts(time);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit activity' : t('add.title')}
      subtitle={t('add.subtitle')}
      footer={<Button label={editing ? t('add.save') : vote ? 'Start the vote' : t('add.submit')} onPress={submit} testID="add-activity-submit" />}>
      <PlaceSearch
        trip={trip}
        visible={visible}
        value={title}
        onChangeText={typePlace}
        picked={picked}
        onPick={pick}
        onClear={() => patch({ title: '', picked: null })}
        error={errors.title}
      />

      <View style={styles.group}>
        <T variant="kicker">Day</T>
        <DayTabs days={days} value={day} onChange={(d) => d !== 'all' && patch({ day: d })} edge={22} kind="radio" />
      </View>

      <View style={styles.group}>
        <T variant="kicker">{t('add.time')}</T>
        <Press onPress={() => setTimeOpen(true)} style={styles.field} accessibilityLabel={`${t('add.time')} ${time12(time)}. Change`} scaleTo={0.99}>
          <Ionicons name="time-outline" size={22} color={colors.ink} />
          <View style={styles.clock}>
            <T variant="numeralSm">{clock.clock}</T>
            <T variant="kicker" color={colors.textSecondary}>
              {clock.suffix}
            </T>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
        </Press>
      </View>

      <View style={styles.group}>
        <T variant="kicker">{t('add.duration')}</T>
        <View style={styles.stepper}>
          <Step icon="remove" label="Shorter" disabled={duration <= DURATIONS[0]} onPress={() => patch({ duration: stepDuration(duration, -1) })} />
          <View style={styles.stepValue}>
            <T variant="numeralSm" accessibilityLabel={`Duration ${durationText(duration)}`}>
              {durationText(duration)}
            </T>
          </View>
          <Step icon="add" label="Longer" disabled={duration >= DURATIONS[DURATIONS.length - 1]} onPress={() => patch({ duration: stepDuration(duration, 1) })} />
        </View>
      </View>

      {clash ? (
        <View style={styles.warn} accessibilityLiveRegion="polite">
          <Ionicons name="warning-outline" size={18} color={colors.warn} />
          <T variant="small" color={colors.warn} style={{ flex: 1 }}>
            Overlaps with “{clash.title}” at {time12(clash.time)}. You can still add it.
          </T>
        </View>
      ) : null}

      <View style={[styles.vote, vote && { backgroundColor: colors.accentSoft }]}>
        <ToggleRow icon="thumbs-up-outline" label={t('add.vote')} sub="Everyone gets a vote; majority confirms it" value={vote} onChange={(v) => patch({ vote: v })} />
      </View>

      <View style={{ paddingRight: 3 }}>
        <Perforation />
        <Press onPress={() => setMore((m) => !m)} style={styles.moreBtn} accessibilityLabel="More options" accessibilityState={{ expanded: more }} scaleTo={0.99}>
          <T variant="kicker" style={{ flex: 1 }}>
            {more ? 'Fewer options' : 'More options'}
          </T>
          <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
        </Press>
      </View>

      {more ? (
        <>
          <View style={styles.group}>
            <T variant="kicker">{t('add.type')}</T>
            <View style={styles.wrap}>
              {activityTypes.map((a) => (
                <Chip key={a.key} label={a.label} icon={a.icon} active={type === a.key} onPress={() => patch({ type: a.key, typeTouched: true })} />
              ))}
            </View>
          </View>
          <Input label="Address (optional)" placeholder="Street or area" icon="location-sharp" value={location} onChangeText={(v) => patch({ location: v })} error={errors.location} maxLength={70} testID="activity-location" style={styles.typing} />
          <Input label={t('add.cost')} placeholder="0 = free" icon="cash-outline" value={cost} onChangeText={(v) => patch({ cost: v })} keyboardType="decimal-pad" error={errors.cost} style={styles.typing} />
          <Input label={t('add.notes')} placeholder={t('add.notesPh')} value={notes} onChangeText={(v) => patch({ notes: v })} multiline error={errors.notes} maxLength={300} />
          <ToggleRow icon="notifications-outline" label={t('add.remind')} value={remind} onChange={(v) => patch({ remind: v })} />
        </>
      ) : null}

      <TimePickerSheet visible={timeOpen} value={time} onClose={() => setTimeOpen(false)} onChange={(v) => patch({ time: v })} />
    </Sheet>
  );
}

/** One end of the duration stepper: a 56 point square with a plus or a minus. */
function Step({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityState={{ disabled }} style={[styles.step, disabled && { opacity: 0.35 }]} scaleTo={0.94}>
      <Ionicons name={icon} size={24} color={colors.ink} />
    </Press>
  );
}

const styles = StyleSheet.create({
  // the text box itself is as tall as a fingertip, not only the outlined field around it
  typing: { minHeight: 44 },
  // the Input component leaves 3 points on the right for its plate, so the other blocks do too and every edge lines up
  group: { gap: 8, paddingRight: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  clock: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, overflow: 'hidden' },
  step: { width: 60, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgAlt },
  stepValue: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderLeftWidth: line, borderRightWidth: line, borderColor: colors.ink },
  warn: { marginRight: 3, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.button, borderWidth: line, borderColor: colors.warn, backgroundColor: colors.warnSoft },
  vote: { marginRight: 3, paddingHorizontal: 12, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
});
