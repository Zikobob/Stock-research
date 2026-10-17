import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { photos } from '@/data/images';
import { INTERESTS } from '@/data/personal';
import type { Personal } from '@/store/types';

import type { Pal } from '../palette';
import { styles } from '../styles';
import { StepTitle } from '../parts';
import type { SetPersonal } from '../parts';

export function StepInterests({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  const toggleInterest = (k: string) => set({ interests: p.interests.includes(k) ? p.interests.filter((x) => x !== k) : [...p.interests, k] });
  return (
    <View>
      <StepTitle
        pal={pal}
        kicker="Your interests"
        title="What gets you excited to travel?"
        sub={`Pick as many as you like — “Picked for you” on Explore uses these. ${p.interests.length ? `${p.interests.length} selected` : ''}`}
      />
      <View style={styles.grid}>
        {INTERESTS.map((it, i) => {
          const on = p.interests.includes(it.key);
          return (
            <FadeIn key={it.key} delay={i * 50} from="scale" style={{ width: '48%' }}>
              <Press
                onPress={() => toggleInterest(it.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={it.label}
                style={[styles.interest, { borderColor: on ? pal.primary : 'transparent' }]}>
                <Image source={photos[it.image]} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={on ? [`${pal.primary}55`, `${pal.primary}EE`] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: on ? pal.accent : 'rgba(255,255,255,0.35)',
                    },
                  ]}>
                  {on ? <Ionicons name="checkmark" size={14} color="#1A1C17" /> : null}
                </View>
                <T style={{ fontSize: 24 }}>{it.emoji}</T>
                <T variant="small" weight="bold" color="#FFFFFF">
                  {it.label}
                </T>
              </Press>
            </FadeIn>
          );
        })}
      </View>
    </View>
  );
}
