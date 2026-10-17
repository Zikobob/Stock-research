import { StyleSheet, View } from 'react-native';

import { Card, Chip, ToggleRow } from '@/components/ui/bits';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import type { TextScale } from '@/store/types';

const SCALES: { v: TextScale; l: string }[] = [
  { v: 1, l: 'Default' },
  { v: 1.12, l: 'Large' },
  { v: 1.25, l: 'Extra large' },
];

/** Bigger text and haptics. */
export function AccessibilityCard() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);

  return (
    <Card style={{ marginTop: 14, gap: 8 }}>
      <T variant="title">Accessibility</T>
      <T variant="small" weight="semibold">
        {t('settings.textSize')}
      </T>
      <View style={styles.wrap}>
        {SCALES.map((s) => (
          <Chip key={s.v} label={s.l} active={settings.textScale === s.v} onPress={() => update({ textScale: s.v })} />
        ))}
      </View>
      <ToggleRow icon="phone-portrait-outline" label="Haptic feedback" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
