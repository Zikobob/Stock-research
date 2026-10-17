import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { T } from '@/components/ui/T';
import { INTERESTS } from '@/data/personal';
import { LANGUAGES, type LangCode } from '@/i18n';
import type { Personal } from '@/store/types';
import { cornerStyles, themes, type CornerStyle, type ThemeKey } from '@/theme';

import type { Pal } from '../palette';
import { styles } from '../styles';
import { SECTIONS, PACE, BUDGET, STEPS } from '../options';
import { MiniPreview, Summary, Confetti } from '../parts';

interface Props {
  pal: Pal;
  p: Personal;
  theme: ThemeKey;
  corners: CornerStyle;
  lang: LangCode;
  currency: string;
  shownName: string;
  /** Opens the step with this number so an answer can be changed. */
  onEdit: (step: number) => void;
}

export function StepDone({ pal, p, theme, corners, lang, currency, shownName, onEdit }: Props) {
  const edit = (step: (typeof STEPS)[number]) => () => onEdit(STEPS.indexOf(step));
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
      <T variant="caption" center color={pal.textMuted} style={{ marginTop: 2 }}>
        Tap any row to change it
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
        <Summary pal={pal} icon="color-palette-outline" label="Theme" value={`${themes[theme].emoji} ${themes[theme].name}`} onPress={edit('Vibe')} />
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
          onPress={edit('Interests')}
        />
        <Summary pal={pal} icon="walk-outline" label="Style" value={`${PACE.find((x) => x.key === p.travelStyle)?.label} pace · ${BUDGET.find((x) => x.key === p.budgetStyle)?.label}`} onPress={edit('Style')} />
        <Summary pal={pal} icon="home-outline" label="Home sections" value={`${Object.values(p.sections).filter(Boolean).length} of ${SECTIONS.length} on`} onPress={edit('Home')} />
        <Summary pal={pal} icon="shapes-outline" label="Card shape" value={`${cornerStyles[corners].name} corners`} onPress={edit('Home')} />
        <Summary pal={pal} icon="globe-outline" label="Language & currency" value={`${LANGUAGES.find((l) => l.code === lang)?.native} · ${currency}`} onPress={edit('You')} />
      </View>
      <MiniPreview pal={pal} corners={corners} name={shownName} emoji={p.emoji} />
    </View>
  );
}
