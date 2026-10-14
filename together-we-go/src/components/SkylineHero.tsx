import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { nativeDriver, useLoop } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNow } from '@/hooks/useTrip';
import { colors } from '@/theme';
import { partsInTz } from '@/utils/time';

export type TimeOfDay = 'day' | 'night';

/** Hours 19:00–05:59 at the destination count as night. */
export function timeOfDayAt(tz: string, now: number): TimeOfDay {
  const h = Number(partsInTz(now, tz).hhmm.slice(0, 2));
  return h >= 19 || h < 6 ? 'night' : 'day';
}

/** Deterministic pseudo-random list so stars sit in the same place every render. */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 43758.5453;
  const b = Math.sin(i * 12.9898 + 4.1) * 24634.6345;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 52, size: 1.5 + ((i * 7) % 3), group: i % 3 };
});

/**
 * Photo hero that follows the day/night cycle of the trip’s city: by day a warm sky glare, a sun and drifting
 * clouds; by night the photo is graded to blue hour with twinkling stars and a moon. The sun/moon chip lets you
 * preview the other half of the day. Children are drawn on top (header buttons, headline…).
 */
export function SkylineHero({ image, tz, height, children }: { image: string; tz: string; height: number; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const now = useNow(60000);
  const auto = timeOfDayAt(tz, now);
  const [forced, setForced] = useState<TimeOfDay | null>(null);
  const mode = forced ?? auto;
  const [night] = useState(() => new Animated.Value(auto === 'night' ? 1 : 0));

  useEffect(() => {
    const anim = Animated.timing(night, { toValue: mode === 'night' ? 1 : 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    anim.start();
    return () => anim.stop();
  }, [mode, night]);

  const zoom = useLoop(18000, { pingPong: true });
  const twinkle = [useLoop(1700, { pingPong: true, rest: 0.6 }), useLoop(2300, { pingPong: true, delay: 400, rest: 0.6 }), useLoop(2900, { pingPong: true, delay: 900, rest: 0.6 })];
  const cloudA = useLoop(26000, { rest: 0.2 });
  const cloudB = useLoop(38000, { delay: 3000, rest: 0.7 });

  const dayOpacity = night.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: '#0B1020' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.14] }) }] }]}>
        <Image source={imageSource(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
      </Animated.View>

      {/* Day: warm light, sun, clouds */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: dayOpacity }]}>
        <LinearGradient colors={['rgba(255,214,120,0.30)', 'rgba(255,255,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.6 }} style={StyleSheet.absoluteFill} />
        <View style={styles.sunGlow} />
        <View style={styles.sun} />
        <Animated.View style={[styles.cloud, { top: height * 0.16, transform: [{ translateX: cloudA.interpolate({ inputRange: [0, 1], outputRange: [-120, 520] }) }] }]}>
          <Ionicons name="cloud" size={64} color="rgba(255,255,255,0.38)" />
        </Animated.View>
        <Animated.View style={[styles.cloud, { top: height * 0.3, transform: [{ translateX: cloudB.interpolate({ inputRange: [0, 1], outputRange: [520, -140] }) }] }]}>
          <Ionicons name="cloud" size={44} color="rgba(255,255,255,0.28)" />
        </Animated.View>
      </Animated.View>

      {/* Night: blue-hour grade, stars, moon */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: night }]}>
        <LinearGradient colors={['rgba(5,10,45,0.82)', 'rgba(20,28,85,0.58)', 'rgba(8,10,35,0.72)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,60,160,0.16)' }]} />
        {STARS.map((s, i) => (
          <Animated.View key={i} style={[styles.star, { left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: s.size, opacity: twinkle[s.group].interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }]} />
        ))}
        <View style={styles.moonGlow} />
        <View style={styles.moon}>
          <Ionicons name="moon" size={26} color="#FFF4C7" />
        </View>
      </Animated.View>

      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      {children}

      <Press
        onPress={() => setForced(mode === 'night' ? 'day' : 'night')}
        onLongPress={() => setForced(null)}
        style={[styles.toggle, { top: insets.top + 62 }]}
        accessibilityLabel={mode === 'night' ? 'Showing night. Tap for day' : 'Showing day. Tap for night'}
        accessibilityHint="Long press to follow the local time again">
        <Ionicons name={mode === 'night' ? 'moon' : 'sunny'} size={13} color={colors.white} />
        <T variant="micro" weight="bold" color={colors.white}>
          {mode === 'night' ? 'Night' : 'Day'}
          {forced ? '' : ' · live'}
        </T>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', right: 34, top: 54, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFE08A', opacity: 0.9 },
  sunGlow: { position: 'absolute', right: 8, top: 28, width: 98, height: 98, borderRadius: 49, backgroundColor: '#FFD25E', opacity: 0.28 },
  cloud: { position: 'absolute', left: 0 },
  star: { position: 'absolute', backgroundColor: '#FFFFFF' },
  moon: { position: 'absolute', right: 32, top: 52, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,244,199,0.14)' },
  moonGlow: { position: 'absolute', right: 10, top: 30, width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,244,199,0.14)' },
  toggle: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.38)' },
});
