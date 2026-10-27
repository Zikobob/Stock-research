import { Text } from 'react-native';

import { T } from '@/components/ui/T';
import { colors } from '@/theme';

import { amountSize } from './logic';

const isPoint = (ch: string | undefined) => ch === ',' || ch === '.';

/**
 * A big mono number. In a monospace face a comma takes a whole cell ("$1 , 650"), so punctuation is pulled in close to its digits.
 * It stays ONE piece of text (the nested spans only change spacing), so it reads and is found as "$1,650". The size shrinks for long amounts
 * unless `size` is given.
 */
export function BigAmount({ text, color = colors.text, size, testID }: { text: string; color?: string; size?: number; testID?: string }) {
  const s = size ?? amountSize(text.length);
  const chars = text.split('');
  return (
    <T variant="hero" color={color} style={{ fontSize: s, lineHeight: s + 4, flexShrink: 1 }} testID={testID}>
      {chars.map((ch, i) => (
        <Text key={i} style={isPoint(ch) || isPoint(chars[i + 1]) ? { letterSpacing: -s * 0.22 } : undefined}>
          {ch}
        </Text>
      ))}
    </T>
  );
}
