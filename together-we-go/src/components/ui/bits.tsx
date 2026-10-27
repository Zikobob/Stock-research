/** Small presentational building blocks shared by every screen. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { imageSource } from '@/data/images';
import { colors, hair, isDark, line, radius } from '@/theme';
import { initials } from '@/utils/format';

import { Float } from './motion';
import { Plate, PlatePress } from './Plate';
import { Press } from './Press';
import { Rule } from './Rule';
import { Stamp, stampColors, type StampTone } from './Stamp';
import { T } from './T';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * A card: a paper-white surface with a 2 px ink outline and 12 px corners. `plated` puts the hard plate under it, for the one
 * card on a screen that should stand up (the others lie flat). A pressable card squeezes a little when pressed.
 */
export function Card({ children, style, padded = true, onPress, accessibilityLabel, plated }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; accessibilityLabel?: string; plated?: boolean }) {
  const s = [styles.card, padded && { padding: 16 }, style];
  if (plated) {
    const { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, alignSelf, flex, width } = StyleSheet.flatten(style) ?? {};
    const outer = { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, alignSelf, flex, width };
    const inner = [styles.card, padded && { padding: 16 }];
    return onPress ? (
      <PlatePress onPress={onPress} accessibilityLabel={accessibilityLabel} corner={radius.card} wrapperStyle={outer} style={inner}>
        {children}
      </PlatePress>
    ) : (
      <Plate corner={radius.card} style={outer}>
        <View style={inner}>{children}</View>
      </Plate>
    );
  }
  if (onPress)
    return (
      <Press onPress={onPress} style={s} scaleTo={0.985} accessibilityLabel={accessibilityLabel}>
        {children}
      </Press>
    );
  return <View style={s}>{children}</View>;
}

/** A small outlined rectangle for choosing. Chosen = filled with the accent, like a highlighter pass. */
export function Chip({
  label,
  active,
  onPress,
  icon,
  image,
  small,
  tone,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  image?: string;
  small?: boolean;
  tone?: 'soft';
  style?: StyleProp<ViewStyle>;
}) {
  const bg = active ? colors.accent : tone === 'soft' ? colors.bgAlt : colors.card;
  const fg = active ? colors.onAccent : colors.text;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      scaleTo={0.97}
      style={[styles.chip, small && styles.chipSmall, { backgroundColor: bg, borderColor: colors.ink }, !!image && { paddingLeft: 5 }, style]}>
      {image ? <Image source={imageSource(image)} style={styles.chipImg} contentFit="cover" /> : null}
      {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={fg} /> : null}
      <T variant={small ? 'caption' : 'small'} weight="bold" color={fg} numberOfLines={1}>
        {label}
      </T>
      {active ? <Ionicons name="checkmark" size={14} color={fg} /> : null}
    </Press>
  );
}

/** A person: a photo or initials in an ink ring. */
export function Avatar({ name, src, size = 34, ring, dot }: { name: string; src?: string; size?: number; ring?: string; /** A small status dot, for example green for "here now". */ dot?: string }) {
  const tints = [colors.accentSoft, colors.bgAlt, colors.cardMuted, colors.primarySoft];
  const bg = tints[(name.charCodeAt(0) + name.length) % tints.length];
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: size < 30 ? 1.5 : line, borderColor: ring ?? colors.ink }}>
        {src ? (
          <Image source={imageSource(src)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <T variant="kicker" color={colors.ink} style={{ fontSize: size > 40 ? 15 : 10.5, letterSpacing: 0 }}>
            {initials(name)}
          </T>
        )}
      </View>
      {dot ? <View style={[styles.avatarDot, { backgroundColor: dot, width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28), borderRadius: size }]} /> : null}
    </View>
  );
}

