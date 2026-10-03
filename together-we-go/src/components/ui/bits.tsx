/** Small presentational building blocks shared by every screen. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { imageSource } from '@/data/images';
import { colors, radius, shadow } from '@/theme';
import { initials } from '@/utils/format';

import { Press } from './Press';
import { T } from './T';

export type IconName = ComponentProps<typeof Ionicons>['name'];

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
  const bg = active ? colors.primary : tone === 'soft' ? colors.primarySofter : colors.card;
  const fg = active ? colors.white : colors.text;
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
      {icon ? <Ionicons name={icon} size={small ? 13 : 15} color={fg} /> : null}
      <T variant={small ? 'caption' : 'small'} weight={active ? 'semibold' : 'medium'} color={fg} numberOfLines={1}>
        {label}
      </T>
    </Press>
  );
}

export function Avatar({ name, src, size = 34, ring }: { name: string; src?: string; size?: number; ring?: string }) {
  const palette = ['#DCEFD3', '#FDEBDD', '#E3ECFB', '#EEE8FB', '#FDF3DC', '#DDF3F0'];
  const bg = palette[(name.charCodeAt(0) + name.length) % palette.length];
  return (
    <View
      accessibilityLabel={name}
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
        <T variant={size > 40 ? 'title' : 'micro'} weight="bold" color={colors.primary} style={size <= 28 ? { fontSize: 9.5 } : null}>
          {initials(name)}
        </T>
      )}
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
          <Avatar name={p.name} src={p.avatar} size={size} ring={colors.white} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.32,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primarySoft,
            borderWidth: 2,
            borderColor: colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <T variant="micro" weight="bold" color={colors.primary}>
            +{extra}
          </T>
        </View>
      )}
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, track = colors.border, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
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

export function IconButton({
  icon,
  onPress,
  label,
  size = 40,
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
      hitSlop={6}
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
      <Ionicons name={icon} size={size * 0.46} color={color} />
      {badge ? (
        <View style={styles.badge}>
          {typeof badge === 'number' ? (
            <T variant="micro" weight="bold" color={colors.white} style={{ fontSize: 9 }}>
              {badge > 9 ? '9+' : badge}
            </T>
          ) : null}
        </View>
      ) : null}
    </Press>
  );
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <T variant="h3" accessibilityRole="header">
        {title}
      </T>
      {action ? (
        <Press onPress={onAction} hitSlop={8} accessibilityLabel={action}>
          <T variant="small" weight="semibold" color={colors.textSecondary}>
            {action}
          </T>
        </Press>
      ) : null}
    </View>
  );
}

export function Pill({ label, tone = 'green', icon }: { label: string; tone?: 'green' | 'orange' | 'blue' | 'red' | 'gray' | 'yellow' | 'purple'; icon?: IconName }) {
  const map = {
    green: [colors.primarySoft, colors.primary],
    orange: [colors.orangeSoft, '#B45A1C'],
    blue: [colors.blueSoft, '#2B5FB0'],
    red: [colors.redSoft, colors.red],
    gray: [colors.bgAlt, colors.textSecondary],
    yellow: [colors.yellowSoft, '#94660A'],
    purple: [colors.purpleSoft, colors.purple],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
      <T variant="micro" weight="semibold" color={fg}>
        {label}
      </T>
    </View>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <T variant="title" center>
        {title}
      </T>
      {body ? (
        <T variant="small" color={colors.textSecondary} center>
          {body}
        </T>
      ) : null}
      {children}
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, icon }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  return (
    <View style={styles.toggleRow}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="bodySm" weight="medium">
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

export function ListRow({ icon, label, sub, onPress, right, tint = colors.primary }: { icon: IconName; label: string; sub?: string; onPress?: () => void; right?: ReactNode; tint?: string }) {
  return (
    <Press onPress={onPress} style={styles.listRow} scaleTo={0.99} accessibilityLabel={label}>
      <View style={[styles.rowIcon, { backgroundColor: tint === colors.primary ? colors.primarySofter : `${tint}1F` }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodySm" weight="medium">
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipSmall: { height: 30, paddingHorizontal: 11, gap: 4 },
  chipImg: { width: 28, height: 28, borderRadius: 14 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
});
