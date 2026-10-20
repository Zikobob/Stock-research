import { StyleSheet, View } from 'react-native';

import { StaggerText } from '@/components/ui/StaggerText';
import { T } from '@/components/ui/T';
import { LAYOUTS } from '@/data/layouts';
import { INTERESTS, TRIVIA_REMINDER } from '@/data/personal';
import type { Personal } from '@/store/types';
import { radius, themes, type ModePref, type ThemeKey } from '@/theme';

import { lookLabel } from '../look';
import { EFFECT_LABEL, STEP } from '../options';
import type { Pal } from '../palette';
import { SummaryRow, Tx } from '../parts';

/** The last page: every answer in a list (tap a row to change it), and the build button below. */
export function StepReveal({ pal, p, theme, mode, shownName, onEdit }: { pal: Pal; p: Personal; theme: ThemeKey; mode: ModePref; shownName: string; onEdit: (step: number) => void }) {
  const picks = INTERESTS.filter((i) => p.interests.includes(i.key));
  const rows = [
    { icon: 'happy-outline', label: 'Name', value: `${p.emoji} ${shownName}`, step: STEP.welcome },
    { icon: 'color-palette-outline', label: 'Look', value: `${themes[theme].emoji} ${lookLabel({ theme, mode })}`, step: STEP.look },
    { icon: 'heart-outline', label: 'Interests', value: picks.length ? picks.map((i) => i.emoji).join(' ') : 'Everything', step: STEP.interests },
    { icon: 'home-outline', label: 'Home layout', value: p.layout === 'custom' ? 'Custom' : LAYOUTS[p.layout].name, step: STEP.layout },
    { icon: 'sparkles-outline', label: 'Effects', value: `${EFFECT_LABEL[p.effects]}${p.triviaReminder ? ` · trivia ${TRIVIA_REMINDER.timeLabel}` : ''}`, step: STEP.vibe },
  ] as const;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <View style={[styles.disc, { backgroundColor: pal.accent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <T style={{ fontSize: 34, lineHeight: 42 }}>{p.emoji}</T>
        </View>
        <StaggerText text={`Looking good, ${shownName}`} variant="display" color={pal.text} />
        <Tx pal={pal} tone="secondary" variant="body">
          Here’s your TogetherWeGo. Tap any row to change it.
        </Tx>
      </View>
      <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}>
        {rows.map((r, i) => (
          <SummaryRow key={r.label} pal={pal} icon={r.icon} label={r.label} value={r.value} onPress={() => onEdit(r.step)} last={i === rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.card, borderWidth: 1, paddingHorizontal: 14 },
});
