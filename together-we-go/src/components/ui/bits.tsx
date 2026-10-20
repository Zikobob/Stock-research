/** Small presentational building blocks shared by every screen. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { imageSource } from '@/data/images';
import { colors, radius, shadow } from '@/theme';
import { initials } from '@/utils/format';

import { Float } from './motion';
import { Press } from './Press';
import { T } from './T';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** A card: flat surface, 12 px corners, a hairline border and (light mode only) a soft shadow. */
export function Card({ children, style, padded = true, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; accessibilityLabel?: string }) {
  const s = [styles.card, padded && { padding: 16 }, style];
  if (onPress)
    return (
      <Press onPress={onPress} style={s} scaleTo={0.985} accessibilityLabel={accessibilityLabel}>
        {children}
      </Press>
    );
  return <View style={s}>{children}</View>;
}

/** Pill for choosing: filled black (white in the dark mode) when selected. */
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
  const bg = active ? colors.primary : tone === 'soft' ? colors.bgAlt : colors.card;
  const fg = active ? colors.onPrimary : colors.text;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        small && styles.chipSmall,
        { backgroundColor: bg, borderColor: active ? colors.primary : colors.border },
        !!image && { paddingLeft: 5 },
        style,
      ]}>
      {image ? <Image source={imageSource(image)} style={styles.chipImg} contentFit="cover" /> : null}
      {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={fg} /> : null}
      <T variant={small ? 'caption' : 'small'} weight={active ? 'bold' : 'semibold'} color={fg} numberOfLines={1}>
        {label}
      </T>
    </Press>
  );
}

/** A person: initials on a quiet tint (the picture, if they have one, takes over). */
export function Avatar({ name, src, size = 34, ring, dot }: { name: string; src?: string; size?: number; ring?: string; /** A small status dot, for example green for "here now". */ dot?: string }) {
  const tints = [colors.bgAlt, colors.accentSoft, colors.primarySoft, colors.cardMuted];
  const bg = tints[(name.charCodeAt(0) + name.length) % tints.length];
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: ring ? 2 : 0,
          borderColor: ring,
        }}>
        {src ? (
          <Image source={imageSource(src)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <T variant={size > 40 ? 'title' : 'micro'} weight="bold" color={colors.text} style={size <= 28 ? { fontSize: 10 } : null}>
            {initials(name)}
          </T>
        )}
      </View>
      {dot ? <View style={[styles.avatarDot, { backgroundColor: dot, width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28), borderRadius: size }]} /> : null}
    </View>
  );
}

export function AvatarStack({ people, max = 3, size = 28 }: { people: { name: string; avatar?: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={`${p.name}${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}>
          <Avatar name={p.name} src={p.avatar} size={size} ring={colors.card} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.32,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <T variant="micro" weight="bold" color={colors.onPrimary}>
            +{extra}
          </T>
        </View>
      )}
    </View>
  );
}

/** A thin bar. Pass a state colour (`colors.positive`, `colors.warn`, `colors.red`) only when it means something. */
export function ProgressBar({ value, color = colors.primary, track = colors.bgAlt, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** Round icon button, 44 points by default. */
export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  bg = colors.card,
  color = colors.text,
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
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: bordered ? 1 : 0,
        borderColor: colors.border,
      }}>
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
    </Press>
  );
}

/** A block's title in condensed display type, with an optional quiet action on the right. */
export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {title}
      </T>
      {action ? (
        <Press onPress={onAction} hitSlop={8} accessibilityLabel={action} style={styles.sectionAction}>
          <T variant="small" weight="bold" color={colors.textSecondary}>
            {action}
          </T>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Press>
      ) : null}
    </View>
  );
}

/**
 * A small label. The green, amber and red tones are for states only (under budget, near, over; going, maybe, can't go).
 * Blue and purple are quiet info tints; yellow is the theme accent.
 */
export function Pill({ label, tone = 'green', icon }: { label: string; tone?: 'green' | 'orange' | 'blue' | 'red' | 'gray' | 'yellow' | 'purple'; icon?: IconName }) {
  const map = {
    green: [colors.positiveSoft, colors.positive],
    orange: [colors.warnSoft, colors.warn],
    blue: [colors.blueSoft, colors.blue],
    red: [colors.redSoft, colors.red],
    gray: [colors.bgAlt, colors.textSecondary],
    yellow: [colors.accentSoft, colors.accentText],
    purple: [colors.purpleSoft, colors.purple],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <T variant="micro" weight="bold" color={fg}>
        {label}
      </T>
    </View>
  );
}

/**
 * An empty list turned into an invitation: a big playful picture, a title in display type, one line of help and one button.
 * `art` is an emoji that gently floats; without it a round icon is used.
 */
export function EmptyState({ icon, title, body, children, art }: { icon?: IconName; title: string; body?: string; children?: ReactNode; art?: string }) {
  return (
    <View style={styles.empty}>
      {art ? (
        <Float amount={8}>
          <T style={{ fontSize: 52, lineHeight: 60 }} accessibilityElementsHidden importantForAccessibility="no">
            {art}
          </T>
        </Float>
      ) : (
        <View style={styles.emptyIcon}>
          <Ionicons name={icon ?? 'sparkles-outline'} size={28} color={colors.accentText} />
        </View>
      )}
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
          <Ionicons name={icon} size={18} color={colors.text} />
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
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.white}
        {...({ activeThumbColor: colors.white } as object)}
      />
    </View>
  );
}

export function ListRow({ icon, label, sub, onPress, right, tint = colors.text }: { icon: IconName; label: string; sub?: string; onPress?: () => void; right?: ReactNode; tint?: string }) {
  return (
    <Press onPress={onPress} style={styles.listRow} scaleTo={0.99} accessibilityLabel={label}>
      <View style={[styles.rowIcon, { backgroundColor: tint === colors.text ? colors.bgAlt : `${tint}1F` }]}>
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
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Press>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipSmall: { height: 36, paddingHorizontal: 13, gap: 5 },
  chipImg: { width: 32, height: 32, borderRadius: 16 },
  avatarDot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: colors.card },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, minHeight: 44 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.button + 2, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 56 },
});
