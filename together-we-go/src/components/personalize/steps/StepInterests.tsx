import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { FadeIn, nativeDriver, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { photos } from '@/data/images';
import { INTERESTS, INTEREST_GOAL, interestHint } from '@/data/personal';
import type { Personal } from '@/store/types';
import { radius } from '@/theme';

import type { Pal } from '../palette';
import { StepHeading, Tx, type SetPersonal } from '../parts';

type Interest = (typeof INTERESTS)[number];

/** A photo tile. Chosen = an accent ring, a tick and a little bounce. */
function Tile({ pal, it, on, index, onPress }: { pal: Pal; it: Interest; on: boolean; index: number; onPress: () => void }) {
  const motion = useMotion();
  const [bounce] = useState(() => new Animated.Value(1));
  const press = () => {
    onPress();
    if (on || !motion) return;
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.07, duration: 90, useNativeDriver: nativeDriver }),
      Animated.spring(bounce, { toValue: 1, friction: 4, tension: 170, useNativeDriver: nativeDriver }),
    ]).start();
  };
  return (
    <FadeIn delay={Math.min(index, 5) * 50} distance={12} duration={260} style={{ width: '48%' }}>
      <Animated.View style={{ transform: [{ scale: bounce }] }}>
        <Press onPress={press} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={it.label} accessibilityHint={it.sub} scaleTo={0.97} style={styles.tile}>
          <Image source={photos[it.image]} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.74)']} style={StyleSheet.absoluteFill} />
          {on ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { borderColor: pal.accent }]} /> : null}
          <View style={[styles.check, on ? { backgroundColor: pal.accent } : styles.checkOff]}>{on ? <Ionicons name="checkmark" size={16} color={pal.onAccent} /> : null}</View>
          <T style={{ fontSize: 22, lineHeight: 28 }} accessibilityElementsHidden importantForAccessibility="no">
            {it.emoji}
          </T>
          <T variant="title" weight="bold" color={pal.white}>
            {it.label}
          </T>
        </Press>
      </Animated.View>
    </FadeIn>
  );
}

/** Step 3: eight photo tiles. Pick 3 or more; picking none is fine and never blocks. */
export function StepInterests({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  const toggle = (k: string) => set({ interests: p.interests.includes(k) ? p.interests.filter((x) => x !== k) : [...p.interests, k] });
  const n = p.interests.length;
  return (
    <View style={{ gap: 18 }}>
      <StepHeading pal={pal} title="What do you love?" sub="We’ll tailor Picked for you and the trivia to what you pick." />
      <View style={styles.hintRow} accessibilityLiveRegion="polite">
        <View style={{ flexDirection: 'row', gap: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: INTEREST_GOAL }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < n ? pal.primary : pal.border }]} />
          ))}
        </View>
        <Tx pal={pal} tone="secondary" variant="small" weight="semibold">
          {interestHint(n)}
        </Tx>
      </View>
      <View style={styles.grid}>
        {INTERESTS.map((it, i) => (
          <Tile key={it.key} pal={pal} it={it} on={p.interests.includes(it.key)} index={i} onPress={() => toggle(it.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { height: 132, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  ring: { borderWidth: 4, borderRadius: radius.card },
  check: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkOff: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
