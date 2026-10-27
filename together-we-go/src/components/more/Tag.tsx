import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { PlatePress } from '@/components/ui/Plate';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

/**
 * One luggage tag on the More page: a paper square with an ink outline, a punched eyelet in the corner, a line icon and a short
 * label in mono caps. Pressing slides it onto its plate. `name` is what a screen reader says (the label can be shorter).
 */
export function Tag({ icon, label, name, hint, onPress }: { icon: IconName; label: string; name?: string; hint?: string; onPress: () => void }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={name ?? label} accessibilityHint={hint} corner={radius.card} wrapperStyle={styles.wrap} style={styles.face}>
      <View pointerEvents="none" style={styles.eyelet}>
        <View style={styles.hole} />
      </View>
      <Ionicons name={icon} size={30} color={colors.ink} />
      <T variant="kicker" style={styles.label}>
        {label}
      </T>
    </PlatePress>
  );
}

/** The one wide tag, for the thing you hope not to need: Emergency. Its icon square is red, because red means a state. */
export function WideTag({ icon, label, sub, name, hint, onPress }: { icon: IconName; label: string; sub: string; name?: string; hint?: string; onPress: () => void }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={name ?? label} accessibilityHint={hint} corner={radius.card} wrapperStyle={{ alignSelf: 'stretch' }} style={styles.wide}>
      <View style={styles.alert}>
        <Ionicons name={icon} size={24} color={colors.red} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="title" weight="bold">
          {label}
        </T>
        <T variant="caption" color={colors.textSecondary}>
          {sub}
        </T>
      </View>
      <Ionicons name="arrow-forward" size={16} color={colors.ink} />
    </PlatePress>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  wide: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  alert: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.red, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  face: { flex: 1, minHeight: 104, justifyContent: 'space-between', padding: 12, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  eyelet: { position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  hole: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bg },
  label: { fontSize: 10.5, lineHeight: 14, letterSpacing: 0.6 },
});
