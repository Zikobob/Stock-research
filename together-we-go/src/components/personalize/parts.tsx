/**
 * Building blocks of "Make it yours" (and of the Look and Home-layout cards in Settings).
 * Everything here draws itself with a palette object (`pal`) instead of the global colours, so the survey can repaint itself
 * live in a theme that is not applied yet. In Settings, pass the app's own `colors` as `pal`.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T, type TProps } from '@/components/ui/T';
import { photos } from '@/data/images';
import { LAYOUTS, layoutAnswers, visibleSections, type Preset } from '@/data/layouts';
import { radius, themes, timing, type ModePref, type ThemeKey } from '@/theme';

import { BLOCK_SHORT, MODES } from './options';
import { paletteOf, type Pal } from './palette';

type Tone = 'text' | 'secondary' | 'muted' | 'accent';

/** Text in the survey's palette (not the app's). */
export function Tx({ pal, tone = 'text', ...rest }: TProps & { pal: Pal; tone?: Tone }) {
  const color = tone === 'text' ? pal.text : tone === 'secondary' ? pal.textSecondary : tone === 'muted' ? pal.textMuted : pal.accentText;
  return <T color={color} {...rest} />;
}

/** The question of a step in display type, with one line under it. */
export function StepHeading({ pal, title, sub }: { pal: Pal; title: string; sub: string }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="display" color={pal.text} accessibilityRole="header">
        {title}
      </T>
      <T variant="body" color={pal.textSecondary}>
        {sub}
      </T>
    </View>
  );
}

/** The big button at the bottom of a step: black (white in the dark mode), 56 high, full width. */
export function PalButton({ pal, label, onPress, icon, iconRight, variant = 'primary', disabled, testID, accessibilityLabel }: { pal: Pal; label: string; onPress: () => void; icon?: IconName; iconRight?: IconName; variant?: 'primary' | 'secondary'; disabled?: boolean; testID?: string; accessibilityLabel?: string }) {
  const primary = variant === 'primary';
  const fg = primary ? pal.onPrimary : pal.text;
  return (
    <Press
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.button, { backgroundColor: primary ? pal.primary : 'transparent', borderColor: primary ? pal.primary : pal.borderStrong }, disabled && { opacity: 0.45 }]}>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <T variant="title" weight="bold" color={fg}>
        {label}
      </T>
      {iconRight ? <Ionicons name={iconRight} size={19} color={fg} /> : null}
    </Press>
  );
}

/** A pill-shaped choice between a few options (Light / Dark / System): the chosen one is filled black (white in the dark mode). */
export function PalSegmented<K extends string>({ pal, options, value, onChange, label }: { pal: Pal; options: { key: K; label: string; icon?: IconName }[]; value: K; onChange: (k: K) => void; label?: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segTrack, { backgroundColor: pal.bgAlt }]}>
      {options.map((o) => {
        const on = o.key === value;
        const fg = on ? pal.onPrimary : pal.textSecondary;
        return (
          <Press key={o.key} onPress={() => onChange(o.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={o.label} scaleTo={0.98} style={[styles.segItem, { backgroundColor: on ? pal.primary : 'transparent' }]}>
            {o.icon ? <Ionicons name={o.icon} size={16} color={fg} /> : null}
            <T variant="small" weight="bold" color={fg}>
              {o.label}
            </T>
          </Press>
        );
      })}
    </View>
  );
}

/** Light / Dark / System. */
export function ModePicker({ pal, value, onChange }: { pal: Pal; value: ModePref; onChange: (m: ModePref) => void }) {
  return <PalSegmented pal={pal} options={MODES} value={value} onChange={onChange} label="Light or dark" />;
}

