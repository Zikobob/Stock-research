import { StyleSheet, View } from 'react-native';

import { Card, Chip } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

/** Re-creates the sample trip as upcoming, in progress or finished. */
export function DemoCard() {
  const reseed = useAppStore((s) => s.reseedDemo);
  const timeline = useAppStore((s) => s.demoTimeline);

  return (
    <Card style={{ marginTop: 14, gap: 12 }}>
      <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
        Demo timeline
      </T>
      <T variant="caption" color={colors.textSecondary}>
        Re-create the sample Amalfi Squad trip as upcoming, in progress or finished to show every stage from planning through completion.
      </T>
      <View style={styles.wrap}>
        {(
          [
            ['upcoming', 'Starts in 3 days'],
            ['active', 'Day 2 in progress'],
            ['completed', 'Just finished'],
          ] as const
        ).map(([k, l]) => (
          <Chip
            key={k}
            small
            label={l}
            active={timeline === k}
            onPress={() =>
              confirmAction('Reset the demo trip?', `“Amalfi Squad” will be rebuilt as “${l}”. Your other trips are untouched.`, () => {
                reseed(k);
                toast('Demo trip updated');
              })
            }
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
