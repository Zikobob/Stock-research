/** Cross-platform time & date pickers (identical on iOS, Android and web). */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { addDays, daysBetween, parseYMD, time12, ymdFromUtcDate } from '@/utils/time';

import { Button } from './ui/Button';
import { Chip } from './ui/bits';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

function Stepper({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  return (
    <View style={styles.stepper}>
      <Press onPress={onUp} accessibilityLabel={`Increase ${label}`} style={styles.stepBtn}>
        <Ionicons name="chevron-up" size={22} color={colors.primary} />
      </Press>
      <T variant="display" style={{ fontSize: 40, lineHeight: 48 }} accessibilityLabel={`${label} ${value}`}>
        {value}
      </T>
      <Press onPress={onDown} accessibilityLabel={`Decrease ${label}`} style={styles.stepBtn}>
        <Ionicons name="chevron-down" size={22} color={colors.primary} />
      </Press>
      <T variant="caption" color={colors.textMuted}>
        {label}
      </T>
    </View>
  );
}

export function TimePickerSheet({ visible, value, onClose, onChange }: { visible: boolean; value: string; onClose: () => void; onChange: (v: string) => void }) {
  const [h, setH] = useState(10);
  const [m, setM] = useState(0);
  // Re-sync with the field each time the sheet opens (derived during render, no effect needed).
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  const openKey = visible ? value : null;
  if (openKey !== openedWith) {
    setOpenedWith(openKey);
    if (visible) {
      const [hh, mm] = value.split(':').map(Number);
      setH(hh || 0);
      setM(mm || 0);
    }
  }
  const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const pm = h >= 12;
  const presets = ['07:00', '09:00', '12:30', '15:00', '18:00', '19:30', '21:00'];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Pick a time"
      subtitle={`Trip local time · ${time12(hhmm)}`}
      footer={
        <Button
          label="Set time"
          onPress={() => {
            onChange(hhmm);
            onClose();
          }}
        />
      }>
      <View style={styles.timeRow}>
        <Stepper label="hour" value={String(h % 12 === 0 ? 12 : h % 12)} onUp={() => setH((x) => (x + 1) % 24)} onDown={() => setH((x) => (x + 23) % 24)} />
        <T variant="display" style={{ fontSize: 40, lineHeight: 48, marginTop: -18 }}>
          :
        </T>
        <Stepper label="minute" value={String(m).padStart(2, '0')} onUp={() => setM((x) => (x + 5) % 60)} onDown={() => setM((x) => (x + 55) % 60)} />
        <View style={{ gap: 8, marginLeft: 6 }}>
          <Chip label="AM" active={!pm} onPress={() => pm && setH((x) => x - 12)} small />
          <Chip label="PM" active={pm} onPress={() => !pm && setH((x) => x + 12)} small />
        </View>
      </View>
      <View style={styles.wrap}>
        {presets.map((p) => (
          <Chip
            key={p}
            small
            label={time12(p)}
            active={p === hhmm}
            onPress={() => {
              const [a, b] = p.split(':').map(Number);
              setH(a);
              setM(b);
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function DatePickerSheet({
  visible,
  value,
  onClose,
  onChange,
  min,
  max,
  title = 'Pick a date',
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  title?: string;
}) {
  const [cursor, setCursor] = useState(value);
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  const openKey = visible ? value : null;
  if (openKey !== openedWith) {
    setOpenedWith(openKey);
    if (visible) setCursor(value);
  }
  const { y, m } = parseYMD(cursor);
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(y, m - 1, 1));
    const offset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(ymdFromUtcDate(new Date(Date.UTC(y, m - 1, d))));
    while (out.length % 7) out.push(null);
    return out;
  }, [y, m]);

  const shiftMonth = (n: number) => setCursor(ymdFromUtcDate(new Date(Date.UTC(y, m - 1 + n, 1))));
  const disabled = (d: string) => (min && daysBetween(min, d) < 0) || (max && daysBetween(d, max) < 0);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.monthRow}>
        <Press onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month" style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Press>
        <T variant="title">
          {MONTHS[m - 1]} {y}
        </T>
        <Press onPress={() => shiftMonth(1)} accessibilityLabel="Next month" style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Press>
      </View>
      <View style={styles.grid}>
        {WD.map((w, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <T variant="caption" color={colors.textMuted} weight="semibold">
              {w}
            </T>
          </View>
        ))}
        {cells.map((d, i) =>
          d ? (
            <Press
              key={d}
              disabled={!!disabled(d)}
              onPress={() => {
                onChange(d);
                onClose();
              }}
              accessibilityLabel={d}
              accessibilityState={{ selected: d === value, disabled: !!disabled(d) }}
              style={[styles.cell, styles.day, d === value && styles.daySel, disabled(d) && { opacity: 0.3 }]}>
              <T variant="bodySm" weight={d === value ? 'bold' : 'regular'} color={d === value ? colors.white : colors.text}>
                {parseYMD(d).d}
              </T>
            </Press>
          ) : (
            <View key={`e${i}`} style={styles.cell} />
          ),
        )}
      </View>
      <View style={styles.wrap}>
        <Chip small label="Today" onPress={() => setCursor(ymdFromUtcDate(new Date()))} />
        <Chip small label="+1 week" onPress={() => setCursor(addDays(cursor, 7))} />
        <Chip small label="+1 month" onPress={() => shiftMonth(1)} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  stepper: { alignItems: 'center', width: 76 },
  stepBtn: { width: 44, height: 36, borderRadius: radius.sm, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: 999 },
  daySel: { backgroundColor: colors.primary },
});
