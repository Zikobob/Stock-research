import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import type { IconName } from './bits';
import { nativeDriver, useMotion } from './motion';
import { T } from './T';

export type StampTone = 'ink' | 'accent' | 'positive' | 'warn' | 'danger' | 'muted';

/** Colours of each tone: an outline and text in the tone, on a pale fill of it (`accent` is solid, like a highlighter). */
export function stampColors(tone: StampTone) {
  switch (tone) {
    case 'accent':
      return { fg: colors.onAccent, bg: colors.accent, line: colors.ink };
    case 'positive':
      return { fg: colors.positive, bg: colors.positiveSoft, line: colors.positive };
    case 'warn':
      return { fg: colors.warn, bg: colors.warnSoft, line: colors.warn };
    case 'danger':
      return { fg: colors.red, bg: colors.redSoft, line: colors.red };
    case 'muted':
      return { fg: colors.textSecondary, bg: 'transparent', line: colors.borderStrong };
    default:
      return { fg: colors.ink, bg: 'transparent', line: colors.ink };
  }
}

/**
 * A rubber stamp: a short word in mono capitals inside an outline, a little crooked on purpose.
 * It is the app's one kind of status label (GOING, LOCKED IN, SETTLED, OVER BUDGET). With `slam` it lands on screen with a thud.
 */
export function Stamp({ label, tone = 'ink', icon, rotate = -3, slam }: { label: string; tone?: StampTone; icon?: IconName; rotate?: number; slam?: boolean }) {
  const c = stampColors(tone);
  const motion = useMotion();
  const [t] = useState(() => new Animated.Value(slam && motion ? 0 : 1));
  useEffect(() => {
    if (!slam || !motion) return;
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [slam, motion, t]);
  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[styles.stamp, { borderColor: c.line, backgroundColor: c.bg, opacity: t, transform: [{ rotate: `${rotate}deg` }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) }] }]}>
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
        <T variant="kicker" color={c.fg} style={{ fontSize: 11 }} importantForAccessibility="no">
          {label}
        </T>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
