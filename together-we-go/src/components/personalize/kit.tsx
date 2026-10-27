/**
 * The survey's own building blocks. "Make it yours" repaints the whole screen in the look being picked (before it is applied),
 * so it cannot use the shared components, which read the app's colours once when they load. These draw the same things
 * (button with a plate, stamp, ticket, rule, segmented control) from a palette object (`pal`) instead.
 * In Settings, pass the app's own `colors` as `pal` and they look exactly like the shared ones.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import { Plate, PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Perforation } from '@/components/ui/Rule';
import { T, type TProps } from '@/components/ui/T';
import { fonts, line, radius } from '@/theme';
import { luminance } from '@/utils/contrast';

import type { Pal } from './palette';

type Tone = 'text' | 'secondary' | 'muted' | 'accent';

/** Text in the survey's palette (not the app's). */
export function Tx({ pal, tone = 'text', ...rest }: TProps & { pal: Pal; tone?: Tone }) {
  const color = tone === 'text' ? pal.text : tone === 'secondary' ? pal.textSecondary : tone === 'muted' ? pal.textMuted : pal.accentText;
  return <T color={color} {...rest} />;
}

/** The thumb of a switch that is off: the lightest colour of the palette, so it shows against the track in both the light and the dark mode. */
export function switchThumb(pal: Pal): string {
  return luminance(pal.card) > luminance(pal.ink) ? pal.card : pal.ink;
}

/** A solid ink line, like a newspaper rule. */
export function PalRule({ pal, weight = line, style }: { pal: Pal; weight?: number; style?: StyleProp<ViewStyle> }) {
  return <View accessibilityElementsHidden importantForAccessibility="no" style={[{ height: weight, backgroundColor: pal.ink }, style]} />;
}

/** The big button at the bottom of a step: ink (cream at night) with the accent as its plate, 56 high, full width. */
export function PalButton({
  pal,
  label,
  onPress,
  icon,
  iconRight,
  variant = 'primary',
  disabled,
  testID,
  accessibilityLabel,
}: {
  pal: Pal;
  label: string;
  onPress: () => void;
  icon?: IconName;
  iconRight?: IconName;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const primary = variant === 'primary';
  const fg = primary ? pal.onPrimary : pal.text;
  return (
    <PlatePress
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      color={primary ? pal.accent : pal.plate}
      corner={radius.button}
      wrapperStyle={[{ alignSelf: 'stretch' }, disabled && { opacity: 0.45 }]}
      style={[styles.button, { backgroundColor: primary ? pal.primary : pal.card, borderColor: pal.ink }]}>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <T variant="title" weight="bold" color={fg}>
        {label}
      </T>
      {iconRight ? <Ionicons name={iconRight} size={19} color={fg} /> : null}
    </PlatePress>
  );
}

/** A square outlined icon button (back, close) with its own small plate. 44 x 44. */
export function PalIconButton({ pal, icon, onPress, label }: { pal: Pal; icon: IconName; onPress: () => void; label: string }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} color={pal.plate} style={[styles.iconButton, { backgroundColor: pal.card, borderColor: pal.ink }]}>
      <Ionicons name={icon} size={20} color={pal.ink} />
    </PlatePress>
  );
}

