import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pick, Readout, Square, Switch } from '@/components/panorama/Chrome';
import { headingOf, K, layout, PanoramaScene, posForHeading } from '@/components/panorama/Scene';
import { timeOfDayAt } from '@/components/SkylineHero';
import { toast } from '@/components/ui/feedback';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import { tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useNow } from '@/hooks/useTrip';
import { PANORAMAS, panoById } from '@/data/panoramas';
import { MAX_WIDTH, colors, line, radius } from '@/theme';

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
  const motion = useMotion(); // off when "Animations" is off or the phone asks apps to reduce motion: no auto-rotation, no coasting, no glides
  const autoOn = auto && motion;
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
  const motionRef = useRef(true);
  const gestureRef = useRef({ x: 0, pos: 0, last: 0 });

  // Keep the mirrors of state that the animation loop and gesture handlers read.
  useEffect(() => {
    motionRef.current = motion;
    autoRef.current = autoOn;
  }, [autoOn, motion]);
  useEffect(() => {
    const id = pos.addListener(({ value }) => {
      posRef.current = value;
    });
    return () => pos.removeListener(id);
  }, [pos]);

  // Day ↔ night cross-fade. `night` and `pos` are mixed with the scene's looping lights (which run on the phone's native driver),
  // and one value cannot be driven both ways: a JS-driven animation on it crashes ("moved to native earlier"). Use `nativeDriver` for both.
  useEffect(() => {
    const anim = Animated.timing(night, { toValue: mode === 'night' ? 1 : 0, duration: motion ? 1200 : 0, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    anim.start();
    return () => anim.stop();
  }, [mode, night, motion]);

  // One ~30 fps loop: coasting after a flick, gentle auto-rotation when idle, and the compass readout.
  // It only runs while this screen is the one being looked at, so it costs nothing behind another screen.
  useFocusEffect(
    useCallback(() => {
      let tick = 0;
      const id = setInterval(() => {
        tick++;
        if (!dragRef.current && !busyRef.current) {
          velRef.current = motionRef.current ? velRef.current * 0.94 : 0;
          idleRef.current++;
          const idle = idleRef.current > 105;
          const step = velRef.current + (autoRef.current && idle && Math.abs(velRef.current) < 0.2 ? 0.45 : 0);
          if (Math.abs(step) > 0.01) pos.setValue(posRef.current + step);
        }
        if (tick % 4 === 0) setHeading(Math.round(headingOf(posRef.current, S)) % 360);
      }, 33);
      return () => clearInterval(id);
    }, [pos, S]),
  );

  const glide = (delta: number) => {
    idleRef.current = 0;
    velRef.current = 0;
    if (!motion) {
      pos.setValue(posRef.current + delta); // no sweeping animation when motion is off
      return;
    }
    busyRef.current = true;
    Animated.timing(pos, { toValue: posRef.current + delta, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start(() => {
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
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0)']} style={[styles.fade, { top: 0, height: 270 }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={[styles.fade, { bottom: 0, height: 360 }]} />

        {/* Top bar: outlined squares on the scene */}
        <View style={[styles.top, { top }]}>
          <Square icon="arrow-back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} />
          <View style={{ flex: 1 }} />
          <Switch
            role="switch"
            on={autoOn}
            icon={autoOn ? 'sync' : 'pause'}
            text={autoOn ? 'Auto' : 'Paused'}
            label="Auto rotate"
            onPress={() => (motion ? setAuto((a) => !a) : toast('Animations are off, so the view only moves when you drag it', { icon: 'accessibility-outline' }))}
          />
          <Switch
            icon={mode === 'night' ? 'moon' : 'sunny'}
            text={mode === 'night' ? 'Night' : 'Day'}
            label={mode === 'night' ? 'Night view. Switch to day' : 'Day view. Switch to night'}
            hint="Long press to follow local time"
            onPress={() => {
              tap();
              setForced(mode === 'night' ? 'day' : 'night');
            }}
            onLongPress={() => setForced(null)}
          />
        </View>

        {/* Title + compass */}
        <View style={[styles.titleBlock, { top: top + 62 }]} pointerEvents="none">
          <T variant="kicker" color={colors.white}>
            {pano.country}
          </T>
          <T variant="display" color={colors.white} style={styles.titleText} accessibilityRole="header">
            {pano.name}
          </T>
          <View style={{ marginTop: 6 }}>
            <Readout icon="compass-outline">
              360° · {wind(heading)} {heading}°
            </Readout>
          </View>
        </View>

        {/* Arrows */}
        <Square icon="chevron-back" label="Look left" onPress={() => nudge(-1)} style={[styles.arrow, { left: 10 }]} />
        <Square icon="chevron-forward" label="Look right" onPress={() => nudge(1)} style={[styles.arrow, { right: 10 }]} />

        {/* Bottom: callout, landmark jumps, city picker */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.callout} accessibilityLiveRegion="polite">
            {near ? (
              <>
                <T variant="title" weight="bold">
                  {near.name}
                </T>
                <T variant="small" color={colors.textSecondary}>
                  {near.fact}
                </T>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="hand-left-outline" size={20} color={colors.ink} />
                <T variant="small" weight="semibold" style={{ flex: 1 }}>
                  Drag to look around. It wraps all the way back to where you started.
                </T>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ flexGrow: 0 }}>
            {pano.landmarks.map((l) => (
              <Pick key={l.id} text={l.name} icon="locate" label={`Look at ${l.name}`} on={near?.id === l.id} onPress={() => lookAt(l.heading)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ flexGrow: 0 }}>
            {PANORAMAS.map((p) => (
              <Pick key={p.id} text={p.name} label={`${p.name} 360 degree view`} on={p.id === pano.id} onPress={() => pick(p.id)} />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleBlock: { position: 'absolute', left: 20, right: 20, gap: 2 },
  titleText: { fontSize: 52, lineHeight: 56 },
  arrow: { position: 'absolute', top: '46%' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12 },
  callout: { marginHorizontal: 16, padding: 14, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, gap: 4, minHeight: 64, justifyContent: 'center' },
  row: { gap: 10, paddingHorizontal: 16, paddingRight: 24, paddingBottom: 4 },
});
