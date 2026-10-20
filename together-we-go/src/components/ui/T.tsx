import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

/**
 * Three tiers of type:
 *  - Display (condensed, uppercase, tight tracking): `hero` for the big countdown, `display` for page titles,
 *    `headline` for section titles, `numeral` / `numeralSm` for figures (days, money, scores). Never below 26 px, never for paragraphs.
 *  - Heading (Manrope bold, 20 to 28): `h1`, `h2`, `h3`.
 *  - Body and UI (Manrope 400 to 700, 11 to 16): everything else.
 */
type Variant = 'hero' | 'display' | 'headline' | 'numeral' | 'numeralSm' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'bodySm' | 'small' | 'caption' | 'kicker' | 'micro';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const variants: Record<Variant, TextStyle> = {
  hero: { fontSize: 96, lineHeight: 96, fontFamily: fonts.display, letterSpacing: -2.9, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
  display: { fontSize: 44, lineHeight: 48, fontFamily: fonts.display, letterSpacing: -1.3, textTransform: 'uppercase' },
  headline: { fontSize: 28, lineHeight: 32, fontFamily: fonts.display, letterSpacing: -0.6, textTransform: 'uppercase' },
  numeral: { fontSize: 40, lineHeight: 44, fontFamily: fonts.display, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  numeralSm: { fontSize: 28, lineHeight: 32, fontFamily: fonts.display, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h3: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.2 },
  title: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 16, lineHeight: 23, fontFamily: fonts.regular },
  bodySm: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  small: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  caption: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.regular },
  kicker: { fontSize: 11.5, lineHeight: 15, fontFamily: fonts.bold, letterSpacing: 1.4, textTransform: 'uppercase' },
  micro: { fontSize: 11, lineHeight: 14, fontFamily: fonts.medium },
};

/** The display tier already is large, so the person's text-size setting grows it only a little. */
const BIG: Variant[] = ['hero', 'display', 'headline', 'numeral', 'numeralSm'];

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
  const k = BIG.includes(variant) ? 1 + (scale - 1) * 0.4 : scale;
  const scaled: TextStyle =
    k === 1
      ? {}
      : { fontSize: (v.fontSize ?? 15) * k, lineHeight: v.lineHeight ? v.lineHeight * k : undefined };
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
