/**
 * Building blocks of "Make it yours" (and of the Look card in Settings).
 * Everything here draws itself with a palette object (`pal`) instead of the global colours, so the survey can repaint itself
 * live in a theme that is not applied yet. In Settings, pass the app's own `colors` as `pal`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import { Plate } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { LAYOUTS, layoutAnswers, visibleSections, type Preset } from '@/data/layouts';
import type { Effects, Personal } from '@/store/types';
import { hair, line, radius, themes, type ModePref, type ThemeKey } from '@/theme';

import { CheckBadge, PalSegmented, Tx, switchThumb } from './kit';
import { BLOCK_SHORT, MODES } from './options';
import { paletteOf, type Pal } from './palette';

/** Updates part of the survey answers. */
export type SetPersonal = (patch: Partial<Personal>) => void;

/** The small line over a step's title: a bullet in the accent, then "02 / 05 · Look" in mono caps. */
export function StepKicker({ pal, text }: { pal: Pal; text: string }) {
  return (
    <View style={styles.kickerRow}>
      <View style={[styles.bullet, { backgroundColor: pal.accent, borderColor: pal.ink }]} />
      <Tx pal={pal} tone="secondary" variant="kicker">
        {text}
      </Tx>
    </View>
  );
}

/** A step's title in heavy serif, with its kicker above and one line under it. */
export function StepHeading({ pal, kicker, title, sub }: { pal: Pal; kicker: string; title: string; sub: string }) {
  return (
    <View style={{ gap: 10 }}>
      <StepKicker pal={pal} text={kicker} />
      <T variant="display" color={pal.text} accessibilityRole="header">
        {title}
      </T>
      <Tx pal={pal} tone="secondary" variant="body">
        {sub}
      </Tx>
    </View>
  );
}

/** "Step 2 of 5" as five ticket stubs in a row: done ones are inked, the one you are on is the accent (goal-gradient: the end is in sight). */
export function StepBar({ pal, step, total }: { pal: Pal; step: number; total: number }) {
  const now = Math.min(step + 1, total);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Step ${now} of ${total}`} accessibilityValue={{ min: 1, max: total, now }} style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, { borderColor: pal.ink, backgroundColor: i < step || step >= total ? pal.ink : i === step ? pal.accent : 'transparent' }]} />
      ))}
    </View>
  );
}

/** Three dashes and a block: a tiny boarding pass drawn in one theme's own colours. */
export function MiniTicket({ tp }: { tp: Pal }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mini, { backgroundColor: tp.card, borderColor: tp.ink }]}>
      <View style={styles.miniRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ height: 5, width: '72%', backgroundColor: tp.ink }} />
          <View style={{ height: 5, width: '44%', backgroundColor: tp.textMuted }} />
        </View>
        <View style={[styles.miniStamp, { backgroundColor: tp.accent, borderColor: tp.ink }]} />
      </View>
      <View style={styles.miniDashes}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={{ width: 5, height: 2, backgroundColor: tp.ink }} />
        ))}
      </View>
      <View style={[styles.miniBar, { borderColor: tp.ink, backgroundColor: tp.card }]}>
        <View style={{ width: '58%', height: '100%', backgroundColor: tp.accent }} />
      </View>
    </View>
  );
}

/**
 * One theme as a swatch: a flat field of its accent colour with a tiny ticket lying on it, in that theme's own paper and ink,
 * and the name under it. The chosen one stands up on a plate and gets a tick (so it is not told by colour alone).
 */
export function ThemeTile({ pal, theme, mode, selected, onPress }: { pal: Pal; theme: ThemeKey; mode: ModePref; selected: boolean; onPress: () => void }) {
  const tp = useMemo(() => paletteOf(theme, mode), [theme, mode]);
  const t = themes[theme];
  return (
    <Plate corner={radius.card} color={selected ? pal.plate : 'transparent'} style={{ flex: 1 }}>
      <Press
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${t.name} theme`}
        accessibilityHint={t.vibe}
        scaleTo={0.97}
        style={[styles.themeTile, { borderColor: pal.ink, backgroundColor: pal.card }]}>
        <View style={[styles.themeField, { backgroundColor: tp.accent, borderBottomColor: pal.ink }]}>
          <MiniTicket tp={tp} />
        </View>
        <View style={styles.themeFoot}>
          <T variant="title" weight="bold" color={pal.text} numberOfLines={1} style={{ flex: 1 }}>
            {t.name}
          </T>
          {selected ? <CheckBadge pal={pal} size={24} /> : null}
        </View>
      </Press>
    </Plate>
  );
}

