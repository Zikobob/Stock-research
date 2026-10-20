import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, line, radius } from '@/theme';

import { PlatePress } from './Plate';
import { Press } from './Press';
import { T } from './T';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** `primary` is ink and is for the one main action on a screen; `accent` is the highlighter-coloured loud one. */
  variant?: 'primary' | 'accent' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'light';
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const palette = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.ink, plate: true },
  accent: { bg: colors.accent, fg: colors.onAccent, border: colors.ink, plate: true },
  secondary: { bg: colors.card, fg: colors.text, border: colors.ink, plate: true },
  soft: { bg: colors.bgAlt, fg: colors.text, border: colors.ink, plate: true },
  ghost: { bg: 'transparent', fg: colors.text, border: 'transparent', plate: false },
  danger: { bg: colors.redSoft, fg: colors.red, border: colors.red, plate: true },
  light: { bg: 'rgba(255,255,255,0.16)', fg: colors.white, border: colors.white, plate: false },
};

/** Heights are all at least 44 points, so every button is an easy target. */
const HEIGHT = { lg: 56, md: 48, sm: 44 };

/** A printed button with a hard plate under it: it pushes down flush when pressed. */
export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, iconRight, loading, disabled, full = true, style, accessibilityHint, testID }: ButtonProps) {
  const p = palette[variant];
  const off = disabled || loading;
  const face = [styles.base, { height: HEIGHT[size], backgroundColor: p.bg, borderColor: p.border, paddingHorizontal: size === 'sm' ? 16 : 22 }, !p.plate && { alignSelf: 'stretch' as const }];
  const content = loading ? (
    <ActivityIndicator color={p.fg} />
  ) : (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} />}
      <T variant={size === 'sm' ? 'small' : 'title'} weight="bold" color={p.fg}>
        {label}
      </T>
      {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={p.fg} />}
    </View>
  );
  const common = { testID, accessibilityLabel: label, accessibilityHint, accessibilityState: { disabled: !!off, busy: !!loading }, disabled: off, onPress };
  if (!p.plate)
    return (
      <Press {...common} style={[face, full && { alignSelf: 'stretch' }, off && { opacity: 0.45 }, style]}>
        {content}
      </Press>
    );
  return (
    <PlatePress {...common} color={variant === 'danger' ? colors.red : variant === 'primary' ? colors.accent : colors.plate} wrapperStyle={[full && { alignSelf: 'stretch' }, off && { opacity: 0.45 }, style]} style={face}>
      {content}
    </PlatePress>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
