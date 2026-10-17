import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

import { T } from './T';

/** Ring chart of spending by category with the remaining budget in the middle. */
export function Donut({ parts, size = 132, stroke = 20, centerLabel, centerValue }: { parts: { value: number; color: string }[]; size?: number; stroke?: number; centerLabel: string; centerValue: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0);
  let offset = 0;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={`${centerLabel} ${centerValue}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgAlt} strokeWidth={stroke} fill="none" />
        {total > 0
          ? parts.map((p, i) => {
              const len = (p.value / total) * c;
              const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={p.color} strokeWidth={stroke} fill="none" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />;
              offset += len;
              return el;
            })
          : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <T variant="micro" color={colors.textSecondary} style={{ letterSpacing: 1 }}>
          {centerLabel}
        </T>
        <T variant="h3" weight="extrabold">
          {centerValue}
        </T>
      </View>
    </View>
  );
}