/** The six themes, two to a row. */
export function ThemeGrid({ pal, theme, mode, onPick }: { pal: Pal; theme: ThemeKey; mode: ModePref; onPick: (k: ThemeKey) => void }) {
  const keys = Object.keys(themes) as ThemeKey[];
  const rows: ThemeKey[][] = [];
  for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Colour theme" style={{ gap: 10 }}>
      {rows.map((row) => (
        <View key={row.join()} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((k) => (
            <ThemeTile key={k} pal={pal} theme={k} mode={mode} selected={theme === k} onPress={() => onPick(k)} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** A flat square of one theme's accent colour (for Settings): 44 x 44, with a tick when chosen. */
export function ThemeSwatch({ pal, theme, mode, selected, onPress }: { pal: Pal; theme: ThemeKey; mode: ModePref; selected: boolean; onPress: () => void }) {
  const tp = useMemo(() => paletteOf(theme, mode), [theme, mode]);
  const t = themes[theme];
  return (
    <Plate offset={3} corner={radius.button} color={selected ? pal.plate : 'transparent'}>
      <Press
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${t.name} theme`}
        accessibilityHint={t.vibe}
        scaleTo={0.94}
        style={[styles.swatch, { backgroundColor: tp.accent, borderColor: pal.ink }]}>
        {selected ? <Ionicons name="checkmark" size={24} color={tp.onAccent} /> : null}
      </Press>
    </Plate>
  );
}

/** Light / Dark / System. */
export function ModePicker({ pal, value, onChange }: { pal: Pal; value: ModePref; onChange: (m: ModePref) => void }) {
  return <PalSegmented pal={pal} options={MODES} value={value} onChange={onChange} label="Light or dark" />;
}

/** A tiny drawing of the Home order: the boarding pass on top (always there), then the blocks. The first block is the loud one (accent). */
export function HomeWire({ pal, order, sections }: { pal: Pal; order: ReturnType<typeof layoutAnswers>['order']; sections: ReturnType<typeof layoutAnswers>['sections'] }) {
  const blocks = visibleSections({ order, sections }).slice(0, 4);
  return (
    <View style={styles.wire} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.wireHero, { backgroundColor: pal.ink }]}>
        <View style={{ width: 22, height: 8, backgroundColor: pal.bg }} />
      </View>
      {blocks.map((k, i) => (
        <View key={k} style={[styles.wireBlock, { backgroundColor: i === 0 ? pal.accent : pal.card, borderColor: pal.ink }]}>
          <T variant="micro" weight="bold" color={i === 0 ? pal.onAccent : pal.text} numberOfLines={1}>
            {BLOCK_SHORT[k]}
          </T>
        </View>
      ))}
    </View>
  );
}

/** One ready-made Home layout, as a thumbnail of its order. The chosen one stands up on a plate, its name is highlighted and it has a tick. */
export function LayoutCard({ pal, preset, selected, onPress }: { pal: Pal; preset: Preset; selected: boolean; onPress: () => void }) {
  const l = LAYOUTS[preset];
  const a = useMemo(() => layoutAnswers(preset), [preset]);
  return (
    <Plate corner={radius.card} color={selected ? pal.plate : 'transparent'} style={{ flex: 1 }}>
      <Press
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${l.name} layout`}
        accessibilityHint={l.blurb}
        scaleTo={0.97}
        style={[styles.layoutCard, { backgroundColor: pal.card, borderColor: pal.ink }]}>
        <HomeWire pal={pal} order={a.order} sections={a.sections} />
        {selected ? (
          <View style={styles.layoutTick}>
            <CheckBadge pal={pal} size={20} />
          </View>
        ) : null}
        <View style={[styles.layoutFoot, { borderTopColor: pal.ink, backgroundColor: selected ? pal.accent : pal.card }]}>
          <T variant="small" weight="bold" color={selected ? pal.onAccent : pal.text} numberOfLines={1}>
            {l.name}
          </T>
        </View>
      </Press>
    </Plate>
  );
}

/** Three bars that rise, with `lit` of them filled: how big the celebrations are, drawn instead of an emoji. */
export function Meter({ pal, lit }: { pal: Pal; lit: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.meter}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 9, height: 10 + i * 8, borderWidth: line, borderColor: pal.ink, backgroundColor: i < lit ? pal.accent : 'transparent' }} />
      ))}
    </View>
  );
}

