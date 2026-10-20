import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/Glass';
import { nativeDriver, useLoop, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import { useNow } from '@/hooks/useTrip';
import { colors } from '@/theme';
import { partsInTz } from '@/utils/time';

export type TimeOfDay = 'day' | 'night';

/** Hours 19:00–05:59 at the destination count as night. */
export function timeOfDayAt(tz: string, now: number): TimeOfDay {
  const h = Number(partsInTz(now, tz).hhmm.slice(0, 2));
  return h >= 19 || h < 6 ? 'night' : 'day';
}

/** Which half of the day the sky shows: the real one at the destination, unless the person previews the other. */
export interface SkyMode {
  mode: TimeOfDay;
  /** True when the person has picked a half of the day by hand. */
  forced: boolean;
  toggle: () => void;
  /** Go back to following the local time. */
  follow: () => void;
}

export function useSkyMode(tz: string): SkyMode {
  const now = useNow(60000);
  const auto = timeOfDayAt(tz, now);
  const [forced, setForced] = useState<TimeOfDay | null>(null);
  const mode = forced ?? auto;
  return { mode, forced: forced !== null, toggle: () => setForced(mode === 'night' ? 'day' : 'night'), follow: () => setForced(null) };
}

/** Deterministic pseudo-random list so stars sit in the same place every render. */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 43758.5453;
  const b = Math.sin(i * 12.9898 + 4.1) * 24634.6345;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 40, size: 1.5 + ((i * 7) % 3), group: i % 3 };
});

/**
 * The picture behind the top of Home. It is a layer behind the scrolling page (not inside it), so it can do three things:
 *  - drift slower than the content as you scroll (parallax: it moves at half speed),
 *  - stretch when you pull the page down past the top,
 *  - zoom very slowly from 100% to 108% (Ken Burns), over about 18 seconds.
 * With animations off (or the phone's Reduce Motion on) it does none of these: it just scrolls away with the page.
 *
 * On top of the photo: by day a warm glare, a sun and drifting clouds; by night a blue-hour grade with twinkling stars and a moon.
 * A dark gradient at the top and bottom keeps white type and the glass controls readable on any photo.
 * `scrollY` must only ever be driven by the scroll view (see useScrollY), so it is safe to build native-driven transforms from it.
 */
export function SkylineHero({ image, mode, height, scrollY }: { image: string; mode: TimeOfDay; height: number; scrollY: Animated.Value }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const [night] = useState(() => new Animated.Value(mode === 'night' ? 1 : 0));

  useEffect(() => {
    if (!motion) {
      night.setValue(mode === 'night' ? 1 : 0);
      return;
    }
    const anim = Animated.timing(night, { toValue: mode === 'night' ? 1 : 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    anim.start();
    return () => anim.stop();
  }, [mode, night, motion]);

  // Ken Burns: rest at 100% when still.
  const zoom = useLoop(18000, { pingPong: true, rest: 0 });
  const twinkle = [useLoop(1700, { pingPong: true, rest: 0.6 }), useLoop(2300, { pingPong: true, delay: 400, rest: 0.6 }), useLoop(2900, { pingPong: true, delay: 900, rest: 0.6 })];
  const cloudA = useLoop(26000, { rest: 0.2 });
  const cloudB = useLoop(38000, { delay: 3000, rest: 0.7 });

  const dayOpacity = night.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  // Half speed with motion, full speed (= it simply scrolls with the page) without.
  const layer = {
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [0, 1], outputRange: [0, motion ? -0.5 : -1] }) },
      ...(motion ? [{ scale: scrollY.interpolate({ inputRange: [-height, 0], outputRange: [2, 1], extrapolateRight: 'clamp' as const }) }] : []),
    ],
  };
  const skyTop = insets.top + 96;

  return (
    <Animated.View testID="hero-photo" pointerEvents="none" style={[styles.layer, { height }, layer]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View testID="hero-zoom" style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
        <Image source={imageSource(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
      </Animated.View>

      {/* Day: warm light, sun, clouds */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: dayOpacity }]}>
        <LinearGradient colors={['rgba(255,214,120,0.28)', 'rgba(255,255,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.6 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.sunGlow, { top: skyTop - 26 }]} />
        <View style={[styles.sun, { top: skyTop }]} />
        <Animated.View style={[styles.cloud, { top: height * 0.2, transform: [{ translateX: cloudA.interpolate({ inputRange: [0, 1], outputRange: [-120, 520] }) }] }]}>
          <Ionicons name="cloud" size={64} color="rgba(255,255,255,0.38)" />
        </Animated.View>
        <Animated.View style={[styles.cloud, { top: height * 0.32, transform: [{ translateX: cloudB.interpolate({ inputRange: [0, 1], outputRange: [520, -140] }) }] }]}>
          <Ionicons name="cloud" size={44} color="rgba(255,255,255,0.28)" />
        </Animated.View>
      </Animated.View>

      {/* Night: blue-hour grade, stars, moon */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: night }]}>
        <LinearGradient colors={['rgba(5,10,45,0.82)', 'rgba(20,28,85,0.58)', 'rgba(8,10,35,0.72)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,60,160,0.16)' }]} />
        {STARS.map((s, i) => (
          <Animated.View key={i} style={[styles.star, { left: `${s.x}%`, top: `${s.y + 12}%`, width: s.size, height: s.size, borderRadius: s.size, opacity: twinkle[s.group].interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }]} />
        ))}
        <View style={[styles.moonGlow, { top: skyTop - 22 }]} />
        <View style={[styles.moon, { top: skyTop - 4 }]}>
          <Ionicons name="moon" size={26} color="#FFF4C7" />
        </View>
      </Animated.View>

      {/* The scrim: dark at the top (for the controls) and strong at the bottom (for the white headline) */}
      <LinearGradient colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.84)']} locations={[0, 0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** The day / night chip, on glass: tap to preview the other half of the day, long press to follow the local time again. */
export function SkyChip({ sky }: { sky: SkyMode }) {
  const night = sky.mode === 'night';
  return (
    <Glass style={styles.chipGlass}>
      <Press
        onPress={sky.toggle}
        onLongPress={sky.follow}
        style={styles.chip}
        accessibilityLabel={night ? 'Showing night. Tap for day' : 'Showing day. Tap for night'}
        accessibilityHint="Long press to follow the local time again">
        <Ionicons name={night ? 'moon' : 'sunny'} size={16} color={colors.white} />
        <T variant="small" weight="bold" color={colors.white}>
          {night ? 'Night' : 'Day'}
          {sky.forced ? '' : ' · live'}
        </T>
      </Press>
    </Glass>
  );
}

const styles = StyleSheet.create({
  // The layer is as wide as the page and sits behind the scroll view; it is taller than it needs to be only through its own scale.
  layer: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: '#0B1020' },
  sun: { position: 'absolute', right: 40, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFE08A', opacity: 0.9 },
  sunGlow: { position: 'absolute', right: 14, width: 98, height: 98, borderRadius: 49, backgroundColor: '#FFD25E', opacity: 0.26 },
  cloud: { position: 'absolute', left: 0 },
  star: { position: 'absolute', backgroundColor: '#FFFFFF' },
  moon: { position: 'absolute', right: 38, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,244,199,0.14)' },
  moonGlow: { position: 'absolute', right: 16, width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,244,199,0.14)' },
  chipGlass: { height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.22)' },
  chip: { height: 44, minWidth: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
