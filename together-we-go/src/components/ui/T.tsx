import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

/**
 * Three voices, like a printed boarding pass:
 *  - Serif (Fraunces, heavy): `display` for page titles, `headline` for section titles. Sentence case, never for paragraphs, never below 26 px.
 *  - Mono (Space Mono bold): `hero` and `numeral` / `numeralSm` for every number that matters (days, money, times, scores), and `kicker`
 *    for the small caps labels (DAY 02 / 05, POSITANO).
 *  - Grotesk (Space Grotesk): `h1`, `h2`, `h3` and everything you read: `title`, `body`, `bodySm`, `small`, `caption`, `micro`.
 */
type Variant = 'hero' | 'display' | 'headline' | 'numeral' | 'numeralSm' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'bodySm' | 'small' | 'caption' | 'kicker' | 'micro';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const variants: Record<Variant, TextStyle> = {
  hero: { fontSize: 72, lineHeight: 76, fontFamily: fonts.mono, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  display: { fontSize: 40, lineHeight: 44, fontFamily: fonts.display, letterSpacing: -0.9 },
  headline: { fontSize: 26, lineHeight: 30, fontFamily: fonts.serif, letterSpacing: -0.4 },
  numeral: { fontSize: 34, lineHeight: 38, fontFamily: fonts.mono, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  numeralSm: { fontSize: 22, lineHeight: 28, fontFamily: fonts.mono, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  h1: { fontSize: 26, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.4 },
  h2: { fontSize: 21, lineHeight: 27, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, letterSpacing: -0.2 },
  title: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 16, lineHeight: 23, fontFamily: fonts.regular },
  bodySm: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  small: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  caption: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.regular },
  kicker: { fontSize: 11, lineHeight: 15, fontFamily: fonts.mono, letterSpacing: 1.2, textTransform: 'uppercase' },
  micro: { fontSize: 11, lineHeight: 14, fontFamily: fonts.medium },
};

/** The serif and mono tiers are already large, so the person's text-size setting grows them only a little. */
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
