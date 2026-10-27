import { Text } from 'react-native';

import { T } from '@/components/ui/T';

const isPoint = (ch: string | undefined) => ch === ',' || ch === '.';

/**
 * A big mono number whose commas and points are pulled in close to their neighbours. In a monospace face every character takes a full
 * cell, so "$2,086" otherwise reads as "$2 , 086". It stays ONE piece of text (nested spans only change the spacing), so it reads and
 * is found as "$2,086".
 */
export function MonoAmount({ text, size = 56 }: { text: string; size?: number }) {
  const chars = text.split('');
  return (
    <T variant="hero" style={{ fontSize: size, lineHeight: size + 4 }}>
      {chars.map((ch, i) => (
        <Text key={i} style={isPoint(ch) || isPoint(chars[i + 1]) ? { letterSpacing: -size * 0.22 } : undefined}>
          {ch}
        </Text>
      ))}
    </T>
  );
}