/** One bar of the progress indicator; it fills with a short slide. */
function Seg({ pal, on }: { pal: Pal; on: boolean }) {
  const motion = useMotion();
  const [v] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (!motion) {
      v.setValue(on ? 1 : 0);
      return;
    }
    const a = Animated.timing(v, { toValue: on ? 1 : 0, duration: timing.base, useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [on, motion, v]);
  return (
    <View style={[styles.seg, { backgroundColor: pal.border }]}>
      <Animated.View style={[styles.segFill, { backgroundColor: pal.primary, transform: [{ scaleX: v }], transformOrigin: 'left center' }]} />
    </View>
  );
}

/** "Step 2 of 5" as five bars (goal-gradient: the person sees how close the end is). */
export function StepBar({ pal, step, total }: { pal: Pal; step: number; total: number }) {
  const now = Math.min(step + 1, total);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Step ${now} of ${total}`} accessibilityValue={{ min: 1, max: total, now }} style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <Seg key={i} pal={pal} on={i <= step} />
      ))}
    </View>
  );
}

/**
 * One theme as a swatch: a tiny Home hero (photo, the days to go, the accent) in that theme's own colours, with a quiet wash behind it.
 * Chosen = a black (white) ring and a tick, so the state is not told by colour alone.
 */
export function ThemeCard({ pal, theme, mode, selected, onPress }: { pal: Pal; theme: ThemeKey; mode: ModePref; selected: boolean; onPress: () => void }) {
  const tp = useMemo(() => paletteOf(theme, mode), [theme, mode]);
  const t = themes[theme];
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${t.name} theme`}
      accessibilityHint={t.vibe}
      scaleTo={0.97}
      style={[styles.themeCard, { borderColor: selected ? pal.primary : pal.border, backgroundColor: tp.card }]}>
      <LinearGradient colors={[tp.washFrom, tp.washTo, tp.bg]} style={styles.themeTop}>
        <View style={styles.themeHero}>
          <Image source={photos.amalfi} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
          <View style={styles.themeHeroRow}>
            <T variant="numeralSm" color={tp.white}>
              3
            </T>
            <View style={[styles.themeAccentPill, { backgroundColor: tp.accent }]} />
          </View>
        </View>
        <View style={styles.themeRow}>
          <View style={[styles.themeStub, { backgroundColor: tp.primary }]} />
          <View style={[styles.themeBar, { backgroundColor: tp.border }]}>
            <View style={{ width: '62%', height: '100%', backgroundColor: tp.accent }} />
          </View>
        </View>
      </LinearGradient>
      <View style={[styles.themeFoot, { backgroundColor: tp.card }]}>
        <T style={{ fontSize: 18, lineHeight: 22 }} accessibilityElementsHidden importantForAccessibility="no">
          {t.emoji}
        </T>
        <T variant="title" weight="bold" color={tp.text} numberOfLines={1} style={{ flex: 1 }}>
          {t.name}
        </T>
        {selected ? <Ionicons name="checkmark-circle" size={22} color={tp.text} /> : null}
      </View>
    </Press>
  );
}

