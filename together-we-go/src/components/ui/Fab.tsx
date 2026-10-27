import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { colors, line, radius } from '@/theme';

import type { IconName } from './bits';
import { PlatePress } from './Plate';
import { T } from './T';

/**
 * The one main "add" action of a screen: an accent-coloured block with an ink outline and a plate, in the corner where the
 * thumb rests. Give it a `label` and it grows wider. Pass it to `<Screen fab={…}>` so it floats above the content.
 */
export function Fab({ icon = 'add', label, onPress, accessibilityLabel, testID }: { icon?: IconName; label?: string; onPress: () => void; accessibilityLabel?: string; testID?: string }) {
  return (
    <PlatePress onPress={onPress} testID={testID} accessibilityLabel={accessibilityLabel ?? label ?? 'Add'} corner={radius.button} style={[styles.fab, label ? styles.wide : null]}>
      <Ionicons name={icon} size={26} color={colors.onAccent} />
      {label ? (
        <T variant="small" weight="bold" color={colors.onAccent}>
          {label}
        </T>
      ) : null}
    </PlatePress>
  );
}

const styles = StyleSheet.create({
  fab: { height: 56, minWidth: 56, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  wide: { paddingLeft: 16, paddingRight: 20 },
});
