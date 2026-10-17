import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

export function tap(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web' || !useAppStore.getState().settings.haptics) return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export interface PressProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. */
  scaleTo?: number;
  haptic?: boolean;
}

/** Pressable with a subtle press-in scale + optional haptic tick. */
export function Press({ style, scaleTo = 0.97, haptic = true, onPress, accessibilityRole = 'button', ...rest }: PressProps) {
  const state = rest.accessibilityState;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      // Mirror the state as ARIA props so web screen readers announce selection too.
      aria-selected={state?.selected}
      aria-checked={state?.checked}
      {...rest}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && !rest.disabled && { transform: [{ scale: scaleTo }], opacity: 0.92 }]}
    />
  );
}
