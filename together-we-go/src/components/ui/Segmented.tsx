import { StyleSheet, View } from 'react-native';

import { colors, line, radius } from '@/theme';

import { Press } from './Press';
import { T } from './T';

/** A row of choices in one outline: the chosen one is filled with ink (Itinerary | Vote, Crew | Scout AI…). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press key={o.key} onPress={() => onChange(o.key)} style={[styles.item, on && styles.on]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label} scaleTo={0.98}>
            <T variant="small" weight="bold" color={on ? colors.onPrimary : colors.text}>
              {o.label}
            </T>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, padding: 3, gap: 3 },
  item: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button - 3, flexDirection: 'row', gap: 6 },
  on: { backgroundColor: colors.primary },
});
