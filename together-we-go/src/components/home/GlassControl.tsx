import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Press } from '@/components/ui/Press';

/**
 * A small control that floats over the hero photo, on frosted glass. The glass is only the background:
 * the button inside it is at least 44 x 44, and it is a sibling of nothing else clickable (no button inside a button).
 */
export function GlassControl({ children, onPress, label, hint, style }: { children: ReactNode; onPress: () => void; label: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Glass style={[styles.glass, style]}>
      <Press onPress={onPress} style={styles.press} accessibilityLabel={label} accessibilityHint={hint}>
        {children}
      </Press>
    </Glass>
  );
}

const styles = StyleSheet.create({
  // a dark tint under the blur keeps white icons readable on a bright sky
  glass: { height: 44, minWidth: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.22)' },
  press: { height: 44, minWidth: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
