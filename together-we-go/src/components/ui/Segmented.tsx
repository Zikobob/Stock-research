import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { Press } from './Press';
import { T } from './T';

/** Pill-shaped tab switcher: grey track, white selected pill (Itinerary | Vote, Crew | Scout AI…). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press key={o.key} onPress={() => onChange(o.key)} style={[styles.item, on && styles.on]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label} scaleTo={0.98}>
            <T variant="small" weight={on ? 'bold' : 'semibold'} color={on ? colors.text : colors.textSecondary}>
              {o.label}
            </T>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: 999, padding: 4 },
  item: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, flexDirection: 'row', gap: 6 },
  on: { backgroundColor: colors.card, boxShadow: '0px 1px 4px rgba(0,0,0,0.12)' } as object,
});