export function AvatarStack({ people, max = 3, size = 28 }: { people: { name: string; avatar?: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={`${p.name}${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar name={p.name} src={p.avatar} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: -size * 0.28, width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, borderWidth: size < 30 ? 1.5 : line, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <T variant="kicker" color={colors.onAccent} style={{ fontSize: 10.5, letterSpacing: 0 }}>
            +{extra}
          </T>
        </View>
      )}
    </View>
  );
}

/** A chunky bar in an ink outline. Pass a state colour (`colors.positive`, `colors.warn`, `colors.red`) only when it means something. */
export function ProgressBar({ value, color = colors.accent, track = colors.card, height = 14 }: { value: number; color?: string; track?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: radius.xs, backgroundColor: track, borderWidth: line, borderColor: colors.ink, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRightWidth: pct > 0 && pct < 1 ? line : 0, borderColor: colors.ink }} />
    </View>
  );
}

/** A square-cornered icon button, 44 points by default, with its own small plate. */
export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  bg = colors.card,
  color = colors.ink,
  badge,
  bordered = true,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  size?: number;
  bg?: string;
  color?: string;
  badge?: number | boolean;
  bordered?: boolean;
}) {
  const face = { width: size, height: size, borderRadius: radius.button, backgroundColor: bg, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: bordered ? line : 0, borderColor: colors.ink };
  const inner = (
    <>
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={color} />
      {badge ? (
        <View style={styles.badge}>
          {typeof badge === 'number' ? (
            <T variant="micro" weight="bold" color={colors.white} style={{ fontSize: 9.5 }}>
              {badge > 9 ? '9+' : badge}
            </T>
          ) : null}
        </View>
      ) : null}
    </>
  );
  return bordered ? (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} color={bg === colors.primary ? colors.accent : colors.plate} style={face}>
      {inner}
    </PlatePress>
  ) : (
    <Press onPress={onPress} accessibilityLabel={label} style={face}>
      {inner}
    </Press>
  );
}

/** The title of a block of the page: a serif headline over an ink rule, with a quiet mono action on the right. */
export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTop}>
        <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {title}
        </T>
        {action ? (
          <Press onPress={onAction} hitSlop={8} accessibilityLabel={action} style={styles.sectionAction}>
            <T variant="kicker" color={colors.ink}>
              {action}
            </T>
            <Ionicons name="arrow-forward" size={14} color={colors.ink} />
          </Press>
        ) : null}
      </View>
      <Rule />
    </View>
  );
}

/**
 * A small status tag, drawn like a stamp. Green, amber and red are for states only (under budget, near, over; going, maybe,
 * can't go). `yellow` is the theme accent; blue and purple are quiet info tints.
 */
export function Pill({ label, tone = 'green', icon }: { label: string; tone?: 'green' | 'orange' | 'blue' | 'red' | 'gray' | 'yellow' | 'purple'; icon?: IconName }) {
  const map: Record<string, StampTone> = { green: 'positive', orange: 'warn', red: 'danger', gray: 'muted', yellow: 'accent', blue: 'ink', purple: 'ink' };
  return <Stamp label={label} tone={map[tone]} icon={icon} rotate={0} />;
}
export { stampColors };

/**
 * An empty list turned into an invitation: a big line icon in a dashed ring, a serif prompt, one line of help and one button.
 * (`art` is ignored: the app uses line icons, not emoji.)
 */
export function EmptyState({ icon, title, body, children }: { icon?: IconName; title: string; body?: string; children?: ReactNode; art?: string }) {
  return (
    <View style={styles.empty}>
      <Float amount={6}>
        <View style={styles.emptyIcon}>
          <Ionicons name={icon ?? 'airplane-outline'} size={34} color={colors.ink} />
        </View>
      </Float>
      <T variant="headline" center accessibilityRole="header">
        {title}
      </T>
      {body ? (
        <T variant="small" color={colors.textSecondary} center>
          {body}
        </T>
      ) : null}
      {children ? <View style={{ alignSelf: 'stretch', marginTop: 8 }}>{children}</View> : null}
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, icon }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  return (
    <View style={styles.toggleRow}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={colors.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="bodySm" weight="semibold">
          {label}
        </T>
        {sub ? (
          <T variant="caption" color={colors.textSecondary}>
            {sub}
          </T>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.ink }}
        thumbColor={isDark ? colors.ink : colors.card}
        {...({ activeThumbColor: colors.accent } as object)}
      />
    </View>
  );
}

export function ListRow({ icon, label, sub, onPress, right, tint = colors.ink }: { icon: IconName; label: string; sub?: string; onPress?: () => void; right?: ReactNode; tint?: string }) {
  return (
    <Press onPress={onPress} style={styles.listRow} scaleTo={0.99} accessibilityLabel={label}>
      <View style={[styles.rowIcon, tint !== colors.ink && { backgroundColor: `${tint}1F`, borderColor: tint }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodySm" weight="semibold">
          {label}
        </T>
        {sub ? (
          <T variant="caption" color={colors.textSecondary} numberOfLines={2}>
            {sub}
          </T>
        ) : null}
      </View>
      {right ?? <Ionicons name="arrow-forward" size={16} color={colors.ink} />}
    </Press>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: hair, backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: line,
    borderColor: colors.ink,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: line,
  },
  chipSmall: { paddingHorizontal: 11, gap: 5 },
  chipImg: { width: 30, height: 30, borderRadius: radius.xs },
  avatarDot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: colors.ink },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  sectionHeader: { marginBottom: 14, gap: 8 },
  sectionTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 36 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingLeft: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: line,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  rowIcon: { width: 38, height: 38, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 56 },
});
