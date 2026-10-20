/** Colour maths for the theme: mixing colours and checking the WCAG contrast ratio (4.5:1 is the AA minimum for body text). */

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** `t` of the way from colour `a` to colour `b` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/** Relative luminance (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, from 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on `bg`. */
export function readableOn(bg: string, dark = '#0A0A0A', light = '#FFFFFF'): string {
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light;
}

/**
 * Moves `color` toward `toward` in small steps until it reaches `min` contrast on every colour in `on`.
 * Used to turn a vivid accent into one that is safe to use as text.
 */
export function ensureContrast(color: string, on: string[], min: number, toward: string): string {
  let c = color;
  for (let i = 0; i <= 40 && on.some((bg) => contrast(c, bg) < min); i++) c = mix(color, toward, (i + 1) / 40);
  return c;
}
