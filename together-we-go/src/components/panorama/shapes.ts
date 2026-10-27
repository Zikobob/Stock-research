import type { LandmarkKind } from '@/data/panoramas';

/**
 * Landmark silhouettes in unit coordinates: x is centred, y is negative upwards, 1 = full height.
 * Tones: m = main body, a = accent, l = light (windows / lamps — glows at night).
 */
export type Tone = 'm' | 'a' | 'l';
export type Part =
  | { t: 'p'; d: string; k: Tone }
  | { t: 'r'; x: number; y: number; w: number; h: number; k: Tone }
  | { t: 'c'; x: number; y: number; r: number; k: Tone }
  | { t: 'l'; x1: number; y1: number; x2: number; y2: number; w: number; k: Tone }
  | { t: 's'; d: string; w: number; k: Tone };

const p = (d: string, k: Tone): Part => ({ t: 'p', d, k });
const r = (x: number, y: number, w: number, h: number, k: Tone): Part => ({ t: 'r', x, y, w, h, k });
const c = (x: number, y: number, rad: number, k: Tone): Part => ({ t: 'c', x, y, r: rad, k });
const l = (x1: number, y1: number, x2: number, y2: number, w: number, k: Tone): Part => ({ t: 'l', x1, y1, x2, y2, w, k });
const s = (d: string, w: number, k: Tone): Part => ({ t: 's', d, w, k });

export interface Look {
  /** [day, night] colour for each tone. */
  m: [string, string];
  a: [string, string];
  l: [string, string];
  /** Night glow colour. */
  glow: string;
  /** Glow radius in units. */
  glowR: number;
}

const shell = (x: number, w: number, hh: number) =>
  `M${x} -.06C${x} ${-0.06 - hh * 0.4} ${x + w * 0.4} ${-0.06 - hh} ${x + w * 0.8} ${-0.06 - hh}C${x + w * 0.9} ${-0.06 - hh * 0.6} ${x + w} ${-0.06 - hh * 0.2} ${x + w} -.06Z`;

function eye(): Part[] {
  const out: Part[] = [s('M-.5 -.5A.5 .5 0 1 0 .5 -.5A.5 .5 0 1 0 -.5 -.5', 0.012, 'a'), l(0, -0.5, -0.2, 0, 0.016, 'm'), l(0, -0.5, 0.2, 0, 0.016, 'm')];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * 0.5;
    const y = -0.5 + Math.sin(a) * 0.5;
    out.push(l(0, -0.5, x, y, 0.003, 'm'), c(x, y, 0.017, 'l'));
  }
  return out;
}

function harbour(): Part[] {
  const out: Part[] = [s('M-1.1 0Q0 -1.5 1.1 0', 0.04, 'm'), r(-1.3, -0.12, 2.6, 0.03, 'm'), r(-1.3, -0.12, 2.6, 0.01, 'l'), r(-1.16, -0.45, 0.12, 0.45, 'a'), r(1.04, -0.45, 0.12, 0.45, 'a')];
  for (let i = 1; i < 20; i++) {
    const t = i / 20;
    out.push(l(-1.1 + 2.2 * t, -3 * t * (1 - t), -1.1 + 2.2 * t, -0.12, 0.004, 'm'));
  }
  return out;
}

function operaParts(): Part[] {
  const shells: [number, number, number][] = [
    [-0.66, 0.3, 0.58],
    [-0.4, 0.28, 0.48],
    [-0.16, 0.26, 0.38],
    [0.08, 0.34, 0.64],
    [0.36, 0.32, 0.52],
    [0.62, 0.2, 0.3],
  ];
  return [r(-0.75, -0.06, 1.55, 0.06, 'a'), ...shells.map(([x, w, hh]) => p(shell(x, w, hh), 'm'))];
}

