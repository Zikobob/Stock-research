/**
 * The floating controls of the 360° screen, drawn in the paper-and-ink look: outlined squares on the scene, each at least 44 points.
 * These are only the controls. The scene and everything that moves live in Scene.tsx and panorama.tsx.
 */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PlatePress } from '@/components/ui/Plate';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** An outlined square button with an icon only (back, look left, look right). */
export function Square({ icon, label, onPress, style }: { icon: IconName; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} wrapperStyle={style} style={styles.face}>
      <Ionicons name={icon} size={20} color={colors.ink} />
    </PlatePress>
  );
}

/** An outlined button with an icon and a word. `on` fills it with the accent, like a chosen chip. */
export function Switch({ icon, text, label, hint, role = 'button', on, selected, onPress, onLongPress }: { icon: IconName; text: string; label: string; hint?: string; role?: 'button' | 'switch'; on?: boolean; selected?: boolean; onPress: () => void; onLongPress?: () => void }) {
  const fg = on ? colors.onAccent : colors.ink;
  return (
    <PlatePress
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={role === 'switch' ? { checked: !!on } : selected !== undefined ? { selected } : undefined}
      offset={3}
      corner={radius.button}
      style={[styles.face, styles.wide, on && { backgroundColor: colors.accent }]}>
      <Ionicons name={icon} size={16} color={fg} />
      <T variant="small" weight="bold" color={fg}>
        {text}
      </T>
    </PlatePress>
  );
}

/** One choice in a row of choices (a landmark to look at, a city to fly to): a rectangle that fills with the accent when it is the one. */
export function Pick({ text, icon, label, on, onPress }: { text: string; icon?: IconName; label: string; on: boolean; onPress: () => void }) {
  const fg = on ? colors.onAccent : colors.ink;
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: on }} offset={3} corner={radius.chip} style={[styles.pick, on && { backgroundColor: colors.accent }]}>
      {icon ? <Ionicons name={icon} size={15} color={fg} /> : null}
      <T variant="small" weight="bold" color={fg} numberOfLines={1}>
        {text}
      </T>
    </PlatePress>
  );
}

/** A small outlined readout that is not a button (the compass). */
export function Readout({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View style={styles.readout}>
      <Ionicons name={icon} size={14} color={colors.ink} />
      <T variant="kicker" color={colors.ink}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { minWidth: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  wide: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  pick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 44, height: 44, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  readout: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
});
