import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn, Pulse, useMotion } from '@/components/ui/motion';
import { T } from '@/components/ui/T';
import { MAX_WIDTH, line, radius } from '@/theme';

import { PalBar, PalFlap, PalStamp, Tx } from './kit';
import { BUILD_DURATION, BUILD_HOLD, BUILD_TICK, buildPercent, linesDone } from './build';
import { BUILD_LINES } from './options';
import type { Pal } from './palette';
import { StepKicker } from './parts';

/**
 * "Building your trip HQ": a short reveal on the departures board. A number flips up to 100 while three status lines tick off,
 * then `onDone` puts the new look on. With animations off it is a still page with everything ticked, shown briefly.
 */
export function Building({ pal, onDone }: { pal: Pal; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const [now, setNow] = useState(0);
  const pct = motion ? buildPercent(now) : 100;
  const done = linesDone(pct);
  const ready = pct >= 100;
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!motion) {
      const t = setTimeout(() => finish.current(), 900);
      return () => clearTimeout(t);
    }
    let elapsed = 0;
    let end: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      elapsed += BUILD_TICK;
      setNow(elapsed);
      if (elapsed >= BUILD_DURATION) {
        clearInterval(id);
        end = setTimeout(() => finish.current(), BUILD_HOLD);
      }
    }, BUILD_TICK);
    return () => {
      clearInterval(id);
      if (end) clearTimeout(end);
    };
  }, [motion]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: pal.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
      <View style={styles.column}>
        <FadeIn duration={260} distance={10}>
          <View style={styles.stack}>
            <StepKicker pal={pal} text="Boarding" />
            <T variant="display" color={pal.text} accessibilityRole="header" accessibilityLiveRegion="polite">
              {ready ? 'Your trip HQ is ready' : 'Building your trip HQ'}
            </T>
            <View style={styles.percent} accessibilityRole="progressbar" accessibilityLabel="Building your trip HQ" accessibilityValue={{ min: 0, max: 100, now: pct }}>
              <PalFlap pal={pal} value={String(pct).padStart(3, '0')} size={76} />
              <T variant="numeral" color={pal.textSecondary}>
                %
              </T>
            </View>
            <PalBar pal={pal} value={pct / 100} />
            <View style={styles.lines}>
              {BUILD_LINES.map((text, i) => {
                const isDone = i < done;
                const current = i === done;
                return (
                  <View key={text} style={styles.line}>
                    {isDone ? (
                      <View style={[styles.box, { backgroundColor: pal.ink, borderColor: pal.ink }]}>
                        <Ionicons name="checkmark" size={16} color={pal.bg} />
                      </View>
                    ) : current ? (
                      <Pulse scale={1.12}>
                        <View style={[styles.box, { backgroundColor: pal.accent, borderColor: pal.ink }]} />
                      </Pulse>
                    ) : (
                      <View style={[styles.box, { borderColor: pal.borderStrong }]} />
                    )}
                    <Tx pal={pal} tone={isDone ? 'text' : current ? 'secondary' : 'muted'} variant="body" weight={isDone ? 'bold' : 'regular'}>
                      {text}
                    </Tx>
                  </View>
                );
              })}
            </View>
            <View style={{ minHeight: 30 }}>{ready ? <PalStamp pal={pal} label="Ready" tone="accent" slam /> : null}</View>
          </View>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', zIndex: 50 },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, justifyContent: 'center', paddingHorizontal: 20 },
  stack: { gap: 20 },
  percent: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  lines: { gap: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
  box: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
});
