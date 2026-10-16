import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Float } from '@/components/ui/motion';
import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';

import type { Pal } from '../palette';
import { styles } from '../styles';

const bubblePos = [
  { left: 0, top: 30 },
  { right: 4, top: 10 },
  { left: 22, bottom: 0 },
  { right: 0, bottom: 20 },
  { left: 92, top: -6 },
  { right: 86, bottom: -12 },
] as const;

export function StepHello({ pal, p, firstName }: { pal: Pal; p: Personal; firstName: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10 }}>
      <View style={styles.bubbles}>
        {['🌍', '✈️', '🎒', '🏝️', '🍜', '📸'].map((e, i) => (
          <Float key={e} amount={10} duration={1800 + i * 260} delay={i * 120} style={[styles.bubble, bubblePos[i], { backgroundColor: pal.card, borderColor: pal.border }]}>
            <T style={{ fontSize: 26, lineHeight: 32 }}>{e}</T>
          </Float>
        ))}
        <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCircle}>
          <T style={{ fontSize: 54, lineHeight: 64 }}>{p.emoji}</T>
        </LinearGradient>
      </View>
      <T variant="kicker" color={pal.primary} style={{ marginTop: 18 }}>
        60-second survey
      </T>
      <T variant="display" center color={pal.text} style={{ marginTop: 6 }}>
        Let’s make it{'\n'}yours, {firstName}
      </T>
      <T variant="body" center color={pal.textSecondary} style={{ marginTop: 10, maxWidth: 320 }}>
        Pick a colour vibe, your travel interests and what shows up on your home screen. You can change any of it later in Settings.
      </T>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginTop: 18,
        }}>
        {['🎨 6 colour themes', '❤️ Your interests', '🏠 Your home screen', '😎 Your avatar'].map((x) => (
          <View
            key={x}
            style={[
              styles.tag,
              {
                backgroundColor: pal.primarySofter,
                borderColor: pal.primaryLine,
              },
            ]}>
            <T variant="small" weight="medium" color={pal.primary}>
              {x}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}
