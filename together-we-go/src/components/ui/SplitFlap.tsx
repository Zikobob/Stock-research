import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { nativeDriver, useMotion } from './motion';

/** One digit on a black tile that flips like a departures board when it changes. */
function Tile({ ch, size }: { ch: string; size: number }) {
  const motion = useMotion();
  const [state, setState] = useState({ cur: ch, prev: ch });
  const [t] = useState(() => new Animated.Value(1));
  // when the character changes, keep the old one so it can flip away
  if (state.cur !== ch) setState({ cur: ch, prev: state.cur });
  useEffect(() => {
    if (!motion || state.prev === state.cur) {
      t.setValue(1);
      return;
    }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [state, motion, t]);

  const font = Math.round(size * 0.74);
  const face = { fontFamily: fonts.mono, fontSize: font, lineHeight: size, color: colors.bg, textAlign: 'center' as const, includeFontPadding: false };
  const flipping = motion && state.prev !== state.cur;
  return (
    <View style={[styles.tile, { width: Math.round(size * 0.68), height: size, borderRadius: Math.round(size * 0.1) }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: t.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] }), transform: [{ scaleY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }) }] }]}>
        <Text style={face} allowFontScaling={false}>
          {ch}
        </Text>
      </Animated.View>
      {flipping ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: t.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] }), transform: [{ scaleY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) }] }]}>
          <Text style={face} allowFontScaling={false}>
            {state.prev}
          </Text>
        </Animated.View>
      ) : null}
      <View pointerEvents="none" style={[styles.hinge, { top: size / 2 - 1 }]} />
    </View>
  );
}

/**
 * A number on departure-board tiles: each digit is white-on-ink and flips to the next one when the number changes
 * (a ticking countdown). Still when animations are off. `size` is the height of a tile.
 */
export function SplitFlap({ value, size = 64 }: { value: number | string; size?: number }) {
  const chars = String(value).split('');
  return (
    <View accessible accessibilityLabel={String(value)} style={{ flexDirection: 'row', gap: Math.max(3, Math.round(size / 16)) }}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <Tile key={chars.length - i} ch={ch} size={size} />
        ) : (
          <Text key={chars.length - i} allowFontScaling={false} style={{ fontFamily: fonts.mono, fontSize: Math.round(size * 0.6), lineHeight: size, color: colors.ink }}>
            {ch}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.ink, overflow: 'hidden', justifyContent: 'center' },
  hinge: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.bg, opacity: 0.55 },
});
