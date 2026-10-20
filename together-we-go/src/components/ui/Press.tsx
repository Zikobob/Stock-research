import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, Platform, Pressable, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { touch } from '@/theme';

import { nativeDriver, useMotion } from './motion';

export function tap(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web' || !useAppStore.getState().settings.haptics) return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export interface PressProps extends Omit<PressableProps, 'style'> {
  /** Don't put `transform` in here: the press-in squeeze owns it. */
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. */
  scaleTo?: number;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that squeezes to 96% when pressed and springs back with a little overshoot, with an optional
 * haptic tick. Anything smaller than 44 points gets an invisible hit area to make it 44 (Fitts's law).
 */
export function Press({ style, scaleTo = 0.96, haptic = true, onPress, onPressIn, onPressOut, onLayout, hitSlop, accessibilityRole = 'button', ...rest }: PressProps) {
  const state = rest.accessibilityState;
  const motion = useMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [slop, setSlop] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);

  const squeeze = (to: number, bounciness: number, speed: number) => {
    if (!motion) scale.setValue(to);
    else Animated.spring(scale, { toValue: to, speed, bounciness, useNativeDriver: nativeDriver }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      // Mirror the state as ARIA props so web screen readers announce selection too.
      aria-selected={state?.selected}
      aria-checked={state?.checked}
      hitSlop={hitSlop ?? slop ?? undefined}
      {...rest}
      onLayout={(e: LayoutChangeEvent) => {
        onLayout?.(e);
        if (hitSlop !== undefined) return;
        const { width, height } = e.nativeEvent.layout;
        const v = Math.max(0, Math.ceil((touch.min - height) / 2));
        const h = Math.max(0, Math.ceil((touch.min - width) / 2));
        setSlop((prev) => (prev ? (prev.top === v && prev.left === h ? prev : { top: v, bottom: v, left: h, right: h }) : v || h ? { top: v, bottom: v, left: h, right: h } : prev));
      }}
      onPressIn={(e) => {
        if (scaleTo !== 1) squeeze(scaleTo, 0, 60);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (scaleTo !== 1) squeeze(1, 12, 24);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