function colosseum(): Part[] {
  const out: Part[] = [p('M-.8 0L-.8-.4L-.62-.5L.5-.5L.8-.4L.8 0Z', 'm')];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 15; i++) out.push(r(-0.76 + i * 0.105, -0.13 - row * 0.12, 0.05, 0.08, 'a'));
  return out;
}

function supertrees(): Part[] {
  const out: Part[] = [];
  for (const [cx, hh] of [
    [-0.5, 0.7],
    [0, 1],
    [0.5, 0.8],
  ] as const) {
    out.push(
      p(`M${cx - 0.03} 0L${cx - 0.008} ${-hh}L${cx + 0.008} ${-hh}L${cx + 0.03} 0Z`, 'm'),
      p(`M${cx - 0.24} ${-hh}Q${cx} ${-hh - 0.3} ${cx + 0.24} ${-hh}Z`, 'a'),
      c(cx, -hh - 0.07, 0.018, 'l'),
    );
  }
  return out;
}

export const SHAPES: Record<LandmarkKind, Part[]> = {
  eiffel: [
    p('M-.19 0L-.015-1L.015-1L.19 0L.13 0Q0 -.34 -.13 0Z', 'm'),
    r(-0.13, -0.405, 0.26, 0.016, 'm'),
    r(-0.075, -0.7, 0.15, 0.014, 'm'),
    r(-0.004, -1.07, 0.008, 0.07, 'm'),
    c(0, -0.41, 0.012, 'l'),
    c(0, -0.71, 0.01, 'l'),
    r(-0.004, -0.98, 0.008, 0.2, 'l'),
  ],
  tokyotower: [
    p('M-.14 0L-.03-.66L-.016-.78L-.006-1L.006-1L.016-.78L.03-.66L.14 0L.1 0Q0 -.22 -.1 0Z', 'm'),
    r(-0.065, -0.34, 0.13, 0.03, 'a'),
    r(-0.04, -0.62, 0.08, 0.025, 'a'),
    r(-0.12, -0.15, 0.24, 0.02, 'a'),
    c(0, -0.33, 0.012, 'l'),
  ],
  skytree: [p('M-.055 0L-.014-.6L.014-.6L.055 0Z', 'm'), r(-0.05, -0.64, 0.1, 0.03, 'a'), r(-0.032, -0.8, 0.064, 0.025, 'a'), r(-0.004, -1, 0.008, 0.2, 'm'), r(-0.003, -0.6, 0.006, 0.4, 'l')],
  fuji: [p('M-1 0L-.12-.5L-.06-.52L0-.55L.06-.52L.12-.5L1 0Z', 'm'), p('M-.16-.43L-.12-.5L-.06-.52L0-.55L.06-.52L.12-.5L.16-.43L.09-.46L.04-.4L-.02-.45L-.08-.39Z', 'a')],
  esb: [
    r(-0.15, -0.4, 0.3, 0.4, 'm'),
    r(-0.11, -0.62, 0.22, 0.22, 'm'),
    r(-0.075, -0.78, 0.15, 0.16, 'm'),
    r(-0.045, -0.88, 0.09, 0.1, 'a'),
    r(-0.022, -0.93, 0.044, 0.05, 'a'),
    r(-0.004, -1, 0.008, 0.07, 'a'),
    r(-0.03, -0.86, 0.06, 0.02, 'l'),
  ],
  wtc: [p('M-.075 0L-.075-.7L-.003-.86L.003-.86L.075-.7L.075 0Z', 'm'), r(-0.003, -1, 0.006, 0.15, 'a'), r(-0.003, -0.86, 0.006, 0.86, 'l')],
  chrysler: [r(-0.07, -0.66, 0.14, 0.66, 'm'), p('M-.07-.66Q-.07-.9 0-.95Q.07-.9 .07-.66Z', 'a'), r(-0.004, -1, 0.008, 0.06, 'a'), c(0, -0.82, 0.014, 'l')],
  bigben: [
    r(-0.05, -0.78, 0.1, 0.78, 'm'),
    p('M-.065-.78L0-1L.065-.78Z', 'a'),
    r(-0.065, -0.8, 0.13, 0.03, 'a'),
    c(0, -0.62, 0.032, 'l'),
    r(0.05, -0.2, 0.7, 0.2, 'm'),
    r(0.2, -0.3, 0.05, 0.1, 'm'),
    r(0.45, -0.28, 0.04, 0.08, 'm'),
    p('M.2-.3L.225-.38L.25-.3Z', 'a'),
    r(0.1, -0.14, 0.6, 0.03, 'l'),
  ],
  eye: eye(),
  shard: [p('M-.07 0L0-1L.07 0Z', 'm'), l(0, -1, -0.03, 0, 0.004, 'a'), l(0, -1, 0.03, 0, 0.004, 'a'), l(0, -1, 0, 0, 0.006, 'l')],
  burj: [
    p('M-.07 0L-.05-.35L-.035-.5L-.03-.62L-.02-.78L-.012-.9L-.003-1L.003-1L.012-.9L.02-.78L.03-.62L.035-.5L.05-.35L.07 0Z', 'm'),
    l(0, 0, 0, -0.95, 0.005, 'l'),
    l(-0.03, -0.2, -0.015, -0.6, 0.003, 'a'),
    l(0.03, -0.2, 0.015, -0.6, 0.003, 'a'),
  ],
  burjalarab: [p('M-.2 0L-.2-.75Q-.02-1 .02-1Q.2-.45 .2 0Z', 'm'), r(-0.45, -0.03, 0.9, 0.03, 'a'), r(-0.012, -1.1, 0.012, 0.12, 'a'), l(-0.2, -0.75, 0.02, -1, 0.012, 'l')],
  opera: operaParts(),
  harbour: harbour(),
  sydtower: [r(-0.012, -0.7, 0.024, 0.7, 'm'), p('M-.06-.7L.06-.7L.045-.8L-.045-.8Z', 'a'), r(-0.05, -0.83, 0.1, 0.05, 'a'), r(-0.004, -1, 0.008, 0.17, 'm'), r(-0.045, -0.8, 0.09, 0.012, 'l')],
  mbs: [
    p('M-.52 0L-.34 0L-.22-1L-.4-1Z', 'm'),
    p('M-.09 0L.09 0L.09-1L-.09-1Z', 'm'),
    p('M.34 0L.52 0L.4-1L.22-1Z', 'm'),
    r(-0.66, -1.05, 1.32, 0.05, 'a'),
    p('M.66-1.05L.84-1.03L.66-1Z', 'a'),
    r(-0.66, -1, 1.32, 0.012, 'l'),
  ],
  supertrees: supertrees(),
  christ: [
    p('M-1 0Q-.4 -.15 -.2 -.6Q-.1 -.95 0 -.95Q.1 -.95 .2 -.6Q.5 -.15 1 0Z', 'm'),
    r(-0.016, -1, 0.032, 0.03, 'a'),
    r(-0.007, -1.12, 0.014, 0.12, 'a'),
    r(-0.06, -1.1, 0.12, 0.014, 'a'),
    c(0, -1.135, 0.009, 'a'),
  ],
  sugarloaf: [p('M-.5 0Q-.52 -.6 -.15 -.78Q.2 -.9 .4 -.5Q.52 -.2 .55 0Z', 'm'), p('M.45 0Q.6 -.35 .9 -.35Q1.3 -.3 1.5 0Z', 'm'), l(0.28, -0.7, 1.0, -0.4, 0.004, 'a'), r(0.6, -0.6, 0.05, 0.04, 'l')],
  colosseum: colosseum(),
  stpeters: [
    r(-0.4, -0.28, 0.8, 0.28, 'm'),
    r(-0.16, -0.6, 0.32, 0.32, 'm'),
    p('M-.16-.6Q-.16-1 0-1Q.16-1 .16-.6Z', 'a'),
    r(-0.03, -1.12, 0.06, 0.12, 'm'),
    r(-0.004, -1.25, 0.008, 0.13, 'a'),
    r(-0.3, -0.2, 0.6, 0.02, 'l'),
  ],
  duomo: [
    r(-0.3, -0.5, 0.6, 0.5, 'm'),
    p('M-.22-.5Q-.22-.95 0-.95Q.22-.95 .22-.5Z', 'a'),
    l(-0.1, -0.5, -0.06, -0.93, 0.02, 'l'),
    l(0.1, -0.5, 0.06, -0.93, 0.02, 'l'),
    r(0.32, -0.78, 0.12, 0.78, 'm'),
    p('M.3-.78L.38-.92L.46-.78Z', 'a'),
    r(-0.24, -0.28, 0.12, 0.14, 'l'),
    r(0.12, -0.28, 0.12, 0.14, 'l'),
  ],
  arc: [p('M-.45 0L-.45-1L.45-1L.45 0L.18 0L.18-.55Q0 -.8 -.18-.55L-.18 0Z', 'm'), r(-0.45, -0.9, 0.9, 0.02, 'a'), r(-0.45, -1, 0.9, 0.05, 'a')],
  sacre: [
    r(-0.4, -0.35, 0.8, 0.35, 'm'),
    p('M-.15-.35Q-.15-.85 0-.9Q.15-.85 .15-.35Z', 'm'),
    p('M-.38-.35Q-.38-.6 -.28-.62Q-.18-.6 -.18-.35Z', 'm'),
    p('M.18-.35Q.18-.6 .28-.62Q.38-.6 .38-.35Z', 'm'),
    r(-0.012, -1, 0.024, 0.1, 'a'),
    r(-0.3, -0.2, 0.6, 0.02, 'l'),
  ],
};

