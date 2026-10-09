import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme';

import { Press } from './Press';
import { T } from './T';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'light';
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
  secondary: { bg: colors.card, fg: colors.text, border: colors.border },
  soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.redSoft, fg: colors.red, border: colors.redSoft },
  light: { bg: 'rgba(255,255,255,0.18)', fg: colors.white, border: 'rgba(255,255,255,0.35)' },
};

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
  const h = size === 'lg' ? 52 : size === 'md' ? 44 : 36;
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
        { height: h, backgroundColor: p.bg, borderColor: p.border, paddingHorizontal: size === 'sm' ? 14 : 20 },
        full && { alignSelf: 'stretch' },
        variant === 'primary' && [shadow, { overflow: 'hidden' as const }],
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}>
      {variant === 'primary' ? <LinearGradient colors={[colors.primary, colors.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={p.fg} />}
          <T variant={size === 'sm' ? 'small' : 'title'} weight="semibold" color={p.fg}>
            {label}
          </T>
          {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 15 : 18} color={p.fg} />}
        </View>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
