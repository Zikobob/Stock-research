import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'bodySm' | 'small' | 'caption' | 'kicker' | 'micro';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fonts.bold, letterSpacing: -0.6 },
  h1: { fontSize: 26, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.4 },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  title: { fontSize: 15.5, lineHeight: 21, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  bodySm: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  small: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  kicker: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 1.6, textTransform: 'uppercase' },
  micro: { fontSize: 10.5, lineHeight: 13, fontFamily: fonts.medium },
};

export interface TProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  center?: boolean;
}

/** App text: applies the brand font, type scale and the user's text-size setting. */
export function T({ variant = 'body', weight, color, center, style, ...rest }: TProps) {
  const scale = useAppStore((s) => s.settings.textScale);
  const v = variants[variant];
  const scaled: TextStyle =
    scale === 1
      ? {}
      : { fontSize: (v.fontSize ?? 15) * scale, lineHeight: v.lineHeight ? v.lineHeight * scale : undefined };
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        styles.base,
        v,
        scaled,
        weight && { fontFamily: fonts[weight] },
        color ? { color } : null,
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text },
});
