/**
 * TogetherWeGo design tokens.
 * Palette is sampled from the reference design: warm cream canvas,
 * deep forest green for primary actions, soft sage for highlights.
 */
import { Platform } from 'react-native';

export const colors = {
  bg: '#F4F4EE',
  bgAlt: '#EEF0E7',
  card: '#FFFFFF',
  cardMuted: '#F7F8F3',
  border: '#E7E9DF',
  borderStrong: '#D5D9CC',

  primary: '#1F4D25',
  primaryDark: '#163A1B',
  primaryPressed: '#173E1C',
  primarySoft: '#DCEFD3',
  primarySofter: '#EAF5E4',
  primaryLine: '#C3DFB6',
  navActive: '#CFE6C4',

  text: '#1A1C17',
  textSecondary: '#5F645A',
  textMuted: '#959A8E',
  onPrimary: '#FFFFFF',

  orange: '#E8833A',
  orangeSoft: '#FDEBDD',
  blue: '#3D7DD8',
  blueSoft: '#E3ECFB',
  yellow: '#F2B33D',
  yellowSoft: '#FDF3DC',
  red: '#D64545',
  redSoft: '#FBE4E4',
  purple: '#7C5CD6',
  purpleSoft: '#EEE8FB',
  teal: '#2A9D8F',
  tealSoft: '#DDF3F0',
  star: '#F5B301',

  overlay: 'rgba(16, 24, 14, 0.45)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Category colours used by the spending breakdown and expense dots. */
export const categoryColors: Record<string, string> = {
  Flights: '#1F4D25',
  Stays: '#6BAA75',
  Food: '#F2B33D',
  Activities: '#E07A3F',
  Transport: '#3D7DD8',
  Shopping: '#7C5CD6',
  Other: '#959A8E',
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;

export const shadow = Platform.select({
  web: { boxShadow: '0px 6px 18px rgba(30, 50, 20, 0.07)' },
  default: {
    shadowColor: '#1E3214',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
}) as object;

export const shadowStrong = Platform.select({
  web: { boxShadow: '0px 10px 28px rgba(20, 45, 15, 0.18)' },
  default: {
    shadowColor: '#14280F',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
}) as object;

/** Width of the app column on tablets / web so layouts stay phone-shaped. */
export const MAX_WIDTH = 520;
