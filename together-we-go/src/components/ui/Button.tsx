import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

import { Press } from './Press';
import { T } from './T';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** `primary` is black (white in the dark mode) and is for the one main action on a screen; `accent` is the loud moment. */
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
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
  secondary: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
  soft: { bg: colors.bgAlt, fg: colors.text, border: colors.bgAlt },
  ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
  danger: { bg: colors.redSoft, fg: colors.red, border: colors.redSoft },
  light: { bg: 'rgba(255,255,255,0.18)', fg: colors.white, border: 'rgba(255,255,255,0.4)' },
};

/** Heights are all at least 44 points, so every button is an easy target. */
const HEIGHT = { lg: 56, md: 48, sm: 44 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading,
  disabled,
  full = true,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const p = palette[variant];
  return (
    <Press
      testID={testID}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        { height: HEIGHT[size], backgroundColor: p.bg, borderColor: p.border, paddingHorizontal: size === 'sm' ? 16 : 22 },
        full && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} />}
          <T variant={size === 'sm' ? 'small' : 'title'} weight="bold" color={p.fg}>
            {label}
          </T>
          {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={p.fg} />}
        </View>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
