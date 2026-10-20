/**
 * Colour data for the app, with no React Native in it so tests can check it.
 *
 * "Quiet base, loud moments": every theme shares a neutral canvas (white, or #121212 in the dark
 * mode), black (white in the dark mode) for primary actions, and ONE vivid accent that shows up
 * only where it matters: the hero, the countdown, selected things, celebrations. A soft gradient
 * wash of the accent sits behind the top of a page and nowhere else. Green, amber and red are
 * kept for states (under budget, near, over; going, maybe, can't go) and never used to decorate.
 *
 * A theme (accent) and a mode (light, dark, or follow the phone) are chosen separately.
 */
import { ensureContrast, mix, readableOn } from '@/utils/contrast';

export type ThemeKey = 'amalfi' | 'sunset' | 'lagoon' | 'rose' | 'midnight' | 'classic';
export type Mode = 'light' | 'dark';
export type ModePref = 'system' | Mode;

export interface Colors {
  /** Page background. */
  bg: string;
  /** Wells, inputs and chips: one step away from the page. */
  bgAlt: string;
  /** Cards. */
  card: string;
  cardMuted: string;
  /** Sheets and dialogs (lighter than cards in the dark mode: elevation is shown by lightness, not shadow). */
  raised: string;
  border: string;
  borderStrong: string;

  /** Every primary action: black (white in the dark mode). */
  primary: string;
  primaryDark: string;
  primaryPressed: string;
  primarySoft: string;
  primarySofter: string;
  primaryLine: string;
  navActive: string;
  onPrimary: string;

  /** The theme's one vivid colour, for fills and rings. */
  accent: string;
  accentSoft: string;
  /** The accent made dark (or light) enough to read as text. */
  accentText: string;
  /** Text on top of an accent fill. */
  onAccent: string;
  /** The wash behind the top of a page: from the top colour to the second, then the page colour. */
  washFrom: string;
  washTo: string;
  heroA: string;
  heroB: string;
  heroC: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  /** States only: under budget / going / done. */
  positive: string;
  positiveSoft: string;
  /** States only: near the budget / maybe. */
  warn: string;
  warnSoft: string;
  /** States only: over budget / can't go / delete. */
  red: string;
  redSoft: string;

  orange: string;
  orangeSoft: string;
  blue: string;
  blueSoft: string;
  yellow: string;
  yellowSoft: string;
  purple: string;
  purpleSoft: string;
  teal: string;
  tealSoft: string;
  star: string;

  overlay: string;
  white: string;
  black: string;
}

interface ThemeDef {
  name: string;
  emoji: string;
  vibe: string;
  /** The mode the picker switches to along with this theme (the person can still change it). */
  mode?: Mode;
  light: { accent: string; wash: [string, string] };
  dark: { accent: string; wash: [string, string] };
}

export const themes: Record<ThemeKey, ThemeDef> = {
  amalfi: {
    name: 'Amalfi',
    emoji: '🍋',
    vibe: 'Black and lemon',
    light: { accent: '#FBC91B', wash: ['#FFF3BE', '#FFFBE8'] },
    dark: { accent: '#F2CC4A', wash: ['#2F2910', '#1C1A12'] },
  },
  sunset: {
    name: 'Sunset',
    emoji: '🌅',
    vibe: 'Peach, pink, golden hour',
    light: { accent: '#FF5A36', wash: ['#FFE4D6', '#FFEEF3'] },
    dark: { accent: '#FF8A6B', wash: ['#3A1F15', '#2A1719'] },
  },
  lagoon: {
    name: 'Lagoon',
    emoji: '🌊',
    vibe: 'Fresh mint and sea',
    light: { accent: '#00B3A4', wash: ['#D8F6F0', '#EEFBF8'] },
    dark: { accent: '#4FD1C5', wash: ['#11322E', '#14221F'] },
  },
  rose: {
    name: 'Rose',
    emoji: '🌸',
    vibe: 'Blossom pink',
    light: { accent: '#F2427F', wash: ['#FFE1EB', '#FFF0F5'] },
    dark: { accent: '#FF8DB3', wash: ['#3B1727', '#25151F'] },
  },
  midnight: {
    name: 'Midnight',
    emoji: '🌙',
    vibe: 'Dark with soft violet',
    mode: 'dark',
    light: { accent: '#7A5CFF', wash: ['#E7E0FF', '#F5F2FF'] },
    dark: { accent: '#B69CFF', wash: ['#2A2147', '#1B1730'] },
  },
  classic: {
    name: 'Classic',
    emoji: '⚪',
    vibe: 'Pure black and white',
    light: { accent: '#0A0A0A', wash: ['#FFFFFF', '#FFFFFF'] },
    dark: { accent: '#F5F5F5', wash: ['#121212', '#121212'] },
  },
};