/** One Effects setting: its meter, a name and one line. The chosen one stands up on a plate with a tick. */
export function EffectRow({ pal, level, on, bars, label, sub, onPress }: { pal: Pal; level: Effects; on: boolean; bars: number; label: string; sub: string; onPress: () => void }) {
  return (
    <Plate corner={radius.card} color={on ? pal.plate : 'transparent'}>
      <Press
        onPress={onPress}
        testID={`effects-${level}`}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={label}
        accessibilityHint={sub}
        scaleTo={0.98}
        style={[styles.option, { backgroundColor: pal.card, borderColor: pal.ink }]}>
        <Meter pal={pal} lit={bars} />
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold" color={pal.text}>
            {label}
          </T>
          <Tx pal={pal} tone="secondary" variant="small">
            {sub}
          </Tx>
        </View>
        {on ? <CheckBadge pal={pal} /> : <View style={[styles.emptyBox, { borderColor: pal.textMuted }]} />}
      </Press>
    </Plate>
  );
}

/** A flat card with one switch (a daily reminder). */
export function SwitchRow({ pal, icon, label, sub, value, onChange }: { pal: Pal; icon: IconName; label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.switchRow, { backgroundColor: pal.card, borderColor: pal.ink }]}>
      <View style={[styles.switchIcon, { borderColor: pal.ink, backgroundColor: pal.bgAlt }]}>
        <Ionicons name={icon} size={20} color={pal.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="title" weight="bold" color={pal.text}>
          {label}
        </T>
        <Tx pal={pal} tone="secondary" variant="small">
          {sub}
        </Tx>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: pal.borderStrong, true: pal.ink }}
        thumbColor={switchThumb(pal)}
        {...({ activeThumbColor: pal.accent } as object)}
      />
    </View>
  );
}

/** One answer on the last page: a small caps label over the answer. Tapping the row opens the step where it can be changed. */
export function SummaryRow({ pal, label, value, onPress, last }: { pal: Pal; label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.99}
      accessibilityLabel={`Change ${label.toLowerCase()}, now ${value}`}
      style={[styles.summary, !last && { borderBottomWidth: hair, borderBottomColor: pal.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Tx pal={pal} tone="secondary" variant="kicker">
          {label}
        </Tx>
        <T variant="title" weight="bold" color={pal.text} numberOfLines={2}>
          {value}
        </T>
      </View>
      <Ionicons name="create-outline" size={20} color={pal.ink} />
    </Press>
  );
}

/**
 * Hides the hard cut when the survey repaints in a new theme: the old page colour sits on top for an instant and fades away
 * (opacity only, 240 ms), so the screen dissolves into the new look instead of jumping. It never takes a tap.
 */
export function PaletteVeil({ pal, signature }: { pal: Pal; signature: string }) {
  const motion = useMotion();
  const [state, setState] = useState<{ cur: { sig: string; pal: Pal }; prev: Pal | null; n: number }>({ cur: { sig: signature, pal }, prev: null, n: 0 });
  const [v] = useState(() => new Animated.Value(0));
  // when the look changes, keep the old colours around to fade them out
  if (state.cur.sig !== signature) setState({ cur: { sig: signature, pal }, prev: state.cur.pal, n: state.n + 1 });
  const { n } = state;

  useEffect(() => {
    if (!motion || n === 0) return;
    v.setValue(0.85);
    const a = Animated.timing(v, { toValue: 0, duration: 240, useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [n, motion, v]);

  if (!motion || !state.prev) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v, backgroundColor: state.prev.bg }]} />;
}

const styles = StyleSheet.create({
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bullet: { width: 10, height: 10, borderWidth: 1.5 },
  seg: { flex: 1, height: 14, borderWidth: line, borderRadius: 2 },
  mini: { borderWidth: line, borderRadius: radius.xs + 2, padding: 6, gap: 5 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniStamp: { width: 20, height: 14, borderWidth: 1.5 },
  miniDashes: { flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  miniBar: { height: 7, borderWidth: 1.5, overflow: 'hidden' },
  themeTile: { borderWidth: line, borderRadius: radius.card, overflow: 'hidden' },
  themeField: { padding: 10, borderBottomWidth: line },
  themeFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 10 },
  swatch: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
  wire: { padding: 8, gap: 4 },
  wireHero: { height: 24, borderRadius: radius.xs, alignItems: 'flex-start', justifyContent: 'flex-end', padding: 4 },
  wireBlock: { height: 26, borderWidth: 1.5, borderRadius: radius.xs, justifyContent: 'center', paddingHorizontal: 6 },
  layoutCard: { borderWidth: line, borderRadius: radius.card, overflow: 'hidden' },
  layoutFoot: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 6, borderTopWidth: line },
  layoutTick: { position: 'absolute', top: 12, right: 12 },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 34, width: 39 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, borderRadius: radius.card, borderWidth: line },
  emptyBox: { width: 26, height: 26, borderRadius: radius.xs, borderWidth: line },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, borderRadius: radius.card, borderWidth: line },
  switchIcon: { width: 40, height: 40, borderRadius: radius.button, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 10 },
});
