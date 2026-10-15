import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { headingOf, K, layout, PanoramaScene, posForHeading } from '@/components/panorama/Scene';
import { timeOfDayAt } from '@/components/SkylineHero';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useNow } from '@/hooks/useTrip';
import { PANORAMAS, panoById } from '@/data/panoramas';
import { MAX_WIDTH, colors } from '@/theme';

const WIND = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const wind = (deg: number) => WIND[Math.round(deg / 22.5) % 16];
/** Smallest signed angle from a to b, in degrees. */
const angleDiff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

export default function PanoramaScreen() {
  const { city, focus } = useLocalSearchParams<{ city?: string; focus?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const S = Math.min(width, MAX_WIDTH);
  const H = height;
  const now = useNow(60000);

  const [cityId, setCityId] = useState(panoById(city)?.id ?? PANORAMAS[0].id);
  const pano = panoById(cityId) ?? PANORAMAS[0];
  const startLm = pano.landmarks.find((l) => l.id === focus) ?? pano.landmarks[0];
  const [forced, setForced] = useState<'day' | 'night' | null>(null);
  const [auto, setAuto] = useState(true);
  const [heading, setHeading] = useState(startLm.heading);
  const mode = forced ?? timeOfDayAt(pano.tz, now);

  const [pos] = useState(() => new Animated.Value(posForHeading(startLm.heading, S)));
  const [night] = useState(() => new Animated.Value(mode === 'night' ? 1 : 0));
  const posRef = useRef(posForHeading(startLm.heading, S));
  const velRef = useRef(0);
  const dragRef = useRef(false);
  const busyRef = useRef(false);
  const idleRef = useRef(1000);
  const autoRef = useRef(true);
  const gestureRef = useRef({ x: 0, pos: 0, last: 0 });

  // Keep the mirrors of state that the animation loop and gesture handlers read.
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);
  useEffect(() => {
    const id = pos.addListener(({ value }) => {
      posRef.current = value;
    });
    return () => pos.removeListener(id);
  }, [pos]);

  // Day ↔ night cross-fade.
  useEffect(() => {
    const anim = Animated.timing(night, { toValue: mode === 'night' ? 1 : 0, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [mode, night]);

  // One ~30 fps loop: coasting after a flick, gentle auto-rotation when idle, and the compass readout.
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      if (!dragRef.current && !busyRef.current) {
        velRef.current *= 0.94;
        idleRef.current++;
        const idle = idleRef.current > 105;
        const step = velRef.current + (autoRef.current && idle && Math.abs(velRef.current) < 0.2 ? 0.45 : 0);
        if (Math.abs(step) > 0.01) pos.setValue(posRef.current + step);
      }
      if (tick % 4 === 0) setHeading(Math.round(headingOf(posRef.current, S)) % 360);
    }, 33);
    return () => clearInterval(id);
  }, [pos, S]);

  const glide = (delta: number) => {
    busyRef.current = true;
    idleRef.current = 0;
    velRef.current = 0;
    Animated.timing(pos, { toValue: posRef.current + delta, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      busyRef.current = false;
    });
  };
  const nudge = (dir: 1 | -1) => {
    tap();
    glide((dir * S * 0.45) / K.mid);
  };
  const lookAt = (deg: number) => {
    tap();
    const period = layout(S).far;
    const mid = layout(S).mid;
    const want = (angleDiff(headingOf(posRef.current, S), deg) / 360) * mid;
    glide((want / K.mid) % period);
  };
  const pick = (id: string) => {
    tap();
    const p = panoById(id);
    if (!p) return;
    setCityId(p.id);
    setForced(null);
    const h = p.landmarks[0].heading;
    setHeading(h);
    const target = posForHeading(h, S);
    posRef.current = target;
    velRef.current = 0;
    pos.setValue(target);
  };

  const near = pano.landmarks.find((l) => Math.abs(angleDiff(heading, l.heading)) < 13);
  const top = insets.top + 10;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View
        style={{ width: S, height: H, overflow: 'hidden', backgroundColor: '#05070F' }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          dragRef.current = true;
          busyRef.current = false;
          idleRef.current = 0;
          velRef.current = 0;
          gestureRef.current = { x: e.nativeEvent.pageX, pos: posRef.current, last: e.nativeEvent.pageX };
        }}
        onResponderMove={(e) => {
          const g = gestureRef.current;
          const x = e.nativeEvent.pageX;
          idleRef.current = 0;
          velRef.current = -(x - g.last) / K.mid;
          g.last = x;
          pos.setValue(g.pos - (x - g.x) / K.mid);
        }}
        onResponderRelease={() => {
          dragRef.current = false;
        }}
        onResponderTerminate={() => {
          dragRef.current = false;
        }}>
        <PanoramaScene key={pano.id} pano={pano} night={night} pos={pos} S={S} H={H} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} style={[styles.fade, { top: 0, height: 200 }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={[styles.fade, { bottom: 0, height: 330 }]} />

        {/* Top bar */}
        <View style={[styles.top, { top }]}>
          <Press onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} style={styles.round} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color={colors.white} />
          </Press>
          <View style={{ flex: 1 }} />
          <Press onPress={() => setAuto((a) => !a)} style={styles.chip} accessibilityRole="switch" accessibilityState={{ checked: auto }} accessibilityLabel="Auto rotate">
            <Ionicons name={auto ? 'sync' : 'pause'} size={14} color={colors.white} />
            <T variant="micro" weight="bold" color={colors.white}>
              {auto ? 'Auto' : 'Paused'}
            </T>
          </Press>
          <Press
            onPress={() => {
              tap();
              setForced(mode === 'night' ? 'day' : 'night');
            }}
            onLongPress={() => setForced(null)}
            style={[styles.chip, { backgroundColor: mode === 'night' ? '#1B2250' : 'rgba(255,255,255,0.28)' }]}
            accessibilityLabel={mode === 'night' ? 'Night view. Switch to day' : 'Day view. Switch to night'}
            accessibilityHint="Long press to follow local time">
            <Ionicons name={mode === 'night' ? 'moon' : 'sunny'} size={15} color={mode === 'night' ? '#FFE9A8' : '#FFFFFF'} />
            <T variant="micro" weight="bold" color={colors.white}>
              {mode === 'night' ? 'Night · lights on' : 'Day'}
              {forced ? '' : ' · live'}
            </T>
          </Press>
        </View>

        {/* Title + compass */}
        <View style={[styles.titleBlock, { top: top + 54 }]} pointerEvents="none">
          <T variant="kicker" color="rgba(255,255,255,0.85)">
            {pano.emoji} {pano.country}
          </T>
          <T variant="display" color={colors.white} style={styles.titleText} accessibilityRole="header">
            {pano.name}
          </T>
          <View style={styles.compass}>
            <Ionicons name="compass-outline" size={13} color={colors.white} />
            <T variant="micro" weight="bold" color={colors.white}>
              360° · {wind(heading)} {heading}°
            </T>
          </View>
        </View>

        {/* Arrows */}
        <Press onPress={() => nudge(-1)} style={[styles.arrow, { left: 10 }]} accessibilityLabel="Look left">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Press>
        <Press onPress={() => nudge(1)} style={[styles.arrow, { right: 10 }]} accessibilityLabel="Look right">
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </Press>

        {/* Bottom: callout, landmark jumps, city picker */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.callout} accessibilityLiveRegion="polite">
            {near ? (
              <>
                <T variant="title" weight="extrabold" color={colors.white}>
                  {near.name}
                </T>
                <T variant="small" color="rgba(255,255,255,0.9)">
                  {near.fact}
                </T>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="hand-left-outline" size={18} color={colors.white} />
                <T variant="small" weight="semibold" color={colors.white} style={{ flex: 1 }}>
                  Drag to look around — it wraps all the way back to where you started.
                </T>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ flexGrow: 0 }}>
            {pano.landmarks.map((l) => (
              <Press key={l.id} onPress={() => lookAt(l.heading)} style={[styles.lm, near?.id === l.id && { backgroundColor: colors.accent }]} accessibilityLabel={`Look at ${l.name}`}>
                <Ionicons name="locate" size={13} color={near?.id === l.id ? colors.onAccent : colors.white} />
                <T variant="micro" weight="bold" color={near?.id === l.id ? colors.onAccent : colors.white}>
                  {l.name}
                </T>
              </Press>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ flexGrow: 0 }}>
            {PANORAMAS.map((p) => {
              const on = p.id === pano.id;
              return (
                <Press
                  key={p.id}
                  onPress={() => pick(p.id)}
                  style={[styles.city, on && { backgroundColor: colors.white }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.name} 360 degree view`}>
                  <T style={{ fontSize: 16, lineHeight: 20 }}>{p.emoji}</T>
                  <T variant="small" weight="bold" color={on ? '#111111' : colors.white}>
                    {p.name}
                  </T>
                </Press>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const glass = 'rgba(20,22,32,0.5)';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: glass, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 999, backgroundColor: glass },
  titleBlock: { position: 'absolute', left: 20, right: 20, gap: 2 },
  titleText: { fontSize: 52, lineHeight: 56, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  compass: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: glass },
  arrow: { position: 'absolute', top: '46%', width: 40, height: 40, borderRadius: 20, backgroundColor: glass, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10 },
  callout: { marginHorizontal: 16, padding: 14, borderRadius: 20, backgroundColor: glass, gap: 4, minHeight: 58, justifyContent: 'center' },
  row: { gap: 8, paddingHorizontal: 16 },
  lm: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: glass },
  city: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 999, backgroundColor: glass },
});