/** The order the colour swatches are shown in. */
export const THEME_KEYS = Object.keys(themes) as ThemeKey[];

/** Saved looks from earlier versions of the app. */
export const LEGACY_THEMES: Record<string, { theme: ThemeKey; mode?: Mode }> = {
  forest: { theme: 'lagoon' },
  ocean: { theme: 'lagoon' },
  lavender: { theme: 'midnight', mode: 'light' },
  sakura: { theme: 'rose' },
};

const LIGHT = {
  bg: '#FFFFFF',
  bgAlt: '#F4F4F4',
  card: '#FFFFFF',
  cardMuted: '#F8F8F8',
  raised: '#FFFFFF',
  border: '#E8E8E8',
  borderStrong: '#C9C9C9',
  primary: '#0A0A0A',
  primaryDark: '#000000',
  primaryPressed: '#2A2A2A',
  primarySoft: '#EEEEEE',
  primarySofter: '#F6F6F6',
  primaryLine: '#D9D9D9',
  onPrimary: '#FFFFFF',
  text: '#0A0A0A',
  textSecondary: '#4A4A4A',
  textMuted: '#6B6B6B',
  positive: '#146C37',
  positiveSoft: '#E1F4E8',
  warn: '#8A5200',
  warnSoft: '#FFF0CF',
  red: '#B3261E',
  redSoft: '#FDE8E6',
  orange: '#A8470A',
  orangeSoft: '#FDEBDD',
  blue: '#1A5FC8',
  blueSoft: '#E3EDFC',
  yellow: '#F2B33D',
  yellowSoft: '#FDF3DC',
  purple: '#6B47D6',
  purpleSoft: '#EEE8FB',
  teal: '#12766B',
  tealSoft: '#DDF3F0',
  star: '#F5B301',
  overlay: 'rgba(10, 10, 10, 0.5)',
};

const DARK = {
  bg: '#121212',
  bgAlt: '#1A1A1A',
  card: '#1E1E1E',
  cardMuted: '#232323',
  raised: '#2A2A2A',
  border: '#303030',
  borderStrong: '#474747',
  primary: '#F5F5F5',
  primaryDark: '#FFFFFF',
  primaryPressed: '#D6D6D6',
  primarySoft: '#2C2C2C',
  primarySofter: '#242424',
  primaryLine: '#3C3C3C',
  onPrimary: '#0A0A0A',
  text: '#F5F5F5',
  textSecondary: '#BDBDBD',
  textMuted: '#A0A0A0',
  positive: '#6EDC99',
  positiveSoft: '#16301F',
  warn: '#FFC857',
  warnSoft: '#33290F',
  red: '#FF8F86',
  redSoft: '#3D1B19',
  orange: '#FFA062',
  orangeSoft: '#3A2415',
  blue: '#8DB8FF',
  blueSoft: '#1B2A44',
  yellow: '#FFD66B',
  yellowSoft: '#33290F',
  purple: '#B69CFF',
  purpleSoft: '#2A2347',
  teal: '#5FD6C8',
  tealSoft: '#123430',
  star: '#FFC83D',
  overlay: 'rgba(0, 0, 0, 0.66)',
};

/** Every colour of one theme in one mode. */
export function buildPalette(key: ThemeKey, mode: Mode): Colors {
  const dark = mode === 'dark';
  const base = dark ? DARK : LIGHT;
  const { accent, wash } = dark ? themes[key].dark : themes[key].light;
  const surfaces = [base.bg, base.card, base.cardMuted, base.raised, base.bgAlt];
  return {
    ...base,
    navActive: mix(accent, base.bg, 0.82),
    accent,
    accentSoft: mix(accent, base.bg, 0.82),
    accentText: ensureContrast(accent, surfaces, 4.5, dark ? '#FFFFFF' : '#000000'),
    onAccent: readableOn(accent),
    washFrom: wash[0],
    washTo: wash[1],
    heroA: '#0A0A0A',
    heroB: '#1F1F1F',
    heroC: accent,
    white: '#FFFFFF',
    black: '#000000',
  };
}

export function resolveMode(pref: ModePref, systemIsDark: boolean): Mode {
  return pref === 'system' ? (systemIsDark ? 'dark' : 'light') : pref;
}

/** Colours for the spending breakdown (data colours, so they stay distinct). */
export function categoryPalette(mode: Mode): Record<string, string> {
  return mode === 'dark'
    ? { Flights: '#A28BFF', Stays: '#F5F5F5', Food: '#F2CC4A', Activities: '#FFA062', Transport: '#7FB0F0', Shopping: '#FF8DB3', Other: '#8A8A8A' }
    : { Flights: '#6C4CE0', Stays: '#0A0A0A', Food: '#FBC91B', Activities: '#E8833A', Transport: '#1E73E8', Shopping: '#D94F86', Other: '#8A8A8A' };
}
