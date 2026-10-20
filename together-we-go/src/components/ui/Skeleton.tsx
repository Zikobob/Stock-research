import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

import { useLoop } from './motion';

/**
 * A grey block that pulses where content will appear. Give it the same size as the real thing so nothing jumps when the
 * data arrives. It sits still when animations are off.
 */
export function Skeleton({ width = '100%', height = 16, corner = radius.card, style }: { width?: DimensionValue; height?: number; corner?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(1100, { pingPong: true, rest: 0.4 });
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: corner, backgroundColor: colors.primarySoft, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }, style]}
    />
  );
}
