import { contrast } from '@/utils/contrast';

import { LEGACY_THEMES, THEME_KEYS, buildPalette, resolveMode, themes, type Colors, type Mode } from '../palettes';

const MODES: Mode[] = ['light', 'dark'];
const AA = 4.5;
const combos = THEME_KEYS.flatMap((key) => MODES.map((mode) => ({ key, mode, c: buildPalette(key, mode) })));
const name = (x: { key: string; mode: string }) => `${x.key} / ${x.mode}`;

describe('theme colours', () => {
  it('has six themes, each with a name and a vibe', () => {
    expect(THEME_KEYS).toHaveLength(6);
    for (const k of THEME_KEYS) expect(themes[k].name && themes[k].vibe).toBeTruthy();
  });

  it.each(combos)('body text reads at 4.5:1 on every surface: $key / $mode', ({ c }) => {
    for (const surface of [c.bg, c.card, c.cardMuted, c.raised, c.bgAlt] as const) {
      expect(contrast(c.text, surface)).toBeGreaterThanOrEqual(AA);
      expect(contrast(c.textSecondary, surface)).toBeGreaterThanOrEqual(AA);
      expect(contrast(c.textMuted, surface)).toBeGreaterThanOrEqual(AA);
    }
  });

  it.each(combos)('the accent is readable as text and carries readable text: $key / $mode', ({ c }) => {
    for (const surface of [c.bg, c.card, c.raised] as const) expect(contrast(c.accentText, surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA);
  });

  it.each(combos)('state colours read on their own tint and on the page: $key / $mode', ({ c }) => {
    const pairs: [keyof Colors, keyof Colors][] = [
      ['positive', 'positiveSoft'],
      ['warn', 'warnSoft'],
      ['red', 'redSoft'],
      ['orange', 'orangeSoft'],
      ['blue', 'blueSoft'],
      ['purple', 'purpleSoft'],
      ['teal', 'tealSoft'],
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(AA);
      expect(contrast(c[fg], c.bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(c[fg], c.card)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('the dark mode lifts surfaces with lightness: page < card < raised, on #121212', () => {
    for (const k of THEME_KEYS) {
      const c = buildPalette(k, 'dark');
      expect(c.bg).toBe('#121212');
      const L = (hex: string) => parseInt(hex.slice(1, 3), 16);
      expect(L(c.bg)).toBeLessThan(L(c.card));
      expect(L(c.card)).toBeLessThan(L(c.raised));
    }
  });

  it('is printed in ink: text, outlines and main buttons are the same ink colour', () => {
    for (const x of combos) {
      expect(x.c.ink).toBe(x.c.text);
      expect(x.c.primary).toBe(x.c.ink);
      expect(contrast(x.c.ink, x.c.card)).toBeGreaterThanOrEqual(7);
    }
  });

  it('has no gradient wash: the page is one flat colour', () => {
    for (const x of combos) expect(x.c.washFrom === x.c.bg && x.c.washTo === x.c.bg).toBe(true);
  });

  it('puts the hard shadow plate in ink on paper and in the accent at night', () => {
    for (const k of THEME_KEYS) {
      expect(buildPalette(k, 'light').plate).toBe(buildPalette(k, 'light').ink);
      expect(buildPalette(k, 'dark').plate).toBe(buildPalette(k, 'dark').accent);
    }
  });

  it('desaturates the accent for the dark mode (the dark accent is lighter, never brighter-saturated)', () => {
    for (const k of THEME_KEYS) {
      if (k === 'classic') continue;
      const sat = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return max === 0 ? 0 : (max - min) / max;
      };
      expect(sat(themes[k].dark.accent)).toBeLessThanOrEqual(sat(themes[k].light.accent) + 0.001);
    }
  });

  it('follows the phone only when asked to', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('maps every look saved by earlier versions to a theme that exists', () => {
    for (const legacy of Object.values(LEGACY_THEMES)) expect(THEME_KEYS).toContain(legacy.theme);
  });

  it('names are unique, so the picker has no twins', () => {
    expect(new Set(THEME_KEYS.map((k) => themes[k].name)).size).toBe(THEME_KEYS.length);
    expect(combos.map(name)).toHaveLength(THEME_KEYS.length * 2);
  });
});
