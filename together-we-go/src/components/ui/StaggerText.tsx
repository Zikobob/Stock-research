import { View, type StyleProp, type TextStyle } from 'react-native';

import { FadeIn } from './motion';
import { T, type TProps } from './T';

/**
 * A headline whose words slide up and fade in one after another (about 50 ms apart). Plain text when animations are off.
 * The whole line is one accessible heading, and keeps real spaces so it can be read and searched as one sentence.
 */
export function StaggerText({ text, variant = 'display', color, delay = 0, step = 50, distance = 16, center, style }: { text: string; variant?: TProps['variant']; color?: string; delay?: number; step?: number; distance?: number; center?: boolean; style?: StyleProp<TextStyle> }) {
  const words = text.split(' ');
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start' }}>
      {words.map((w, i) => (
        <FadeIn key={`${w}${i}`} delay={delay + i * step} distance={distance} duration={380}>
          <T variant={variant} color={color} style={style} importantForAccessibility="no">
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </T>
        </FadeIn>
      ))}
    </View>
  );
}
