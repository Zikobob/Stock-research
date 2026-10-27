import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, line, radius } from '@/theme';

import { T } from './T';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  formatValue?: (v: number) => string;
}

const THUMB_W = 22;

/**
 * A chunky slider in the ink-and-paper look: an outlined track that fills with the accent and an ink block to drag.
 * Drag it, tap the track, or use a screen reader's increase and decrease. The whole 48 point strip is the control.
 */
export function Slider({ value, min, max, step = 1, onChange, label, formatValue }: SliderProps) {
  const [width, setWidth] = useState(1);
  const pct = (value - min) / (max - min);
  const travel = Math.max(1, width - THUMB_W);

  // the children ignore touches, so locationX is always measured on the strip itself
  const update = (e: GestureResponderEvent) => {
    const ratio = Math.max(0, Math.min(1, (e.nativeEvent.locationX - THUMB_W / 2) / travel));
    const next = Math.round((min + ratio * (max - min)) / step) * step;
    if (next !== value) onChange(next);
  };

  return (
    <View style={{ gap: 4 }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: formatValue?.(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
        }}
        style={styles.hit}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={update}
        onResponderMove={update}>
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: pct * travel }]} />
      </View>
      {formatValue ? (
        <View style={styles.ends} accessibilityElementsHidden importantForAccessibility="no">
          <T variant="kicker" color={colors.textMuted}>
            {formatValue(min)}
          </T>
          <T variant="kicker" color={colors.textMuted}>
            {formatValue(max)}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 48, justifyContent: 'center' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 16, marginHorizontal: THUMB_W / 2, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRightWidth: line, borderColor: colors.ink },
  thumb: { position: 'absolute', top: 7, width: THUMB_W, height: 34, borderRadius: radius.xs, backgroundColor: colors.ink, borderWidth: line, borderColor: colors.ink },
});
