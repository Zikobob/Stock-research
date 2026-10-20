/** Pure helpers for choosing a look (theme, light or dark, corners). No React Native in here, so tests can check it. */
import { resolveMode, themes, type Mode, type ModePref, type ThemeKey } from '@/theme/palettes';

export type Corners = 'rounded' | 'bubbly' | 'sharp';

export interface Look {
  theme: ThemeKey;
  mode: ModePref;
  corners: Corners;
}

/** Picking Midnight switches to the dark mode; every other theme leaves the mode as it is. The person can still change it back. */
export function modeAfterPickingTheme(theme: ThemeKey, mode: ModePref): ModePref {
  return themes[theme].mode ?? mode;
}

/** Does putting on `next` mean the app has to restart (a different theme, corner style, or light or dark that actually shows)? */
export function lookNeedsReload(next: Look, current: Look & { resolved: Mode }, systemIsDark: boolean): boolean {
  return next.theme !== current.theme || next.corners !== current.corners || resolveMode(next.mode, systemIsDark) !== current.resolved;
}

export const MODE_LABEL: Record<ModePref, string> = { system: 'System', light: 'Light', dark: 'Dark' };

/** "Amalfi · System", for a summary line. */
export function lookLabel(look: Pick<Look, 'theme' | 'mode'>): string {
  return `${themes[look.theme].name} · ${MODE_LABEL[look.mode]}`;
}
