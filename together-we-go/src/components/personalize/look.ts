/** Pure helpers for choosing a look (theme, light or dark, corners). No React Native in here, so tests can check it. */
import { resolveMode, themes, type Mode, type ModePref, type ThemeKey } from '@/theme/palettes';

export type Corners = 'rounded' | 'bubbly' | 'sharp';

export interface Look {
  theme: ThemeKey;
  mode: ModePref;
  corners: Corners;
}

/** Picking Grape switches to the dark mode; every other theme leaves the mode as it is. The person can still change it back. */
export function modeAfterPickingTheme(theme: ThemeKey, mode: ModePref): ModePref {
  return themes[theme].mode ?? mode;
}

/** Does putting on `next` mean the app has to restart (a different theme, corner style, or light or dark that actually shows)? */
export function lookNeedsReload(next: Look, current: Look & { resolved: Mode }, systemIsDark: boolean): boolean {
  return next.theme !== current.theme || next.corners !== current.corners || resolveMode(next.mode, systemIsDark) !== current.resolved;
}

export const MODE_LABEL: Record<ModePref, string> = { system: 'System', light: 'Light', dark: 'Dark' };

/** "Limoncello · System", for a summary line. */
export function lookLabel(look: Pick<Look, 'theme' | 'mode'>): string {
  return `${themes[look.theme].name} · ${MODE_LABEL[look.mode]}`;
}

/** Three letters of a word in capitals ("Limoncello" gives "LIM"). */
const tag = (word: string) =>
  word
    .replace(/[^a-z]/gi, '')
    .slice(0, 3)
    .toUpperCase();

/** A short code for a set of answers, printed on the stub of the last page like a booking reference: "LIM-PLA-LIV". */
export function styleCode(theme: ThemeKey, layoutName: string, effectsName: string): string {
  return [themes[theme].name, layoutName, effectsName].map(tag).join('-');
}

/**
 * Widths (1 to 3) of the bars and gaps of a barcode drawn from a code, so the same answers always print the same stripes.
 * Bars and gaps alternate, starting with a bar.
 */
export function barcodeWidths(code: string, count = 34): number[] {
  let seed = 17;
  for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) % 2147483647;
  return Array.from({ length: count }, () => {
    seed = (seed * 48271) % 2147483647;
    return 1 + (seed % 3);
  });
}