/** A row of choices in one outline (Light / Dark / System): the chosen one is filled with ink. */
export function PalSegmented<K extends string>({
  pal,
  options,
  value,
  onChange,
  label,
}: {
  pal: Pal;
  options: { key: K; label: string; icon?: IconName }[];
  value: K;
  onChange: (k: K) => void;
  label?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segTrack, { backgroundColor: pal.card, borderColor: pal.ink }]}>
      {options.map((o) => {
        const on = o.key === value;
        const fg = on ? pal.onPrimary : pal.text;
        return (
          <Press
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            scaleTo={0.98}
            style={[styles.segItem, on && { backgroundColor: pal.primary }]}>
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

/** A small square that shows a choice is made: the accent with an ink tick (a sticker), so it is not told by colour alone. */
export function CheckBadge({ pal, size = 26 }: { pal: Pal; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.xs, backgroundColor: pal.accent, borderWidth: line, borderColor: pal.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="checkmark" size={Math.round(size * 0.66)} color={pal.onAccent} />
    </View>
  );
}

export type PalTone = 'ink' | 'accent' | 'positive' | 'muted';

/** A rubber stamp drawn in the survey's palette. With `slam` it lands with a thud. */
export function PalStamp({ pal, label, tone = 'ink', rotate = -3, slam }: { pal: Pal; label: string; tone?: PalTone; rotate?: number; slam?: boolean }) {
  const c =
    tone === 'accent'
      ? { fg: pal.onAccent, bg: pal.accent, line: pal.ink }
      : tone === 'positive'
        ? { fg: pal.positive, bg: pal.positiveSoft, line: pal.positive }
        : tone === 'muted'
          ? { fg: pal.textSecondary, bg: 'transparent', line: pal.borderStrong }
          : { fg: pal.ink, bg: 'transparent', line: pal.ink };
  const motion = useMotion();
  const [t] = useState(() => new Animated.Value(slam && motion ? 0 : 1));
  useEffect(() => {
    if (!slam || !motion) return;
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [slam, motion, t]);
  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[
        styles.stamp,
        { borderColor: c.line, backgroundColor: c.bg, opacity: t, transform: [{ rotate: `${rotate}deg` }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) }] },
      ]}>
      <T variant="kicker" color={c.fg} importantForAccessibility="no">
        {label}
      </T>
    </Animated.View>
  );
}

const NOTCH = 22;

/** Half a punched hole in the left or right edge of a ticket. */
function Notch({ side, pal }: { side: 'left' | 'right'; pal: Pal }) {
  const edge = side === 'left' ? { left: -line } : { right: -line };
  const pos = side === 'left' ? { left: -NOTCH / 2 } : { right: -NOTCH / 2 };
  return (
    <View pointerEvents="none" style={[styles.notchBox, edge]}>
      <View style={[styles.ring, pos, { backgroundColor: pal.ink }]} />
      <View style={[styles.hole, side === 'left' ? { left: -NOTCH / 2 + 2.5 } : { right: -NOTCH / 2 + 2.5 }, { backgroundColor: pal.bg }]} />
    </View>
  );
}

/** A boarding pass in the survey's palette: a main part and, optionally, a stub below a perforated tear line. */
export function PalTicket({ pal, children, stub, plated = true, style }: { pal: Pal; children: ReactNode; stub?: ReactNode; plated?: boolean; style?: StyleProp<ViewStyle> }) {
  const card = (
    <View style={[styles.ticket, { backgroundColor: pal.card, borderColor: pal.ink }]}>
      {children}
      {stub ? (
        <>
          <View style={styles.tear}>
            <Notch side="left" pal={pal} />
            <Perforation style={styles.dashes} color={pal.ink} />
            <Notch side="right" pal={pal} />
          </View>
          {stub}
        </>
      ) : null}
    </View>
  );
  return plated ? (
    <Plate corner={radius.card} color={pal.plate} style={style}>
      {card}
    </Plate>
  ) : (
    <View style={style}>{card}</View>
  );
}

/** One tile of a departures board: a digit, white on ink, that flips when it changes (still when animations are off). */
function FlapTile({ pal, ch, size }: { pal: Pal; ch: string; size: number }) {
  const motion = useMotion();
  const [state, setState] = useState({ cur: ch, prev: ch });
  const [t] = useState(() => new Animated.Value(1));
  if (state.cur !== ch) setState({ cur: ch, prev: state.cur });
  useEffect(() => {
    if (!motion || state.prev === state.cur) {
      t.setValue(1);
      return;
    }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [state, motion, t]);

  const face = { fontFamily: fonts.mono, fontSize: Math.round(size * 0.74), lineHeight: size, color: pal.bg, textAlign: 'center' as const, includeFontPadding: false };
  const flipping = motion && state.prev !== state.cur;
  return (
    <View style={[styles.tile, { width: Math.round(size * 0.68), height: size, borderRadius: Math.round(size * 0.1), backgroundColor: pal.ink }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: t.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] }), transform: [{ scaleY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }) }] },
        ]}>
        <Text style={face} allowFontScaling={false}>
          {ch}
        </Text>
      </Animated.View>
      {flipping ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: t.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] }), transform: [{ scaleY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) }] },
          ]}>
          <Text style={face} allowFontScaling={false}>
            {state.prev}
          </Text>
        </Animated.View>
      ) : null}
      <View pointerEvents="none" style={[styles.hinge, { top: size / 2 - 1, backgroundColor: pal.bg }]} />
    </View>
  );
}

/** A number on departure-board tiles, in the survey's palette. */
export function PalFlap({ pal, value, size = 64 }: { pal: Pal; value: string; size?: number }) {
  return (
    <View accessible accessibilityLabel={value} style={{ flexDirection: 'row', gap: Math.max(3, Math.round(size / 16)) }}>
      {value.split('').map((ch, i, all) => (
        <FlapTile key={all.length - i} pal={pal} ch={ch} size={size} />
      ))}
    </View>
  );
}

/** A chunky bar in an ink outline that fills with the accent. */
export function PalBar({ pal, value, height = 14 }: { pal: Pal; value: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: radius.xs, backgroundColor: pal.card, borderWidth: line, borderColor: pal.ink, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: pal.accent, borderRightWidth: pct > 0 && pct < 1 ? line : 0, borderColor: pal.ink }} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: radius.button, borderWidth: line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  iconButton: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
  segTrack: { flexDirection: 'row', borderRadius: radius.button, borderWidth: line, padding: 3, gap: 3 },
  segItem: { flex: 1, height: 44, borderRadius: Math.max(2, radius.button - 3), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stamp: { alignSelf: 'flex-start', borderWidth: line, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3 },
  ticket: { borderWidth: line, borderRadius: radius.card },
  tear: { height: NOTCH, justifyContent: 'center' },
  dashes: { marginHorizontal: NOTCH / 2 + 4 },
  notchBox: { position: 'absolute', top: 0, width: NOTCH / 2 + line, height: NOTCH, overflow: 'hidden' },
  ring: { position: 'absolute', top: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH },
  hole: { position: 'absolute', top: 2.5, width: NOTCH - 5, height: NOTCH - 5, borderRadius: NOTCH },
  tile: { overflow: 'hidden', justifyContent: 'center' },
  hinge: { position: 'absolute', left: 0, right: 0, height: 2, opacity: 0.55 },
});