const warm = (day: string, night: string): [string, string] => [day, night];

export const LOOKS: Record<LandmarkKind, Look> = {
  eiffel: { m: warm('#5B4B40', '#C98F2E'), a: warm('#6F5E50', '#E5B04C'), l: warm('#8C7A6A', '#FFE08A'), glow: '#FFC14D', glowR: 0.6 },
  tokyotower: { m: warm('#D9432B', '#FF7A3A'), a: warm('#F3F3F3', '#FFF1C9'), l: warm('#F3F3F3', '#FFF1C9'), glow: '#FF8A4A', glowR: 0.5 },
  skytree: { m: warm('#C9D2DC', '#6FB6FF'), a: warm('#EEF3F8', '#BFE4FF'), l: warm('#E8EEF5', '#CFEAFF'), glow: '#6FB6FF', glowR: 0.4 },
  fuji: { m: warm('#8C9DB8', '#1B2150'), a: warm('#FFFFFF', '#8FA4E0'), l: warm('#FFFFFF', '#8FA4E0'), glow: '#000000', glowR: 0 },
  esb: { m: warm('#B9B2A6', '#EAD9A8'), a: warm('#9C9488', '#FFD36B'), l: warm('#D7D1C6', '#FFF0B8'), glow: '#FFD36B', glowR: 0.5 },
  wtc: { m: warm('#8FA6C0', '#BFD7F5'), a: warm('#C9D5E2', '#FFFFFF'), l: warm('#DCE6F0', '#FFFFFF'), glow: '#BFD7F5', glowR: 0.45 },
  chrysler: { m: warm('#A9A39C', '#E6DFC8'), a: warm('#D5DAE0', '#F4F8FF'), l: warm('#F5F5F5', '#FFFFFF'), glow: '#F4F8FF', glowR: 0.45 },
  bigben: { m: warm('#B3A58E', '#D9B76E'), a: warm('#7D8B6E', '#F0D8A0'), l: warm('#E8E2D0', '#FFF6C9'), glow: '#FFD98A', glowR: 0.45 },
  eye: { m: warm('#8FA3B8', '#5EB6FF'), a: warm('#B5C7DA', '#8AD0FF'), l: warm('#FFFFFF', '#CFEFFF'), glow: '#5EB6FF', glowR: 0.7 },
  shard: { m: warm('#9DB6CE', '#CFE3FF'), a: warm('#C5D6E6', '#FFFFFF'), l: warm('#E6EEF6', '#FFFFFF'), glow: '#CFE3FF', glowR: 0.4 },
  burj: { m: warm('#B9C6D4', '#DDEBFF'), a: warm('#8EA2B8', '#7DB8FF'), l: warm('#E8F0F8', '#FFFFFF'), glow: '#9CC8FF', glowR: 0.4 },
  burjalarab: { m: warm('#F4F1EA', '#5A9BFF'), a: warm('#D9D5CB', '#B58BFF'), l: warm('#FFFFFF', '#E1D0FF'), glow: '#7B8CFF', glowR: 0.6 },
  opera: { m: warm('#F2EFE8', '#FFD9A0'), a: warm('#C9C3B6', '#C97F4A'), l: warm('#FFFFFF', '#FFE9C0'), glow: '#FFC878', glowR: 0.7 },
  harbour: { m: warm('#59616B', '#8EB8E8'), a: warm('#B59A7B', '#F4C27A'), l: warm('#FFFFFF', '#FFE08A'), glow: '#8EB8E8', glowR: 0.5 },
  sydtower: { m: warm('#9AA3AD', '#F4C95D'), a: warm('#C9A24B', '#FFE08A'), l: warm('#FFFFFF', '#FFF0B0'), glow: '#F4C95D', glowR: 0.4 },
  mbs: { m: warm('#B5BFC9', '#E6EEF8'), a: warm('#8FA0B2', '#FFB36B'), l: warm('#E8F2FF', '#FFE7A8'), glow: '#8FC8FF', glowR: 0.5 },
  supertrees: { m: warm('#4B6B52', '#2E4A3A'), a: warm('#6FA37A', '#C25BFF'), l: warm('#D0F0D8', '#FF8CF0'), glow: '#C25BFF', glowR: 0.7 },
  christ: { m: warm('#4D6B5A', '#10202A'), a: warm('#F2F2F2', '#FFF3C9'), l: warm('#FFFFFF', '#FFF3C9'), glow: '#FFF3C9', glowR: 0.1 },
  sugarloaf: { m: warm('#5E7467', '#16222B'), a: warm('#C9D2CC', '#FFD07A'), l: warm('#FFFFFF', '#FFD07A'), glow: '#FFD07A', glowR: 0 },
  colosseum: { m: warm('#C7A57C', '#6D4B33'), a: warm('#8E6E4A', '#FFC873'), l: warm('#E8D2B0', '#FFD89A'), glow: '#FFB45E', glowR: 0.5 },
  stpeters: { m: warm('#D9CDB6', '#F0CF8F'), a: warm('#B8A98B', '#FFE3A8'), l: warm('#F2EAD8', '#FFF0C8'), glow: '#FFD98A', glowR: 0.5 },
  duomo: { m: warm('#F2D5B0', '#FFCF8A'), a: warm('#E0A93C', '#FFE08A'), l: warm('#4E9E6B', '#7DFFB0'), glow: '#FFC878', glowR: 0.5 },
  arc: { m: warm('#C9BFA9', '#EBCB86'), a: warm('#A89E88', '#FFE2A0'), l: warm('#FFFFFF', '#FFF0C8'), glow: '#FFD98A', glowR: 0.5 },
  sacre: { m: warm('#F4EFE6', '#FFE9B8'), a: warm('#D9D2C4', '#FFF6D9'), l: warm('#FFFFFF', '#FFF6D9'), glow: '#FFE9B8', glowR: 0.5 },
};
