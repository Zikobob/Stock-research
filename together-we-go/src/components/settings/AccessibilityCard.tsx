import { StyleSheet, View } from 'react-native';

import { Chip, ToggleRow } from '@/components/ui/bits';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { useOsReduceMotion } from '@/hooks/useReduceMotion';
import type { TextScale } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';

import { Group } from './Group';

const SCALES: { v: TextScale; l: string }[] = [
  { v: 1, l: 'Default' },
  { v: 1.12, l: 'Large' },
  { v: 1.25, l: 'Extra large' },
];

/** Bigger text, haptics and the animations switch. A group inside the Everyday card. */
export function AccessibilityCard() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const motion = useAppStore((s) => s.personal.motion);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  const osReduceMotion = useOsReduceMotion((s) => s.on);

  return (
    <Group label="Text and touch" gap={6}>
      <T variant="small" weight="semibold">
        {t('settings.textSize')}
      </T>
      <View style={styles.wrap}>
        {SCALES.map((s) => (
          <Chip key={s.v} label={s.l} active={settings.textScale === s.v} onPress={() => update({ textScale: s.v })} />
        ))}
      </View>
      <ToggleRow icon="phone-portrait-outline" label="Haptic feedback" sub="A small tick when you tap" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
      <ToggleRow
        icon="film-outline"
        label="Animations"
        sub={osReduceMotion ? 'Off for now: your phone’s Reduce Motion setting is on' : 'Flipping numbers, floating cards and smooth entrances'}
        value={motion && !osReduceMotion}
        onChange={(v) => updatePersonal({ motion: v })}
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
