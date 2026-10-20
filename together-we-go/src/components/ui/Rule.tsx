import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, line } from '@/theme';

/** A solid ink line, like the rules in a newspaper: it divides one part of a page from the next. */
export function Rule({ style, weight = line }: { style?: StyleProp<ViewStyle>; weight?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no" style={[{ height: weight, backgroundColor: colors.ink }, style]} />;
}

/** A dashed line of tear-off dots, as between the two halves of a ticket. */
export function Perforation({ style, color = colors.ink }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={[{ flexDirection: 'row', height: 2, overflow: 'hidden', gap: 5 }, style]}>
      {Array.from({ length: 90 }, (_, i) => (
        <View key={i} style={{ width: 6, height: 2, backgroundColor: color, flexShrink: 0 }} />
      ))}
    </View>
  );
}
