/**
 * TogetherWeGo design tokens.
 * The default "Forest" palette is sampled from the reference design: warm cream
 * canvas, deep forest green for primary actions, soft sage for highlights.
 *
 * Users can pick another palette and corner style in "Make it yours"
 * (src/app/personalize.tsx). Styles are created once when each module loads,
 * so the saved choice is read synchronously here — before any screen module
 * evaluates — and applied by mutating these token objects in place. Changing
 * the theme then reloads the app (see applyAppearance).
 */
import { File, Paths } from 'expo-file-system';
import { DevSettings, Platform } from 'react-native';

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

  /** Pop colour for highlights, badges and the animated hero. */
  accent: '#F2B33D',
  accentSoft: '#FDF3DC',
  heroA: '#1F4D25',
  heroB: '#2F7A3A',
  heroC: '#8CC97A',

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
};

type Palette = Partial<typeof colors>;
export type ThemeKey = 'forest' | 'ocean' | 'sunset' | 'lavender' | 'sakura' | 'midnight';
export type CornerStyle = 'rounded' | 'bubbly' | 'sharp';

/** Every palette the user can choose from in "Make it yours". */
export const themes: Record<
  ThemeKey,
  {
    name: string;
    emoji: string;
    vibe: string;
    dark?: boolean;
    palette: Palette;
  }
