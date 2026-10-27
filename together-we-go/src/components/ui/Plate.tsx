import { useState, type ReactNode } from 'react';
import { Animated, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, plateOffset, radius } from '@/theme';

import { nativeDriver, useMotion } from './motion';
import { tap } from './Press';

/**
 * The hard "plate" under a thing: a solid block of ink (the accent at night) that sticks out to the right and below,
 * like a printed card sitting on a second card. It replaces the soft drop shadow.
 * The wrapper is `offset` wider and taller than what it holds, so layouts stay put.
 */
export function Plate({ children, offset = plateOffset, color = colors.plate, corner = radius.card, style }: { children: ReactNode; offset?: number; color?: string; corner?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: offset, top: offset, right: 0, bottom: 0, borderRadius: corner, backgroundColor: color }} />
      {children}
    </View>
  );
}

export interface PlatePressProps extends Omit<PressableProps, 'style'> {
  /** The face you press: its colour, outline, size and corner. */
  style?: StyleProp<ViewStyle>;
  /** Margins, flex and alignment belong here, on the wrapper around face and plate. */
  wrapperStyle?: StyleProp<ViewStyle>;
  offset?: number;
  color?: string;
  corner?: number;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A button that pushes down onto its plate: pressing slides the face right and down by the plate's offset until it
 * sits flush, and letting go springs it back. Only transform is animated (native driver), and with animations off
 * it simply jumps.
 */
export function PlatePress({ style, wrapperStyle, offset = plateOffset, color = colors.plate, corner = radius.button, haptic = true, onPress, onPressIn, onPressOut, accessibilityRole = 'button', ...rest }: PlatePressProps) {
  const motion = useMotion();
  const [t] = useState(() => new Animated.Value(0));
  const move = (to: number, spring: boolean) => {
    if (!motion) t.setValue(to);
    else if (spring) Animated.spring(t, { toValue: to, speed: 30, bounciness: 9, useNativeDriver: nativeDriver }).start();
    else Animated.timing(t, { toValue: to, duration: 70, useNativeDriver: nativeDriver }).start();
  };
  const state = rest.accessibilityState;
  return (
    <Plate offset={offset} color={color} corner={corner} style={wrapperStyle}>
      <AnimatedPressable
        accessibilityRole={accessibilityRole}
        aria-selected={state?.selected}
        aria-checked={state?.checked}
        {...rest}
        onPressIn={(e) => {
          move(1, false);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          move(0, true);
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic) tap();
          onPress?.(e);
        }}
        style={[style, { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) }] }]}
      />
    </Plate>
  );
}
