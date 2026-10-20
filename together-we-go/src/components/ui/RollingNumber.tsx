import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { T, type TProps } from './T';
import { nativeDriver, useMotion } from './motion';

const LINE: Partial<Record<NonNullable<TProps['variant']>, number>> = { hero: 96, numeral: 44, numeralSm: 32, display: 48, headline: 32 };

/** One character that rolls up out of sight while the next one rolls in from below, whenever it changes. */
function Roll({ ch, variant, color }: { ch: string; variant: NonNullable<TProps['variant']>; color?: string }) {
  const motion = useMotion();
  const [state, setState] = useState({ cur: ch, prev: ch });
  const [t] = useState(() => new Animated.Value(1));
  // when the character changes, remember the old one so it can roll away
  if (state.cur !== ch) setState({ cur: ch, prev: state.cur });
  useEffect(() => {
    if (!motion || state.prev === state.cur) {
      t.setValue(1);
      return;
    }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [state, motion, t]);

  const h = LINE[variant] ?? 40;
  const rolling = motion && state.prev !== state.cur;
  return (
    <View style={{ height: h, overflow: 'hidden' }}>
      <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [h * 0.7, 0] }) }] }}>
        <T variant={variant} color={color}>
          {ch}
        </T>
      </Animated.View>
      {rolling ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.7] }) }] }]}>
          <T variant={variant} color={color}>
            {state.prev}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A number whose digits roll when it changes: a ticking countdown, a budget that moves. Static when animations are off. */
export function RollingNumber({ value, variant = 'hero', color }: { value: number | string; variant?: NonNullable<TProps['variant']>; color?: string }) {
  const chars = String(value).split('');
  return (
    <View accessible accessibilityLabel={String(value)} style={{ flexDirection: 'row' }}>
      {chars.map((ch, i) => (
        <Roll key={chars.length - i} ch={ch} variant={variant} color={color} />
      ))}
    </View>
  );
}
