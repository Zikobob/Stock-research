/**
 * Celebrations are rare on purpose: a quiz win, a poll or activity locking in, a budget settled, "1 day to go",
 * and the end of "Make it yours". `celebrate()` does a haptic tick plus, depending on the person's Effects
 * setting (Chill, Lively, Max) and the Reduce Motion switches, a burst of confetti.
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { create } from 'zustand';

import { effectiveMotion, useOsReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

import { toast } from './feedback';
import { nativeDriver } from './motion';
import { tap } from './Press';

export interface Piece {
  /** Where it starts across the width, 0 to 1. */
  x: number;
  /** Sideways drift as a fraction of the width. */
  drift: number;
  /** How far it rises before it falls, as a fraction of the height. */
  rise: number;
  /** How far it falls, as a fraction of the height. */
  fall: number;
  /** Turns while falling. */
  spin: number;
  /** When it starts, 0 to 0.2 of the whole burst. */
  delay: number;
  size: number;
  color: number;
  round: boolean;
}

/** The same pieces every time for a given count (a tiny seeded generator), so a burst can be tested. */
export function confettiPieces(count: number): Piece[] {
  let seed = 7919;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({
    x: 0.1 + rnd() * 0.8,
    drift: (rnd() - 0.5) * 0.5,
    rise: 0.12 + rnd() * 0.28,
    fall: 0.75 + rnd() * 0.35,
    spin: 1 + rnd() * 3,
    delay: rnd() * 0.2,
    size: 7 + rnd() * 7,
    color: Math.floor(rnd() * 5),
    round: rnd() > 0.65,
  }));
}

/** How many pieces each Effects setting throws (Chill throws none). */
export const PIECES = { chill: 0, lively: 36, max: 90 } as const;

interface Burst {
  id: number;
  count: number;
}
const useBurst = create<{ burst: Burst | null }>(() => ({ burst: null }));

/**
 * Celebrates. Always ticks the haptic; throws confetti unless Effects is Chill or animations are off.
 * If `message` is given it is shown as a toast too, so a calm setting still gets a clear "well done".
 */
export function celebrate(message?: string) {
  tap('success');
  const { personal } = useAppStore.getState();
  const count = PIECES[personal.effects] ?? PIECES.lively;
  const canMove = effectiveMotion(personal.motion, useOsReduceMotion.getState().on);
  if (count > 0 && canMove) useBurst.setState({ burst: { id: Date.now(), count } });
  if (message) toast(message, { icon: 'sparkles' });
  return count > 0 && canMove;
}

/** Draws the confetti above everything. Render once, near the root. */
export function ConfettiHost() {
  const burst = useBurst((s) => s.burst);
  return burst ? <Rain key={burst.id} count={burst.count} /> : null;
}

function Rain({ count }: { count: number }) {
  const { width, height } = useWindowDimensions();
  const [t] = useState(() => new Animated.Value(0));
  const [pieces] = useState(() => confettiPieces(count));
  const palette = [colors.accent, colors.text, colors.accentText, colors.white, colors.yellow];

  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: nativeDriver });
    a.start(({ finished }) => finished && useBurst.setState({ burst: null }));
    return () => a.stop();
  }, [t]);

  return (
    <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x * width,
            top: height * 0.35,
            width: p.size,
            height: p.round ? p.size : p.size * 1.7,
            borderRadius: p.round ? p.size : 2,
            backgroundColor: palette[p.color],
            opacity: t.interpolate({ inputRange: [0, p.delay, p.delay + 0.02, 0.8, 1], outputRange: [0, 0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift * width] }) },
              { translateY: t.interpolate({ inputRange: [0, p.delay + 0.25, 1], outputRange: [0, -p.rise * height, p.fall * height] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${Math.round(p.spin * 360)}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill as object, zIndex: 2000, elevation: 2000 },
});
