import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';
import { themes, type CornerStyle, type ThemeKey } from '@/theme';

import type { Pal } from '../palette';
import { paletteOf } from '../palette';
import { styles } from '../styles';
import { MiniPreview, StepTitle } from '../parts';

export function StepVibe({ pal, p, theme, setTheme, corners, shownName }: { pal: Pal; p: Personal; theme: ThemeKey; setTheme: (k: ThemeKey) => void; corners: CornerStyle; shownName: string }) {
  return (
    <View>
      <StepTitle pal={pal} kicker="Pick your vibe" title="Which colours feel like you?" sub="The whole app re-paints itself — buttons, cards, the animated home banner, everything." />
      <View style={styles.grid}>
        {(Object.keys(themes) as ThemeKey[]).map((k, i) => {
          const tp = paletteOf(k);
          const on = theme === k;
          return (
            <FadeIn key={k} delay={i * 60} from="scale" style={{ width: '48%' }}>
              <Press
                onPress={() => setTheme(k)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${themes[k].name} theme`}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: tp.bg,
                    borderColor: on ? pal.primary : pal.border,
                    borderWidth: on ? 2.5 : 1,
                  },
                ]}>
                <LinearGradient colors={[tp.heroA, tp.heroB, tp.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.themeHero}>
                  <T style={{ fontSize: 22 }}>{themes[k].emoji}</T>
                  <View style={[styles.themeSun, { backgroundColor: tp.accent }]} />
                </LinearGradient>
                <View style={{ padding: 10, gap: 6 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <T variant="title" weight="bold" color={tp.text}>
                      {themes[k].name}
                    </T>
                    {on ? <Ionicons name="checkmark-circle" size={20} color={pal.primary} /> : null}
                  </View>
                  <T variant="caption" color={tp.textSecondary} numberOfLines={1}>
                    {themes[k].vibe}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {[tp.primary, tp.primarySoft, tp.accent, tp.card].map((c, j) => (
                      <View
                        key={j}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: c,
                            borderColor: tp.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </Press>
            </FadeIn>
          );
        })}
      </View>
      <MiniPreview pal={pal} corners={corners} name={shownName} emoji={p.emoji} />
    </View>
  );
}
