import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nativeDriver, useLoop, useMotion } from '@/components/ui/motion';
import { PlatePress } from '@/components/ui/Plate';
import { imageSource } from '@/data/images';
import { useNow } from '@/hooks/useTrip';
import { colors, line, radius } from '@/theme';
import { partsInTz } from '@/utils/time';

export type TimeOfDay = 'day' | 'night';

/** Hours 19:00–05:59 at the destination count as night. */
export function timeOfDayAt(tz: string, now: number): TimeOfDay {
  const h = Number(partsInTz(now, tz).hhmm.slice(0, 2));
  return h >= 19 || h < 6 ? 'night' : 'day';
}

/** Deterministic pseudo-random list so stars sit in the same place every render. */
const STARS = Array.from({ length: 30 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 43758.5453;
  const b = Math.sin(i * 12.9898 + 4.1) * 24634.6345;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 52, size: 2 + ((i * 7) % 3), group: i % 3 };
});

/** How far the photo slides down while the page scrolls up (the photo is that much taller than its frame, so no gap shows). */
const PARALLAX = 44;
/** The slow zoom: from the photo as framed to 8% closer. */
const ZOOM = 1.08;

/**
 * The photo at the top of Home. It follows the day and night of the trip's city: by day a flat sun and drifting clouds; by
 * night a dark blue wash with square stars and a moon. The photo zooms very slowly (1.0 to 1.08) and, when `scrollY` is
 * given, slides against the scroll for depth. Both stop when animations are off. The outlined square at the right previews the other half of the day.
 * Children are drawn on top (the controls).
 */
export function SkylineHero({ image, tz, height, scrollY, children }: { image: string; tz: string; height: number; scrollY?: Animated.Value; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const now = useNow(60000);
  const auto = timeOfDayAt(tz, now);
  const [forced, setForced] = useState<TimeOfDay | null>(null);
  const mode = forced ?? auto;
  const [night] = useState(() => new Animated.Value(auto === 'night' ? 1 : 0));

  useEffect(() => {
    const to = mode === 'night' ? 1 : 0;
    if (!motion) {
      night.setValue(to);
      return;
    }
    const anim = Animated.timing(night, { toValue: to, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    anim.start();
    return () => anim.stop();
  }, [mode, night, motion]);

  const zoom = useLoop(20000, { pingPong: true, rest: 0 });
  const twinkle = [useLoop(1700, { pingPong: true, rest: 0.6 }), useLoop(2300, { pingPong: true, delay: 400, rest: 0.6 }), useLoop(2900, { pingPong: true, delay: 900, rest: 0.6 })];
  const cloudA = useLoop(30000, { rest: 0.2 });
  const cloudB = useLoop(44000, { delay: 3000, rest: 0.7 });

  const dayOpacity = night.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const slide = motion && scrollY ? scrollY.interpolate({ inputRange: [0, height], outputRange: [0, PARALLAX], extrapolate: 'clamp' }) : 0;

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: colors.ink }}>
      <Animated.View
        testID="hero-photo"
        style={{ position: 'absolute', left: 0, right: 0, top: -PARALLAX, height: height + PARALLAX, transform: [{ translateY: slide }, { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, ZOOM] }) }] }}>
        <Image source={imageSource(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
      </Animated.View>

      {/* Day: a flat sun and two clouds */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: dayOpacity }]}>
        <View style={styles.sun} />
        <Animated.View style={[styles.cloud, { top: height * 0.17, transform: [{ translateX: cloudA.interpolate({ inputRange: [0, 1], outputRange: [-120, 520] }) }] }]}>
          <Ionicons name="cloud" size={60} color={colors.white} style={{ opacity: 0.55 }} />
        </Animated.View>
        <Animated.View style={[styles.cloud, { top: height * 0.31, transform: [{ translateX: cloudB.interpolate({ inputRange: [0, 1], outputRange: [520, -140] }) }] }]}>
          <Ionicons name="cloud" size={42} color={colors.white} style={{ opacity: 0.4 }} />
        </Animated.View>
      </Animated.View>

      {/* Night: a dark blue wash (a flat overlay on the photo), square stars and a moon */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: night }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,10,42,0.62)' }]} />
        {STARS.map((s, i) => (
          <Animated.View key={i} style={[styles.star, { left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: twinkle[s.group].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
        ))}
        <View style={styles.moon}>
          <View style={styles.moonBite} />
        </View>
      </Animated.View>

      {/* the one scrim: it keeps the controls above and the ticket below readable on any photo */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      {children}

      <PlatePress
        onPress={() => setForced(mode === 'night' ? 'day' : 'night')}
        onLongPress={() => setForced(null)}
        accessibilityLabel={mode === 'night' ? 'Showing night. Tap for day' : 'Showing day. Tap for night'}
        accessibilityHint="Long press to follow the local time again"
        offset={3}
        corner={radius.button}
        wrapperStyle={[styles.toggleWrap, { top: insets.top + 64 }]}
        style={styles.toggle}>
        <Ionicons name={mode === 'night' ? 'moon' : 'sunny'} size={20} color={colors.ink} />
        {forced ? null : <View style={styles.live} />}
      </PlatePress>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', right: 92, top: 84, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.yellow, borderWidth: line, borderColor: colors.black },
  cloud: { position: 'absolute', left: 0 },
  star: { position: 'absolute', backgroundColor: colors.white },
  // a flat crescent: a cream disc with a dark-blue disc biting into it
  moon: { position: 'absolute', right: 92, top: 84, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, overflow: 'hidden', borderWidth: line, borderColor: colors.black },
  moonBite: { position: 'absolute', left: 14, top: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgb(18,22,64)' },
  toggleWrap: { position: 'absolute', right: 19 },
  toggle: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  live: { position: 'absolute', top: -5, right: -5, width: 12, height: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink, borderRadius: 3 },
});
