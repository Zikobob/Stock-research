import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { colors, shadowStrong } from '@/theme';

import type { IconName } from './bits';
import { Press } from './Press';
import { T } from './T';

/**
 * The one main "add" action of a screen, a black (white in the dark mode) round button in the corner where the thumb rests.
 * Give it a `label` and it stretches into a pill. Pass it to `<Screen fab={…}>` so it floats above the content.
 */
export function Fab({ icon = 'add', label, onPress, accessibilityLabel, testID }: { icon?: IconName; label?: string; onPress: () => void; accessibilityLabel?: string; testID?: string }) {
  return (
    <Press onPress={onPress} testID={testID} accessibilityLabel={accessibilityLabel ?? label ?? 'Add'} style={[styles.fab, label ? styles.wide : null]} scaleTo={0.94}>
      <Ionicons name={icon} size={26} color={colors.onPrimary} />
      {label ? (
        <T variant="small" weight="bold" color={colors.onPrimary}>
          {label}
        </T>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  fab: { height: 56, minWidth: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...shadowStrong },
  wide: { paddingLeft: 18, paddingRight: 22 },
});