> = {
  forest: {
    name: 'Forest',
    emoji: '🌲',
    vibe: 'Calm, earthy, classic',
    palette: {},
  },
  ocean: {
    name: 'Ocean',
    emoji: '🌊',
    vibe: 'Fresh blues & sea breeze',
    palette: {
      bg: '#F1F6FA',
      bgAlt: '#E6EFF6',
      cardMuted: '#F5F9FC',
      border: '#DFE8EF',
      borderStrong: '#C9D7E3',
      primary: '#0F4C81',
      primaryDark: '#0A3A63',
      primaryPressed: '#0C406D',
      primarySoft: '#D5E6F5',
      primarySofter: '#E8F1FA',
      primaryLine: '#B3D0EA',
      navActive: '#CFE2F4',
      accent: '#FF8A5B',
      accentSoft: '#FFE9DF',
      heroA: '#0A3A63',
      heroB: '#1F78B4',
      heroC: '#5CC8D6',
      text: '#14202B',
      textSecondary: '#566573',
      textMuted: '#8F9CA8',
    },
  },
  sunset: {
    name: 'Sunset',
    emoji: '🌅',
    vibe: 'Warm oranges & golden hour',
    palette: {
      bg: '#FFF6EE',
      bgAlt: '#FCEBDD',
      cardMuted: '#FFF9F4',
      border: '#F3E2D3',
      borderStrong: '#E8CDB6',
      primary: '#C2410C',
      primaryDark: '#9A3412',
      primaryPressed: '#A8390B',
      primarySoft: '#FDDCC6',
      primarySofter: '#FFEDE1',
      primaryLine: '#F8C3A0',
      navActive: '#FCD6BD',
      accent: '#7C3AED',
      accentSoft: '#EDE4FD',
      heroA: '#9A3412',
      heroB: '#EA580C',
      heroC: '#FBBF24',
      text: '#2A1A12',
      textSecondary: '#6E5A4E',
      textMuted: '#A8968A',
    },
  },
  lavender: {
    name: 'Lavender',
    emoji: '💜',
    vibe: 'Dreamy purples & soft pastels',
    palette: {
      bg: '#F7F4FC',
      bgAlt: '#EEE9F8',
      cardMuted: '#FAF8FD',
      border: '#E7E1F2',
      borderStrong: '#D3C9E8',
      primary: '#5B3FA8',
      primaryDark: '#462F85',
      primaryPressed: '#4E3693',
      primarySoft: '#E4DBF7',
      primarySofter: '#F0EBFB',
      primaryLine: '#CDBDF0',
      navActive: '#DED2F6',
      accent: '#EC4899',
      accentSoft: '#FCE4F1',
      heroA: '#462F85',
      heroB: '#7C5CD6',
      heroC: '#F0A6CA',
      text: '#1E1A2B',
      textSecondary: '#625B73',
      textMuted: '#9A94A8',
    },
  },
  sakura: {
    name: 'Sakura',
    emoji: '🌸',
    vibe: 'Cherry-blossom pink & cream',
    palette: {
      bg: '#FFF5F7',
      bgAlt: '#FCE9EE',
      cardMuted: '#FFF9FA',
      border: '#F5DFE5',
      borderStrong: '#EBC8D2',
      primary: '#B83268',
      primaryDark: '#912451',
      primaryPressed: '#A12A5B',
      primarySoft: '#FAD7E4',
      primarySofter: '#FDEAF1',
      primaryLine: '#F2B6CC',
      navActive: '#F8D0DF',
      accent: '#14B8A6',
      accentSoft: '#D9F6F2',
      heroA: '#912451',
      heroB: '#D94F86',
      heroC: '#FFB4C8',
      text: '#2B1820',
      textSecondary: '#735A64',
      textMuted: '#A8939B',
    },
  },
  midnight: {
    name: 'Midnight',
    emoji: '🌙',
    vibe: 'Dark mode with neon green',
    dark: true,
    palette: {
      bg: '#0E1513',
      bgAlt: '#16201D',
      card: '#18221F',
      cardMuted: '#1C2724',
      border: '#26332F',
      borderStrong: '#34443F',
      primary: '#2FAE66',
      primaryDark: '#238A50',
      primaryPressed: '#28995A',
      primarySoft: '#1E3A2C',
      primarySofter: '#1A2E25',
      primaryLine: '#2D5240',
      navActive: '#21402F',
      accent: '#F5C451',
      accentSoft: '#3A3220',
      heroA: '#0B2E1E',
      heroB: '#16603C',
      heroC: '#2FAE66',
      text: '#ECF2EE',
      textSecondary: '#A9B8B1',
      textMuted: '#74857E',
      orangeSoft: '#3B2A1C',
      blueSoft: '#1C2A3D',
      yellowSoft: '#3A3220',
      redSoft: '#3D1F21',
      purpleSoft: '#2A2340',
      tealSoft: '#173431',
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
  },
};

export const cornerStyles: Record<CornerStyle, { name: string; scale: number }> = {
  rounded: { name: 'Rounded', scale: 1 },
  bubbly: { name: 'Bubbly', scale: 1.4 },
  sharp: { name: 'Crisp', scale: 0.45 },
};

export interface Appearance {
  theme: ThemeKey;
  corners: CornerStyle;
}

const PREFS_KEY = 'togetherwego-appearance';
const DEFAULT_APPEARANCE: Appearance = { theme: 'forest', corners: 'rounded' };

function prefsFile() {
  return new File(Paths.document, 'appearance.json');
}

function readAppearance(): Appearance {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null;
    else {
      const f = prefsFile();
      raw = f.exists ? f.textSync() : null;
    }
    const parsed = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    return {
      theme: parsed.theme && parsed.theme in themes ? parsed.theme : DEFAULT_APPEARANCE.theme,
      corners: parsed.corners && parsed.corners in cornerStyles ? parsed.corners : DEFAULT_APPEARANCE.corners,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeAppearance(a: Appearance) {
  try {
    const raw = JSON.stringify(a);
    if (Platform.OS === 'web') localStorage.setItem(PREFS_KEY, raw);
    else prefsFile().write(raw);
  } catch {
    // Storage unavailable (private browsing etc.) — the choice lasts for this session only.
  }
}

/** The appearance the app is currently drawn with (fixed until the next reload). */
export const appearance: Appearance = readAppearance();
export const isDark = !!themes[appearance.theme].dark;
/** The untouched Forest tokens (for previews of other palettes). */
export const baseColors = { ...colors };
Object.assign(colors, themes[appearance.theme].palette);

/** Saves a new look and restarts the UI so every screen picks it up. */
export function applyAppearance(next: Appearance): boolean {
  writeAppearance(next);
  if (next.theme === appearance.theme && next.corners === appearance.corners) return true;
  try {
    if (Platform.OS === 'web') {
      const home = (globalThis as { __TWG_HOME?: string }).__TWG_HOME;
      // Restart from the app's front door (not the survey page we're on).
      window.location.replace(home ?? `${window.location.origin}/`);
    } else DevSettings.reload('Applying your new look');
    return true;
  } catch {
    return false;
  }
}

/** Category colours used by the spending breakdown and expense dots. */
export const categoryColors: Record<string, string> = {
  Flights: colors.primary,
  Stays: '#6BAA75',
  Food: '#F2B33D',
  Activities: '#E07A3F',
  Transport: '#3D7DD8',
  Shopping: '#7C5CD6',
  Other: '#959A8E',
};

const cornerScale = cornerStyles[appearance.corners].scale;
const r = (n: number) => Math.round(n * cornerScale);
export const radius = {
  xs: r(8),
  sm: r(12),
  md: r(16),
  lg: r(20),
  xl: r(24),
  pill: 999,
};

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
