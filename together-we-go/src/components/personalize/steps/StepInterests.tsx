import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { FadeIn, nativeDriver, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { pickedForYou } from '@/components/home/picks';
import { photos } from '@/data/images';
import { INTERESTS, INTEREST_GOAL, interestHint } from '@/data/personal';
import type { Personal } from '@/store/types';
import { line, radius } from '@/theme';

import { CheckBadge, Tx } from '../kit';
import type { Pal } from '../palette';
import { StepHeading, type SetPersonal } from '../parts';

type Interest = (typeof INTERESTS)[number];

/** A photo tile. Chosen = a thick accent frame, a tick and a little bounce. The label sits on a scrim so it reads on any photo. */
function Tile({ pal, it, on, index, onPress }: { pal: Pal; it: Interest; on: boolean; index: number; onPress: () => void }) {
  const motion = useMotion();
  const [bounce] = useState(() => new Animated.Value(1));
  const press = () => {
    onPress();
    if (on || !motion) return;
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.06, duration: 90, useNativeDriver: nativeDriver }),
      Animated.spring(bounce, { toValue: 1, friction: 4, tension: 170, useNativeDriver: nativeDriver }),
    ]).start();
  };
  return (
    <FadeIn delay={Math.min(index, 5) * 40} distance={12} duration={240} style={{ width: '48%' }}>
      <Animated.View style={{ transform: [{ scale: bounce }] }}>
        <Press
          onPress={press}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: on }}
          accessibilityLabel={it.label}
          accessibilityHint={it.sub}
          scaleTo={0.97}
          style={[styles.tile, { borderColor: pal.ink }]}>
          <Image source={photos[it.image]} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={styles.scrim} />
          {on ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.frame, { borderColor: pal.accent }]} /> : null}
          <View style={styles.badge}>{on ? <CheckBadge pal={pal} size={28} /> : <View style={styles.badgeOff} />}</View>
          <View style={styles.label}>
            <Ionicons name={it.icon} size={19} color={pal.white} />
            <T variant="title" weight="bold" color={pal.white}>
              {it.label}
            </T>
          </View>
        </Press>
      </Animated.View>
    </FadeIn>
  );
}

/** Step 3: eight photo tiles. Pick 3 or more; picking none is fine and never blocks. */
export function StepInterests({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  const toggle = (k: string) => set({ interests: p.interests.includes(k) ? p.interests.filter((x) => x !== k) : [...p.interests, k] });
  const n = p.interests.length;
  // what the picks do: the first places "Picked for you" on Home would show right now
  const first = pickedForYou(p)
    .slice(0, 3)
    .map((x) => x.d.city);
  return (
    <View style={{ gap: 18 }}>
      <StepHeading pal={pal} kicker="03 / 05 · Interests" title="What do you love?" sub="We use these for Picked for you on Home and for the daily trivia." />
      <View style={styles.hintRow} accessibilityLiveRegion="polite">
        <View style={{ flexDirection: 'row', gap: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: INTEREST_GOAL }, (_, i) => (
            <View key={i} style={[styles.pip, { borderColor: pal.ink, backgroundColor: i < n ? pal.accent : 'transparent' }]} />
          ))}
        </View>
        <Tx pal={pal} tone="secondary" variant="kicker">
          {interestHint(n)}
        </Tx>
      </View>
      {first.length ? (
        <Tx pal={pal} tone="secondary" variant="small" accessibilityLiveRegion="polite" style={{ marginTop: -8 }}>
          On Home you would see {first.join(', ')}.
        </Tx>
      ) : null}
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
  tile: { height: 136, borderRadius: radius.card, borderWidth: line, overflow: 'hidden', justifyContent: 'flex-end' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  frame: { borderWidth: 5, borderRadius: radius.card },
  badge: { position: 'absolute', top: 10, right: 10 },
  badgeOff: { width: 28, height: 28, borderRadius: radius.xs, borderWidth: line, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.25)' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  pip: { width: 14, height: 14, borderWidth: line, borderRadius: 3 },
});
