import { useRef } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Plate } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';
import { dayLabel, weekdayShort } from '@/utils/time';

const PLATE = 3;

/**
 * A row of day tabs cut like the tabs of a ticket folder: the weekday in small caps over the day of the month in mono.
 * The chosen day is filled with the accent and sits on a plate. Today's tab says TODAY. `withAll` adds the "All" tab first.
 * Wide enough to scroll sideways on a long trip; the chosen tab is scrolled into view when the row first appears.
 */
export function DayTabs<K extends string>({
  days,
  value,
  onChange,
  today,
  withAll,
  edge = 20,
  kind = 'tab',
}: {
  days: string[];
  /** A day (YYYY-MM-DD), or 'all' when `withAll` is on. */
  value: K | 'all';
  onChange: (day: K | 'all') => void;
  today?: string;
  withAll?: boolean;
  /** The page's side padding, so the row can run to the edge of the screen and still start on the gutter. */
  edge?: number;
  /** `tab` filters a list; `radio` picks one of several (the day in Add activity). */
  kind?: 'tab' | 'radio';
}) {
  const scroller = useRef<ScrollView>(null);
  const reveal = (e: LayoutChangeEvent) => scroller.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - edge - 12), animated: false });
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={kind === 'tab' ? 'tablist' : 'radiogroup'}
      style={{ marginHorizontal: -edge, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: edge, gap: 6 }}>
      {withAll ? <Tab label="All days" on={value === 'all'} kind={kind} onPress={() => onChange('all')} onLayout={value === 'all' ? reveal : undefined} top={null} bottom="All" /> : null}
      {days.map((d, i) => {
        const isToday = d === today;
        return (
          <Tab
            key={d}
            label={`Day ${i + 1}, ${weekdayShort(d)} ${dayLabel(d)}${isToday ? ', today' : ''}`}
            on={value === d}
            kind={kind}
            onPress={() => onChange(d as K)}
            onLayout={value === d ? reveal : undefined}
            top={isToday ? 'Today' : weekdayShort(d)}
            bottom={String(Number(d.slice(8)))}
          />
        );
      })}
    </ScrollView>
  );
}

function Tab({ label, on, kind, onPress, onLayout, top, bottom }: { label: string; on: boolean; kind: 'tab' | 'radio'; onPress: () => void; onLayout?: (e: LayoutChangeEvent) => void; top: string | null; bottom: string }) {
  const fg = on ? colors.onAccent : colors.text;
  return (
    <View onLayout={onLayout}>
      <Plate offset={PLATE} corner={radius.chip} color={on ? colors.plate : 'transparent'}>
        <Press
          onPress={onPress}
          accessibilityRole={kind}
          accessibilityState={kind === 'tab' ? { selected: on } : { checked: on }}
          accessibilityLabel={label}
          scaleTo={0.97}
          style={[styles.tab, { backgroundColor: on ? colors.accent : colors.card }]}>
          {top ? (
            <T variant="kicker" color={on ? colors.onAccent : colors.textSecondary} style={styles.top} importantForAccessibility="no">
              {top}
            </T>
          ) : null}
          <T variant="numeralSm" color={fg} style={styles.num} importantForAccessibility="no">
            {bottom}
          </T>
        </Press>
      </Plate>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { minWidth: 56, height: 54, paddingHorizontal: 10, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  top: { lineHeight: 13 },
  num: { lineHeight: 26 },
});
