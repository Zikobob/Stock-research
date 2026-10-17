import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { cornerStyles, type CornerStyle } from '@/theme';

import type { Personal } from '@/store/types';

import { styles } from './styles';
import type { Pal } from './palette';

export function StepTitle({ pal, kicker, title, sub }: { pal: Pal; kicker: string; title: string; sub: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <T variant="kicker" color={pal.primary}>
        {kicker}
      </T>
      <T variant="h1" color={pal.text} style={{ marginTop: 4 }} accessibilityRole="header">
        {title}
      </T>
      <T variant="bodySm" color={pal.textSecondary} style={{ marginTop: 6 }}>
        {sub}
      </T>
    </View>
  );
}

export function OptionRow({ pal, on, emoji, label, sub, onPress }: { pal: Pal; on: boolean; emoji: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[
        styles.option,
        {
          backgroundColor: on ? pal.primarySofter : pal.card,
          borderColor: on ? pal.primary : pal.border,
        },
      ]}>
      <T style={{ fontSize: 26, lineHeight: 32 }}>{emoji}</T>
      <View style={{ flex: 1 }}>
        <T variant="title" color={pal.text}>
          {label}
        </T>
        <T variant="caption" color={pal.textSecondary}>
          {sub}
        </T>
      </View>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? pal.primary : pal.textMuted} />
    </Press>
  );
}

export function SmallChip({ pal, on, label, onPress }: { pal: Pal; on: boolean; label: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[
        styles.smallChip,
        {
          backgroundColor: on ? pal.primary : pal.card,
          borderColor: on ? pal.primary : pal.border,
        },
      ]}>
      <T variant="small" weight="semibold" color={on ? '#FFFFFF' : pal.text}>
        {label}
      </T>
    </Press>
  );
}

/** One answer on the last page. Tapping the row (icon, words or pencil) opens the step where it can be changed. */
export function Summary({ pal, icon, label, value, onPress }: { pal: Pal; icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} scaleTo={0.99} accessibilityLabel={`Change ${label.toLowerCase()}, now ${value}`} style={styles.secRow}>
      <View style={[styles.secIcon, { backgroundColor: pal.primarySofter }]}>
        <Ionicons name={icon} size={16} color={pal.primary} />
      </View>
      <T variant="small" color={pal.textSecondary} style={{ width: 120 }}>
        {label}
      </T>
      <T variant="small" weight="semibold" color={pal.text} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </T>
      <Ionicons name="create-outline" size={16} color={pal.textMuted} />
    </Press>
  );
}

/** A tiny phone-style preview of the Explore page in the chosen palette + corners. */
export function MiniPreview({ pal, corners, name, emoji }: { pal: Pal; corners: CornerStyle; name: string; emoji: string }) {
  const r = (n: number) => Math.round(n * cornerStyles[corners].scale);
  return (
    <View style={[styles.preview, { backgroundColor: pal.bg, borderColor: pal.borderStrong }]} accessibilityLabel="Live preview">
      <T variant="kicker" color={pal.textMuted} style={{ marginBottom: 8 }}>
        Live preview
      </T>
      <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: r(18), padding: 12, height: 86 }}>
        <T variant="caption" color="rgba(255,255,255,0.85)">
          Hi {name} {emoji}
        </T>
        <T variant="h3" color="#FFFFFF">
          Where to next?
        </T>
        <View style={[styles.previewSun, { backgroundColor: pal.accent }]} />
      </LinearGradient>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: r(14),
            backgroundColor: pal.primary,
          }}
        />
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: r(14),
            backgroundColor: pal.card,
            borderWidth: 1,
            borderColor: pal.border,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              paddingHorizontal: 12,
              height: 22,
              borderRadius: 11,
              backgroundColor: i === 0 ? pal.primary : pal.primarySoft,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const CONFETTI = ['#F2B33D', '#E8833A', '#3D7DD8', '#7C5CD6', '#2A9D8F', '#D94F86', '#8CC97A', '#F5C451', '#5CC8D6', '#FF8A5B', '#B83268', '#2FAE66'];

/** One-shot confetti burst for the final step. */
export function Confetti({ pal }: { pal: Pal }) {
  const [v] = useState(() => new Animated.Value(0));
  const motion = useMotion();
  useEffect(() => {
    if (!motion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, motion]);
  if (!motion) return null;
  return (
    <View pointerEvents="none" style={styles.confetti}>
      {CONFETTI.concat(CONFETTI).map((c, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 90 + (i % 4) * 30;
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                backgroundColor: i % 5 === 0 ? pal.accent : c,
                borderRadius: i % 3 === 0 ? 5 : 2,
                opacity: v.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(angle) * dist],
                    }),
                  },
                  {
                    translateY: v.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [0, Math.sin(angle) * dist - 20, Math.sin(angle) * dist + 40],
                    }),
                  },
                  {
                    rotate: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 540}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Updates part of the survey answers. */
export type SetPersonal = (patch: Partial<Personal>) => void;