/** The six themes, two to a row. */
export function ThemeGrid({ pal, theme, mode, onPick }: { pal: Pal; theme: ThemeKey; mode: ModePref; onPick: (k: ThemeKey) => void }) {
  const keys = Object.keys(themes) as ThemeKey[];
  const rows: ThemeKey[][] = [];
  for (let i = 0; i < keys.length; i += 2) rows.push(keys.slice(i, i + 2));
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Colour theme" style={{ gap: 12 }}>
      {rows.map((row) => (
        <View key={row.join()} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <ThemeCard pal={pal} theme={k} mode={mode} selected={theme === k} onPress={() => onPick(k)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** A tiny drawing of the Home order: the first block is the loud one (accent), the rest are flat grey boxes with their names. */
export function HomeWire({ pal, order, sections }: { pal: Pal; order: ReturnType<typeof layoutAnswers>['order']; sections: ReturnType<typeof layoutAnswers>['sections'] }) {
  const blocks = visibleSections({ order, sections }).slice(0, 6);
  return (
    <View style={[styles.wire, { backgroundColor: pal.bgAlt }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {blocks.map((k, i) => (
        <View key={k} style={[styles.wireBlock, { height: i === 0 ? 34 : 24, backgroundColor: i === 0 ? pal.accent : pal.card, borderColor: i === 0 ? pal.accent : pal.border }]}>
          <T variant="micro" weight="bold" color={i === 0 ? pal.onAccent : pal.textSecondary} numberOfLines={1}>
            {BLOCK_SHORT[k]}
          </T>
        </View>
      ))}
    </View>
  );
}

/** One ready-made Home layout, as a thumbnail of its order. */
export function LayoutCard({ pal, preset, selected, onPress }: { pal: Pal; preset: Preset; selected: boolean; onPress: () => void }) {
  const l = LAYOUTS[preset];
  const a = useMemo(() => layoutAnswers(preset), [preset]);
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${l.name} layout`}
      accessibilityHint={l.blurb}
      scaleTo={0.97}
      style={[styles.layoutCard, { backgroundColor: pal.card, borderColor: selected ? pal.primary : pal.border }]}>
      <HomeWire pal={pal} order={a.order} sections={a.sections} />
      <View style={styles.layoutFoot}>
        <T style={{ fontSize: 16, lineHeight: 20 }} accessibilityElementsHidden importantForAccessibility="no">
          {l.emoji}
        </T>
        <T variant="small" weight="bold" color={pal.text}>
          {l.name}
        </T>
        {selected ? <Ionicons name="checkmark-circle" size={18} color={pal.text} /> : null}
      </View>
    </Press>
  );
}

/** A big choice with a picture (emoji), a name and one line: the chosen one has a black (white) ring and a tick. */
export function OptionRow({ pal, on, emoji, label, sub, onPress }: { pal: Pal; on: boolean; emoji: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      accessibilityHint={sub}
      scaleTo={0.98}
      style={[styles.option, { backgroundColor: pal.card, borderColor: on ? pal.primary : pal.border }]}>
      <T style={{ fontSize: 30, lineHeight: 36 }} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </T>
      <View style={{ flex: 1 }}>
        <T variant="title" weight="bold" color={pal.text}>
          {label}
        </T>
        <T variant="small" color={pal.textSecondary}>
          {sub}
        </T>
      </View>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? pal.text : pal.borderStrong} />
    </Press>
  );
}

/** A card with one switch (a daily reminder). The thumb flips with the track so it is seen in both modes. */
export function SwitchRow({ pal, icon, label, sub, value, onChange }: { pal: Pal; icon: IconName; label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.switchRow, { backgroundColor: pal.card, borderColor: pal.border }]}>
      <View style={[styles.switchIcon, { backgroundColor: pal.bgAlt }]}>
        <Ionicons name={icon} size={20} color={pal.text} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="title" weight="bold" color={pal.text}>
          {label}
        </T>
        <T variant="small" color={pal.textSecondary}>
          {sub}
        </T>
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: pal.borderStrong, true: pal.primary }} thumbColor={value ? pal.onPrimary : pal.white} {...({ activeThumbColor: pal.onPrimary } as object)} />
    </View>
  );
}

/** One answer on the last page. Tapping the row opens the step where it can be changed. */
export function SummaryRow({ pal, icon, label, value, onPress, last }: { pal: Pal; icon: IconName; label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <Press onPress={onPress} scaleTo={0.99} accessibilityLabel={`Change ${label.toLowerCase()}, now ${value}`} style={[styles.summary, !last && { borderBottomWidth: 1, borderBottomColor: pal.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: pal.bgAlt }]}>
        <Ionicons name={icon} size={18} color={pal.text} />
      </View>
      <T variant="small" color={pal.textSecondary} style={{ width: 92 }} numberOfLines={2}>
        {label}
      </T>
      <T variant="small" weight="bold" color={pal.text} style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </T>
      <Ionicons name="create-outline" size={18} color={pal.textMuted} />
    </Press>
  );
}

/**
 * Hides the hard cut when the survey repaints in a new theme: the old page colours sit on top for an instant and fade away
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
    v.setValue(0.8);
    const a = Animated.timing(v, { toValue: 0, duration: 240, useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [n, motion, v]);

  if (!motion || !state.prev) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v }]}>
      <LinearGradient colors={[state.prev.washFrom, state.prev.washTo, state.prev.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: radius.button, borderWidth: 1.5, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  segTrack: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segItem: { flex: 1, height: 44, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  segFill: { flex: 1, borderRadius: 3 },
  themeCard: { borderRadius: radius.card, borderWidth: 2, overflow: 'hidden' },
  themeTop: { padding: 8 },
  themeHero: { height: 58, borderRadius: radius.button, overflow: 'hidden', justifyContent: 'flex-end' },
  themeHeroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 4 },
  themeAccentPill: { width: 36, height: 14, borderRadius: 7, marginBottom: 6 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  themeStub: { width: 46, height: 14, borderRadius: 5 },
  themeBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  themeFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, minHeight: 44 },
  wire: { padding: 6, gap: 4, borderRadius: radius.button },
  wireBlock: { borderRadius: 5, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 6 },
  layoutCard: { flex: 1, borderRadius: radius.card, borderWidth: 2, padding: 6, gap: 6 },
  layoutFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, borderRadius: radius.card, borderWidth: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, borderRadius: radius.card, borderWidth: 1 },
  switchIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  summaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
