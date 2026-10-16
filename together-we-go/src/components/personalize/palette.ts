import { baseColors, themes, type ThemeKey } from '@/theme';

/** Colours of a palette (merged over Forest) — used for the live previews. */
export function paletteOf(k: ThemeKey) {
  return { ...baseColors, ...themes[k].palette };
}

export type Pal = ReturnType<typeof paletteOf>;
