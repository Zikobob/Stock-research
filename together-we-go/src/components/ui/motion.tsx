/**
 * Small motion kit built on React Native's Animated API.
 * Every animation respects the "Animations" switch in Make it yours / Settings
 * (people who get motion-sick, or just want a calmer app, can turn it off).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

export const nativeDriver = Platform.OS !== 'web';

export function useMotion() {
  return useAppStore((s) => s.personal.motion);
}

/** Fades + slides its children in once, after `delay` ms. Use for staggered entrances. */
export function FadeIn({
  children,
  delay = 0,
  from = 'up',
  distance = 18,
  duration = 480,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: 'up' | 'down' | 'left' | 'right' | 'scale';
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const motion = useMotion();
  const [v] = useState(() => new Animated.Value(motion ? 0 : 1));
  useEffect(() => {
    if (!motion) return;
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [v, delay, duration, motion]);

  const offset = v.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'down' || from === 'right' ? -distance : distance, 0],
  });
  const transform =
    from === 'scale'
      ? [
          {
            scale: v.interpolate({
              inputRange: [0, 1],
              outputRange: [0.86, 1],
            }),
          },
        ]
      : from === 'left' || from === 'right'
        ? [{ translateX: offset }]
        : [{ translateY: offset }];
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

/** A 0 → 1 value that loops forever (or sits at `rest` when motion is off). */
export function useLoop(duration: number, { delay = 0, rest = 0.5, pingPong = false }: { delay?: number; rest?: number; pingPong?: boolean } = {}) {
  const motion = useMotion();
  const [v] = useState(() => new Animated.Value(motion ? 0 : rest));
  useEffect(() => {
    if (!motion) {
      v.setValue(rest);
      return;
    }
    v.setValue(0);
    const one = Animated.timing(v, {
      toValue: 1,
      duration,
      easing: pingPong ? Easing.inOut(Easing.sin) : Easing.linear,
      useNativeDriver: nativeDriver,
    });
    const seq = pingPong
      ? Animated.sequence([
          one,
          Animated.timing(v, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: nativeDriver,
          }),
        ])
      : Animated.sequence([
          one,
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: nativeDriver,
          }),
        ]);
    const loop = Animated.loop(seq);
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [v, duration, delay, rest, pingPong, motion]);
  return v;
}

/** Gently bobs its children up and down. */
export function Float({ children, amount = 6, duration = 2200, delay = 0, style }: { children: ReactNode; amount?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(duration, { delay, pingPong: true });
  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: [-amount / 2, amount / 2],
  });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Soft pulsing glow (scale + opacity) — great behind icons and "live" dots. */
export function Pulse({ children, scale = 1.12, duration = 1400, style }: { children?: ReactNode; scale?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(duration, { pingPong: true, rest: 0 });
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.75],
          }),
          transform: [
            {
              scale: v.interpolate({
                inputRange: [0, 1],
                outputRange: [1, scale],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
