import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Card, Chip, Divider } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { HOME_BLOCKS, LAYOUTS, layoutAnswers, type Preset } from '@/data/layouts';
import { useAppStore } from '@/store/useAppStore';
import { colors, hair, radius } from '@/theme';

import { switchThumb } from '@/components/personalize/kit';
import { allBlocks, movedBlock, shownCount, switchedBlock } from './blocks';
import { Group } from './Group';

const PRESETS = Object.keys(LAYOUTS) as Preset[];

/** A square arrow button, 44 x 44, that moves a Home block up or down. */
function Move({ dir, label, disabled, onPress }: { dir: 'up' | 'down'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityState={{ disabled }} style={[styles.move, disabled && { opacity: 0.3 }]}>
      <Ionicons name={dir === 'up' ? 'arrow-up' : 'arrow-down'} size={18} color={colors.ink} />
    </Press>
  );
}

/**
 * What Home shows and in what order. Three ready-made layouts (Planner, Money, Party) first, and the blocks one by one under
 * "Arrange blocks": a switch to hide each, and arrows to move it. Changing anything by hand makes the layout "Custom".
 */
export function HomeLayoutCard() {
  const order = useAppStore((s) => s.personal.order);
  const sections = useAppStore((s) => s.personal.sections);
  const layout = useAppStore((s) => s.personal.layout);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  const [open, setOpen] = useState(false);

  const answers = { order, sections };
  const all = allBlocks(order);
  const shown = shownCount(answers);
  const chosen = layout !== 'custom' ? LAYOUTS[layout] : null;

  return (
    <Card padded={false}>
      <View style={styles.top}>
        <Group label="Layout">
          <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Home layout">
            {PRESETS.map((k) => (
              <Chip key={k} label={LAYOUTS[k].name} active={layout === k} onPress={() => updatePersonal(layoutAnswers(k))} />
            ))}
            {layout === 'custom' ? <Stamp label="Custom" tone="muted" rotate={0} /> : null}
          </View>
          <T variant="caption" color={colors.textSecondary}>
            {chosen ? chosen.blurb : 'Arranged by hand. Pick a layout to start over.'}
          </T>
        </Group>
      </View>
      <Divider />
      <Press onPress={() => setOpen((o) => !o)} style={styles.head} scaleTo={0.99} accessibilityLabel="Arrange blocks" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold">
            Arrange blocks
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {shown} of {all.length} showing. The boarding pass is always first.
          </T>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
      </Press>
      {open ? (
        <View style={styles.list}>
          {all.map((k, i) => {
            const on = sections[k];
            const name = HOME_BLOCKS[k].label;
            return (
              <View key={k}>
                <Divider />
                <View style={styles.row}>
                  <T variant="kicker" color={colors.textMuted} style={{ width: 22 }}>
                    {String(i + 1).padStart(2, '0')}
                  </T>
                  <T variant="bodySm" weight="semibold" color={on ? colors.text : colors.textMuted} style={{ flex: 1 }} numberOfLines={2}>
                    {name}
                  </T>
                  <Move dir="up" label={`Move ${name} up`} disabled={i === 0} onPress={() => updatePersonal(movedBlock(answers, k, -1))} />
                  <Move dir="down" label={`Move ${name} down`} disabled={i === all.length - 1} onPress={() => updatePersonal(movedBlock(answers, k, 1))} />
                  <Switch
                    accessibilityLabel={`Show ${name} on Home`}
                    value={on}
                    onValueChange={(v) => updatePersonal(switchedBlock(answers, k, v))}
                    trackColor={{ false: colors.borderStrong, true: colors.ink }}
                    thumbColor={switchThumb(colors)}
                    {...({ activeThumbColor: colors.accent } as object)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { padding: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 56 },
  move: { width: 44, height: 44, borderRadius: radius.button, borderWidth: hair, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
