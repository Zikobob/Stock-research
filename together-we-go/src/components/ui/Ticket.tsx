import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, line, plateOffset, radius } from '@/theme';

import { Plate } from './Plate';
import { Perforation } from './Rule';

const NOTCH = 22;

/** Half a punched hole, cut into the left or right edge of a ticket. */
function Notch({ side, holeColor }: { side: 'left' | 'right'; holeColor: string }) {
  const edge = side === 'left' ? { left: -line } : { right: -line };
  const pos = side === 'left' ? { left: -NOTCH / 2 } : { right: -NOTCH / 2 };
  return (
    <View pointerEvents="none" style={[styles.notchBox, edge]}>
      <View style={[styles.ring, pos]} />
      <View style={[styles.hole, side === 'left' ? { left: -NOTCH / 2 + 2.5 } : { right: -NOTCH / 2 + 2.5 }, { backgroundColor: holeColor }]} />
    </View>
  );
}

/**
 * A boarding-pass card: a main part and, optionally, a stub below a perforated tear line with a half-circle punched out of each edge.
 * `holeColor` is the colour of whatever the ticket lies on (the page, by default) so the punched holes look like holes.
 */
export function Ticket({ children, stub, plated = true, holeColor = colors.bg, tone, style }: { children: ReactNode; stub?: ReactNode; plated?: boolean; holeColor?: string; tone?: 'accent' | 'ink'; style?: StyleProp<ViewStyle> }) {
  const fill = tone === 'accent' ? colors.accent : tone === 'ink' ? colors.ink : colors.card;
  const card = (
    <View style={[styles.card, { backgroundColor: fill }]}>
      {children}
      {stub ? (
        <>
          <View style={styles.tear}>
            <Notch side="left" holeColor={holeColor} />
            <Perforation style={styles.dashes} color={tone === 'ink' ? colors.bg : tone === 'accent' ? colors.onAccent : colors.ink} />
            <Notch side="right" holeColor={holeColor} />
          </View>
          {stub}
        </>
      ) : null}
    </View>
  );
  return plated ? (
    <Plate offset={plateOffset} corner={radius.card} style={style}>
      {card}
    </Plate>
  ) : (
    <View style={style}>{card}</View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: line, borderColor: colors.ink, borderRadius: radius.card },
  tear: { height: NOTCH, justifyContent: 'center', marginHorizontal: 0 },
  dashes: { marginHorizontal: NOTCH / 2 + 4 },
  notchBox: { position: 'absolute', top: 0, width: NOTCH / 2 + line, height: NOTCH, overflow: 'hidden' },
  ring: { position: 'absolute', top: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH, backgroundColor: colors.ink },
  hole: { position: 'absolute', top: 2.5, width: NOTCH - 5, height: NOTCH - 5, borderRadius: NOTCH },
});
