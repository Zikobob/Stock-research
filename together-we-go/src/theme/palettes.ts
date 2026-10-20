/**
 * Colour data for the app, with no React Native in it so tests can check it.
 *
 * The look is "a boarding pass printed on paper": a warm paper page, black ink for text and every outline,
 * and ONE flat accent colour per theme used like a highlighter or a sticker. There are no gradients and no
 * soft shadows; depth comes from a hard offset "plate" under the things you can press. The dark mode is a
 * night flight: #121212, cream ink, and the accent as the plate. Green, amber and red mean a state
 * (under budget, near, over; going, maybe, can't go) and are never used to decorate.
 *
 * A theme (accent) and a mode (light, dark, or follow the phone) are chosen separately.
 */
import { ensureContrast, mix, readableOn } from '@/utils/contrast';

export type ThemeKey = 'amalfi' | 'sunset' | 'lagoon' | 'rose' | 'midnight' | 'classic';
export type Mode = 'light' | 'dark';
export type ModePref = 'system' | Mode;

export interface Colors {
  /** The page: paper (light) or #121212 (dark). */
  bg: string;
  /** Wells, inputs and chips: one step away from the page. */
  bgAlt: string;
  /** Cards and tickets. */
  card: string;
  cardMuted: string;
  /** Sheets and dialogs. */
  raised: string;
  /** Hairline dividers inside a card. */
  border: string;
  borderStrong: string;
  /** The ink: text colour and the colour of every outline. */
  ink: string;
  /** The hard shadow under things you can press: ink in the light mode, the accent in the dark mode. */
  plate: string;

  /** Every main button: ink (cream in the dark mode). */
  primary: string;
  primaryDark: string;
  primaryPressed: string;
  primarySoft: string;
  primarySofter: string;
  primaryLine: string;
  navActive: string;
  onPrimary: string;

  /** The theme's one flat colour, for fills (the highlighter). */
  accent: string;
  accentSoft: string;
  /** The accent made dark (or light) enough to read as text. */
  accentText: string;
  /** Text on top of an accent fill. */
  onAccent: string;
  /** Kept so older screens compile; the new look has no gradient wash, so both equal the page colour. */
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
  /** Unused by the new look (no emoji); kept so saved data and older code stay valid. */
  emoji: string;
  vibe: string;
  /** The mode the picker switches to along with this theme (the person can still change it). */
  mode?: Mode;
  light: { accent: string };
  dark: { accent: string };
}

export const themes: Record<ThemeKey, ThemeDef> = {
  amalfi: { name: 'Limoncello', emoji: '', vibe: 'Lemon on paper', light: { accent: '#FFD23F' }, dark: { accent: '#F6CF4D' } },
  sunset: { name: 'Tomato', emoji: '', vibe: 'Hot tomato red', light: { accent: '#FF5B37' }, dark: { accent: '#FF8461' } },
  lagoon: { name: 'Lagoon', emoji: '', vibe: 'Sea-glass green', light: { accent: '#25CDB8' }, dark: { accent: '#4FD8C8' } },
  rose: { name: 'Bubblegum', emoji: '', vibe: 'Loud pink', light: { accent: '#FF8DB8' }, dark: { accent: '#FF9EC4' } },
  midnight: { name: 'Grape', emoji: '', vibe: 'Violet, made for night', mode: 'dark', light: { accent: '#A394FF' }, dark: { accent: '#B7A9FF' } },
  classic: { name: 'Ink', emoji: '', vibe: 'Only black and paper', light: { accent: '#16130E' }, dark: { accent: '#F1EADC' } },
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
  bg: '#F4EFE4',
  bgAlt: '#ECE5D5',
  card: '#FFFDF8',
  cardMuted: '#F8F3E8',
  raised: '#FFFDF8',
  border: '#D6CCB6',
  borderStrong: '#B5AA90',
  ink: '#16130E',
  primary: '#16130E',
  primaryDark: '#000000',
  primaryPressed: '#2E2A22',
  primarySoft: '#E9E1CF',
  primarySofter: '#F1EBDC',
  primaryLine: '#D6CCB6',
  onPrimary: '#FFFDF8',
  text: '#16130E',
  textSecondary: '#4D463A',
  textMuted: '#6B6353',
  positive: '#16663A',
  positiveSoft: '#D9EED9',
  warn: '#7F4B00',
  warnSoft: '#FBE6B3',
  red: '#B3261E',
  redSoft: '#F8D8D2',
  orange: '#A0440A',
  orangeSoft: '#F6DCC5',
  blue: '#1B4FB0',
  blueSoft: '#D9E3F6',
  yellow: '#F2B33D',
  yellowSoft: '#FBEFC8',
  purple: '#5B3FC2',
  purpleSoft: '#E3DDF6',
  teal: '#0F6B62',
  tealSoft: '#D1ECE7',
  star: '#F5B301',
  overlay: 'rgba(22, 19, 14, 0.55)',
};

const DARK = {
  bg: '#121212',
  bgAlt: '#191816',
  card: '#1E1C19',
  cardMuted: '#232019',
  raised: '#2A2722',
  border: '#38342D',
  borderStrong: '#57514A',
  ink: '#F1EADC',
  primary: '#F1EADC',
  primaryDark: '#FFFFFF',
  primaryPressed: '#D5CDBC',
  primarySoft: '#2C2923',
  primarySofter: '#25221D',
  primaryLine: '#3E3A32',
  onPrimary: '#16130E',
  text: '#F1EADC',
  textSecondary: '#C4BCAA',
  textMuted: '#A39B89',
  positive: '#6EDC99',
  positiveSoft: '#163020',
  warn: '#FFC857',
  warnSoft: '#35290D',
  red: '#FF8F86',
  redSoft: '#3E1C19',
  orange: '#FFA062',
  orangeSoft: '#3B2515',
  blue: '#8DB8FF',
  blueSoft: '#1C2A45',
  yellow: '#FFD66B',
  yellowSoft: '#35290D',
  purple: '#B7A9FF',
  purpleSoft: '#2B2448',
  teal: '#5FD6C8',
  tealSoft: '#123430',
  star: '#FFC83D',
  overlay: 'rgba(0, 0, 0, 0.68)',
};

/** Every colour of one theme in one mode. */
export function buildPalette(key: ThemeKey, mode: Mode): Colors {
  const dark = mode === 'dark';
  const base = dark ? DARK : LIGHT;
  const accent = themes[key][dark ? 'dark' : 'light'].accent;
  const surfaces = [base.bg, base.card, base.cardMuted, base.raised, base.bgAlt];
  return {
    ...base,
    plate: dark ? accent : base.ink,
    navActive: accent,
    accent,
    accentSoft: mix(accent, base.bg, dark ? 0.78 : 0.7),
    accentText: ensureContrast(accent, surfaces, 4.5, dark ? '#FFFFFF' : '#000000'),
    onAccent: readableOn(accent, '#16130E', '#FFFDF8'),
    washFrom: base.bg,
    washTo: base.bg,
    heroA: base.ink,
    heroB: base.ink,
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
    ? { Flights: '#B7A9FF', Stays: '#F1EADC', Food: '#F6CF4D', Activities: '#FFA062', Transport: '#8DB8FF', Shopping: '#FF9EC4', Other: '#8E8776' }
    : { Flights: '#5B3FC2', Stays: '#16130E', Food: '#FFD23F', Activities: '#E8833A', Transport: '#1B4FB0', Shopping: '#E0568C', Other: '#8E8776' };
}
