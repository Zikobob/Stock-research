import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn, Float, Pulse, useMotion } from '@/components/ui/motion';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { T } from '@/components/ui/T';
import { MAX_WIDTH } from '@/theme';

import { BUILD_LINES } from './options';
import type { Pal } from './palette';
import { Tx } from './parts';

/** How long each status line takes, and the pause before the first (ms). The whole moment is about two seconds. */
const FIRST = 500;
const EACH = 480;
const END = FIRST + BUILD_LINES.length * EACH + 100;

/**
 * "Building your trip HQ…": a short reveal of three status lines and a number that rolls up to 100, then `onDone`.
 * With animations off it is a still page with every line ticked, shown briefly, so nothing is lost.
 */
export function Building({ pal, emoji, hasWash, onDone }: { pal: Pal; emoji: string; hasWash: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const [step, setStep] = useState(0);
  // still, with everything ticked, when animations are off
  const done = motion ? step : BUILD_LINES.length;
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (motion) {
      BUILD_LINES.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), FIRST + i * EACH)));
      timers.push(setTimeout(() => finish.current(), END));
    } else {
      timers.push(setTimeout(() => finish.current(), 800));
    }
    return () => timers.forEach(clearTimeout);
  }, [motion]);

  const pct = Math.round((done / BUILD_LINES.length) * 100);
  const all = done >= BUILD_LINES.length;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: pal.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
      {hasWash ? <LinearGradient pointerEvents="none" colors={[pal.washFrom, pal.washTo, pal.bg]} locations={[0, 0.5, 1]} style={styles.wash} /> : null}
      <View style={styles.column}>
        <FadeIn duration={300} distance={10}>
          <View style={styles.center}>
            <Float amount={10}>
              <View style={[styles.disc, { backgroundColor: pal.accent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <T style={{ fontSize: 40, lineHeight: 50 }}>{emoji}</T>
              </View>
            </Float>
            <T variant="display" center color={pal.text} accessibilityRole="header">
              {all ? 'Your trip HQ is ready' : 'Building your trip HQ…'}
            </T>
            <View style={styles.percent} accessibilityRole="progressbar" accessibilityLabel="Building your trip HQ" accessibilityValue={{ min: 0, max: 100, now: pct }}>
              <RollingNumber value={pct} variant="hero" color={pal.text} />
              <T variant="numeral" color={pal.textSecondary}>
                %
              </T>
            </View>
            <View style={styles.lines} accessibilityLiveRegion="polite">
              {BUILD_LINES.map((line, i) => {
                const isDone = i < done;
                const current = i === done;
                return (
                  <View key={line} style={styles.line}>
                    {isDone ? (
                      <Ionicons name="checkmark-circle" size={22} color={pal.text} />
                    ) : current ? (
                      <Pulse scale={1.25}>
                        <Ionicons name="ellipse" size={14} color={pal.accent} style={{ margin: 4 }} />
                      </Pulse>
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color={pal.borderStrong} />
                    )}
                    <Tx pal={pal} tone={isDone ? 'text' : current ? 'secondary' : 'muted'} variant="body" weight={isDone ? 'bold' : 'regular'}>
                      {line}
                      {current ? '…' : ''}
                    </Tx>
                  </View>
                );
              })}
            </View>
          </View>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', zIndex: 50 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, justifyContent: 'center', paddingHorizontal: 20 },
  center: { alignItems: 'center', gap: 16 },
  disc: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  percent: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  lines: { alignSelf: 'stretch', gap: 12, paddingLeft: 56, marginTop: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 26 },
});
