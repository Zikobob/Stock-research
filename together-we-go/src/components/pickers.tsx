/** Cross-platform time & date pickers (identical on iOS, Android and web). */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors, line, radius } from '@/theme';
import { addDays, daysBetween, parseYMD, time12, ymdFromUtcDate } from '@/utils/time';

import { Button } from './ui/Button';
import { Chip } from './ui/bits';
import { PlatePress } from './ui/Plate';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { SplitFlap } from './ui/SplitFlap';
import { T } from './ui/T';

/** A square button with a plate: the arrows above and below the time, and the month arrows. */
function ArrowButton({ icon, label, onPress }: { icon: 'chevron-up' | 'chevron-down' | 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} style={styles.arrow}>
      <Ionicons name={icon} size={22} color={colors.ink} />
    </PlatePress>
  );
}

/** Hours or minutes on departure-board tiles, with an arrow above and below to change them. */
function Stepper({ label, value, size, onUp, onDown }: { label: string; value: string; size: number; onUp: () => void; onDown: () => void }) {
  return (
    <View style={styles.stepper}>
      <ArrowButton icon="chevron-up" label={`Increase ${label}`} onPress={onUp} />
      <View accessible accessibilityLabel={`${label} ${value}`} style={{ alignItems: 'center' }}>
        <SplitFlap value={value} size={size} />
      </View>
      <ArrowButton icon="chevron-down" label={`Decrease ${label}`} onPress={onDown} />
      <T variant="kicker" color={colors.textSecondary} style={{ alignSelf: 'center' }}>
        {label}
      </T>
    </View>
  );
}

export function TimePickerSheet({ visible, value, onClose, onChange }: { visible: boolean; value: string; onClose: () => void; onChange: (v: string) => void }) {
  const [h, setH] = useState(10);
  const [m, setM] = useState(0);
  const { width } = useWindowDimensions();
  const size = width >= 380 ? 72 : width >= 340 ? 62 : 50;
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
  const hour12 = h % 12 === 0 ? 12 : h % 12;
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
        <Stepper label="hour" value={String(hour12).padStart(2, '0')} size={size} onUp={() => setH((x) => (x + 1) % 24)} onDown={() => setH((x) => (x + 23) % 24)} />
        <View style={styles.colon} accessibilityElementsHidden importantForAccessibility="no">
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Stepper label="minute" value={String(m).padStart(2, '0')} size={size} onUp={() => setM((x) => (x + 5) % 60)} onDown={() => setM((x) => (x + 55) % 60)} />
        <View style={{ gap: 8, marginLeft: 4 }}>
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
        <ArrowButton icon="chevron-back" label="Previous month" onPress={() => shiftMonth(-1)} />
        <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${MONTHS[m - 1]} ${y}`}>
          <T variant="headline" importantForAccessibility="no">
            {MONTHS[m - 1]}
          </T>
          <T variant="kicker" color={colors.textSecondary} importantForAccessibility="no">
            {y}
          </T>
        </View>
        <ArrowButton icon="chevron-forward" label="Next month" onPress={() => shiftMonth(1)} />
      </View>
      <View style={styles.grid}>
        {WD.map((w, i) => (
          <View key={`w${i}`} style={styles.head}>
            <T variant="kicker" color={colors.textSecondary}>
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
              scaleTo={0.94}
              style={[styles.cell, disabled(d) && { opacity: 0.3 }]}>
              <View style={[styles.day, d === value && styles.daySel]}>
                <T variant="numeralSm" color={d === value ? colors.onAccent : colors.text} importantForAccessibility="no">
                  {parseYMD(d).d}
                </T>
              </View>
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
  arrow: { height: 44, minWidth: 44, alignSelf: 'stretch', borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  stepper: { alignItems: 'stretch', gap: 8 },
  colon: { gap: 14, marginTop: -4 },
  dot: { width: 8, height: 8, backgroundColor: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  head: { width: `${100 / 7}%`, height: 28, alignItems: 'center', justifyContent: 'center' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.chip, borderWidth: line, borderColor: 'transparent' },
  daySel: { backgroundColor: colors.accent, borderColor: colors.ink },
});
