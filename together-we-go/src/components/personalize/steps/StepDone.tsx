import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { T } from '@/components/ui/T';
import { INTERESTS } from '@/data/personal';
import { LANGUAGES, type LangCode } from '@/i18n';
import type { Personal } from '@/store/types';
import { cornerStyles, themes, type CornerStyle, type ThemeKey } from '@/theme';

import type { Pal } from '../palette';
import { styles } from '../styles';
import { SECTIONS, PACE, BUDGET } from '../options';
import { MiniPreview, Summary, Confetti } from '../parts';

export function StepDone({ pal, p, theme, corners, lang, currency, shownName }: { pal: Pal; p: Personal; theme: ThemeKey; corners: CornerStyle; lang: LangCode; currency: string; shownName: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Confetti pal={pal} />
      <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCircle}>
        <T style={{ fontSize: 54, lineHeight: 64 }}>{p.emoji}</T>
      </LinearGradient>
      <T variant="display" center color={pal.text} style={{ marginTop: 14 }}>
        Looking good, {shownName}!
      </T>
      <T variant="body" center color={pal.textSecondary} style={{ marginTop: 6 }}>
        Here’s your TogetherWeGo:
      </T>
      <View
        style={[
          styles.card,
          {
            backgroundColor: pal.card,
            borderColor: pal.border,
            alignSelf: 'stretch',
            marginTop: 16,
          },
        ]}>
        <Summary pal={pal} icon="color-palette-outline" label="Theme" value={`${themes[theme].emoji} ${themes[theme].name} · ${cornerStyles[corners].name} corners`} />
        <Summary
          pal={pal}
          icon="heart-outline"
          label="Interests"
          value={
            p.interests.length
              ? INTERESTS.filter((i) => p.interests.includes(i.key))
                  .map((i) => i.emoji)
                  .join(' ')
              : 'Everything'
          }
        />
        <Summary pal={pal} icon="walk-outline" label="Style" value={`${PACE.find((x) => x.key === p.travelStyle)?.label} pace · ${BUDGET.find((x) => x.key === p.budgetStyle)?.label}`} />
        <Summary pal={pal} icon="home-outline" label="Home sections" value={`${Object.values(p.sections).filter(Boolean).length} of ${SECTIONS.length} on`} />
        <Summary pal={pal} icon="globe-outline" label="Language & currency" value={`${LANGUAGES.find((l) => l.code === lang)?.native} · ${currency}`} />
      </View>
      <MiniPreview pal={pal} corners={corners} name={shownName} emoji={p.emoji} />
    </View>
  );
}
