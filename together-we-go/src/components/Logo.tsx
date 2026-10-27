import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors, radius } from '@/theme';

import { T } from './ui/T';

/**
 * The brand mark: a square of ink (cream at night) with a take-off plane in paper, and one corner of the theme's accent, like a
 * ticket with its corner clipped. Every colour is a token, so it reads on the paper page, on a photo and in the dark mode.
 * The thin paper-coloured lines around the accent corner keep it apart from the ink in every theme.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const corner = Math.round(size * 0.3);
  const gap = Math.max(1.5, Math.round(size / 20));
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="TogetherWeGo logo"
      style={{ width: size, height: size, borderRadius: Math.min(radius.xs, size * 0.2), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <MaterialCommunityIcons name="airplane-takeoff" size={Math.round(size * 0.54)} color={colors.onPrimary} style={{ marginTop: size * 0.08, marginRight: size * 0.04 }} />
      <View
        style={{ position: 'absolute', top: 0, right: 0, width: corner + gap, height: corner + gap, backgroundColor: colors.accent, borderLeftWidth: gap, borderBottomWidth: gap, borderColor: colors.bg }}
      />
    </View>
  );
}

/** The mark and the name in the serif of the page titles (headline size, never smaller). `size` is the height of the mark. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <LogoMark size={size} />
      <T variant="headline" importantForAccessibility="no" style={{ flexShrink: 1 }}>
        TogetherWeGo
      </T>
    </View>
  );
}
