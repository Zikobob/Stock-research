import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

import type { MapPoint } from './types';

/** How big the drawn marker is: a stop is a numbered square, an airport a square with a plane, a place a small dot. */
export function pinSize(kind: MapPoint['kind'], selected: boolean) {
  const base = kind === 'place' ? 14 : kind === 'me' ? 18 : 26;
  return selected ? base + 8 : base;
}

/**
 * The look of one marker, the same on the offline radar and on the phone's own map. The cue is the shape, not the colour:
 * a numbered ink square is a stop in your plan, a square with a plane is an airport, a small outlined dot is a place worth a look,
 * and the accent dot is you. The one you picked is bigger and filled with the accent.
 */
export function PinBadge({ p, selected }: { p: MapPoint; selected: boolean }) {
  const size = pinSize(p.kind, selected);
  const fill = selected ? colors.accent : p.kind === 'activity' ? colors.primary : p.kind === 'me' ? colors.accent : colors.card;
  const ink = selected ? colors.onAccent : p.kind === 'activity' ? colors.onPrimary : colors.ink;
  const round = p.kind === 'place' || p.kind === 'me';
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: round ? size / 2 : radius.xs, backgroundColor: fill, borderColor: colors.ink, borderWidth: p.kind === 'me' ? 3 : line }]}>
      {p.kind === 'activity' && p.label ? (
        <T variant="kicker" color={ink} allowFontScaling={false} style={{ fontSize: selected ? 14 : 12, lineHeight: selected ? 18 : 16, letterSpacing: 0 }}>
          {p.label}
        </T>
      ) : p.kind === 'airport' ? (
        <Ionicons name="airplane" size={selected ? 18 : 14} color={ink} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
