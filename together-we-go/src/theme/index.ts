/**
 * TogetherWeGo design tokens.
 *
 * "Quiet base, loud moments": a calm neutral canvas (white, or #121212 in the dark mode), black
 * primary actions, condensed display type, and ONE vivid accent per theme that appears only where it
 * matters. The colours themselves live in ./palettes (pure data, unit-tested for contrast).
 *
 * The person picks a theme (accent) and a mode (light, dark, or follow the phone) in "Make it yours" or
 * Settings. Styles are created once when each module loads, so the saved choice is read synchronously
 * here, before any screen module evaluates, and the token objects below are final. Changing the look
 * then reloads the app (see applyAppearance).
 */
import { File, Paths } from 'expo-file-system';
import { Appearance as OsAppearance, DevSettings, Platform } from 'react-native';

import { LEGACY_THEMES, THEME_KEYS, buildPalette, categoryPalette, resolveMode, themes, type Colors, type Mode, type ModePref, type ThemeKey } from './palettes';

export { THEME_KEYS, buildPalette, resolveMode, themes };
export type { Colors, Mode, ModePref, ThemeKey };

export type CornerStyle = 'rounded' | 'bubbly' | 'sharp';

export const cornerStyles: Record<CornerStyle, { name: string; scale: number }> = {
  rounded: { name: 'Rounded', scale: 1 },
  bubbly: { name: 'Bubbly', scale: 1.4 },
  sharp: { name: 'Crisp', scale: 0.45 },
};

export interface Appearance {
  theme: ThemeKey;
  corners: CornerStyle;
  /** Light, dark, or follow the phone each time the app opens. */
  mode: ModePref;
}

const PREFS_KEY = 'togetherwego-appearance';
const DEFAULT_APPEARANCE: Appearance = { theme: 'amalfi', corners: 'rounded', mode: 'system' };

function prefsFile() {
  return new File(Paths.document, 'appearance.json');
}

const isMode = (m: unknown): m is ModePref => m === 'system' || m === 'light' || m === 'dark';

/** Turns whatever was saved (including looks from earlier versions of the app) into a valid look. */
export function parseAppearance(raw: string | null): Appearance {
  try {
    const parsed = raw ? (JSON.parse(raw) as { theme?: string; corners?: string; mode?: unknown }) : {};
    let theme: ThemeKey = DEFAULT_APPEARANCE.theme;
    let mode: ModePref = isMode(parsed.mode) ? parsed.mode : DEFAULT_APPEARANCE.mode;
    if (parsed.theme && (THEME_KEYS as string[]).includes(parsed.theme)) {
      theme = parsed.theme as ThemeKey;
      // the old Midnight was a dark theme, before light and dark became a separate choice
      if (parsed.theme === 'midnight' && !isMode(parsed.mode)) mode = 'dark';
    } else if (parsed.theme && parsed.theme in LEGACY_THEMES) {
      const legacy = LEGACY_THEMES[parsed.theme];
      theme = legacy.theme;
      if (!isMode(parsed.mode) && legacy.mode) mode = legacy.mode;
    }
    return { theme, corners: parsed.corners && parsed.corners in cornerStyles ? (parsed.corners as CornerStyle) : DEFAULT_APPEARANCE.corners, mode };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function readAppearance(): Appearance {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null;
    else {
      const f = prefsFile();
      raw = f.exists ? f.textSync() : null;
    }
    return parseAppearance(raw);
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

const systemIsDark = () => {
  try {
    return OsAppearance.getColorScheme() === 'dark';
  } catch {
    return false;
  }
};

/** The look the app is currently drawn with (fixed until the next reload). */
export const appearance: Appearance = readAppearance();
/** `appearance.mode` with "follow the phone" worked out. */
export const resolvedMode: Mode = resolveMode(appearance.mode, systemIsDark());
export const isDark = resolvedMode === 'dark';

/** Every colour, for the chosen theme and mode. */
export const colors: Colors = buildPalette(appearance.theme, resolvedMode);

/** The colours of any theme and mode (for previews of a look that is not applied yet). */
export const paletteOf = (theme: ThemeKey, mode: ModePref): Colors => buildPalette(theme, resolveMode(mode, systemIsDark()));

/** Restarts the UI so every screen is drawn again with the current look. */
export function reloadForLook(): boolean {
  try {
    if (Platform.OS === 'web') {
      const home = (globalThis as { __TWG_HOME?: string }).__TWG_HOME;
      // Restart from the app's front door (not the page we're on).
      window.location.replace(home ?? `${window.location.origin}/`);
    } else DevSettings.reload('Applying your new look');
    return true;
  } catch {
    return false;
  }
}

/** Saves a new look and restarts the UI so every screen picks it up. Returns false if the restart did not work. */
export function applyAppearance(next: Appearance): boolean {
  writeAppearance(next);
  const same = next.theme === appearance.theme && next.corners === appearance.corners && resolveMode(next.mode, systemIsDark()) === resolvedMode;
  return same ? true : reloadForLook();
}

/** Category colours used by the spending breakdown and expense dots (data colours, so they stay distinct). */
export const categoryColors: Record<string, string> = categoryPalette(resolvedMode);

const cornerScale = cornerStyles[appearance.corners].scale;
const r = (n: number) => Math.round(n * cornerScale);
/**
 * Corner radii. `button`, `card` and `modal` are the three the design uses: 8 for buttons and inputs, 12 for
 * cards and images, 16 for sheets and dialogs; pills are fully round. The older names map onto them.
 */
export const radius = {
  button: r(8),
  card: r(12),
  modal: r(16),
  xs: r(8),
  sm: r(12),
  md: r(12),
  lg: r(12),
  xl: r(16),
  pill: 999,
};

/** A 4-point spacing scale. `section` is the gap between blocks on a page, bigger than any gap inside one (law of proximity). */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 20,
  section: 32,
} as const;

/** Smallest size of anything you tap, in points (Apple's guideline; Fitts's law). */
export const touch = { min: 44 } as const;

/** How long things take (ms): small elements 150 to 250, sheets 300 to 400. */
export const timing = { fast: 160, base: 240, sheet: 340, slow: 480, stagger: 50 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  /** Tall condensed face for headlines and big numbers (THE PLAN, 3 DAYS TO GO). */
  display: 'Anton_400Regular',
} as const;

/** Shadows are for cards and floating things only. The dark mode shows height with a lighter surface instead. */
export const shadow = (
  isDark
    ? {}
    : Platform.select({
        web: { boxShadow: '0px 1px 2px rgba(10, 10, 10, 0.05), 0px 8px 22px rgba(10, 10, 10, 0.06)' },
        default: { shadowColor: '#0A0A0A', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
      })
) as object;

export const shadowStrong = (
  isDark
    ? {}
    : Platform.select({
        web: { boxShadow: '0px 4px 8px rgba(10, 10, 10, 0.08), 0px 16px 36px rgba(10, 10, 10, 0.16)' },
        default: { shadowColor: '#0A0A0A', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
      })
) as object;

/** Width of the app column on tablets / web so layouts stay phone-shaped. */
export const MAX_WIDTH = 520;
