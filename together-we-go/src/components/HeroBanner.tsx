import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useLoop } from '@/components/ui/motion';
import { colors, radius, shadowStrong } from '@/theme';

const HEIGHT = 214;

/** Point on the flight arc for t ∈ [0, 1] (a gentle parabola from bottom-left to top-right). */
function arc(t: number, w: number) {
  const x0 = 18;
  const x1 = w - 46;
  const x = x0 + (x1 - x0) * t;
  const y = 186 - 46 * t - 24 * Math.sin(Math.PI * t);
  return { x, y };
}

const SAMPLES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

/**
 * The animated "front page" hero on Explore: a sunrise gradient in the user's
 * theme colours, a plane flying along a dotted route, drifting clouds and a
 * pulsing sun. Content (greeting, title, chips) is passed in as children.
 */
export function HeroBanner({ children }: { children: ReactNode }) {
  const [w, setW] = useState(340);
  const flight = useLoop(7000, { rest: 0.62 });
  const cloudA = useLoop(16000, { rest: 0.3 });
  const cloudB = useLoop(23000, { delay: 1200, rest: 0.7 });
  const sun = useLoop(2600, { pingPong: true, rest: 0 });

  const pts = SAMPLES.map((t) => arc(t, w));
  const angles = SAMPLES.map((t) => {
    const a = arc(Math.max(0, t - 0.02), w);
    const b = arc(Math.min(1, t + 0.02), w);
    return `${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI}deg`;
  });
  const dots = Array.from({ length: 22 }, (_, i) => arc(i / 21, w));

  return (
    <View style={styles.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Sun */}
      <Animated.View
        style={[
          styles.sunGlow,
          {
            left: w - 92,
            transform: [
              {
                scale: sun.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.18],
                }),
              },
            ],
            opacity: sun.interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 0.18],
            }),
          },
        ]}
      />
      <View style={[styles.sun, { left: w - 74 }]} />

      {/* Clouds */}
      <Animated.View
        style={[
          styles.cloudWrap,
          {
            top: 22,
            transform: [
              {
                translateX: cloudA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-80, w + 20],
                }),
              },
            ],
          },
        ]}>
        <Ionicons name="cloud" size={44} color="rgba(255,255,255,0.28)" />
      </Animated.View>
      <Animated.View
        style={[
          styles.cloudWrap,
          {
            top: 92,
            transform: [
              {
                translateX: cloudB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [w + 10, -90],
                }),
              },
            ],
          },
        ]}>
        <Ionicons name="cloud" size={60} color="rgba(255,255,255,0.18)" />
      </Animated.View>

      {/* Route */}
      {dots.map((p, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: p.x + 10,
              top: p.y + 10,
              opacity: 0.25 + (i / dots.length) * 0.45,
            },
          ]}
        />
      ))}
      <View style={[styles.pin, { left: dots[0].x + 4, top: dots[0].y + 4 }]} />
      <View
        style={[
          styles.pinEnd,
          {
            left: dots[dots.length - 1].x + 2,
            top: dots[dots.length - 1].y + 2,
          },
        ]}>
        <Ionicons name="location" size={18} color={colors.accent} />
      </View>

      {/* Plane */}
      <Animated.View
        accessible={false}
        style={[
          styles.plane,
          {
            opacity: flight.interpolate({
              inputRange: [0, 0.06, 0.92, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateX: flight.interpolate({
                  inputRange: SAMPLES,
                  outputRange: pts.map((p) => p.x),
                }),
              },
              {
                translateY: flight.interpolate({
                  inputRange: SAMPLES,
                  outputRange: pts.map((p) => p.y),
                }),
              },
              {
                rotate: flight.interpolate({
                  inputRange: SAMPLES,
                  outputRange: angles,
                }),
              },
            ],
          },
        ]}>
        <MaterialCommunityIcons name="airplane" size={26} color={colors.white} style={{ transform: [{ rotate: '90deg' }] }} />
      </Animated.View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadowStrong,
  },
  sunGlow: {
    position: 'absolute',
    top: 6,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
  },
  sun: {
    position: 'absolute',
    top: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    opacity: 0.9,
  },
  cloudWrap: { position: 'absolute', left: 0 },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  pin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  pinEnd: { position: 'absolute' },
  plane: { position: 'absolute', left: 0, top: 0, width: 26, height: 26 },
  content: {
    flex: 1,
    padding: 18,
    paddingRight: 96,
    justifyContent: 'flex-start',
  },
});
