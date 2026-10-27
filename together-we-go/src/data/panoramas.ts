/**
 * Recipes for the illustrated 360° city views (src/app/panorama.tsx).
 * Everything is drawn in code from these numbers, so it works offline and needs no image licences.
 */
export type Roof = 'flat' | 'step' | 'spire' | 'slant' | 'gable' | 'dome';

export type LandmarkKind =
  | 'eiffel'
  | 'arc'
  | 'sacre'
  | 'tokyotower'
  | 'skytree'
  | 'fuji'
  | 'esb'
  | 'wtc'
  | 'chrysler'
  | 'bigben'
  | 'eye'
  | 'shard'
  | 'burj'
  | 'burjalarab'
  | 'opera'
  | 'harbour'
  | 'sydtower'
  | 'mbs'
  | 'supertrees'
  | 'christ'
  | 'sugarloaf'
  | 'colosseum'
  | 'stpeters'
  | 'duomo';

export interface Landmark {
  id: string;
  name: string;
  fact: string;
  kind: LandmarkKind;
  /** Compass heading (0–360°) at which it appears in the view. */
  heading: number;
  /** Height as a fraction of the screen height. */
  size: number;
  /** Far landmarks (mountains) sit behind the skyline. */
  far?: boolean;
}

export interface Pano {
  id: string;
  /** Matching destination id, so trips can open their own city. */
  destId: string;
  name: string;
  country: string;
  emoji: string;
  tz: string;
  seed: number;
  /** 'road' = street with cars, 'water' = harbour/sea in front, 'slope' = houses climbing a hillside. */
  ground: 'road' | 'water' | 'slope';
  mountains?: 'hills' | 'granite' | 'cliffs';
  /** Mid-layer skyline: width range in px, height range as a fraction of screen height, gap in px, roof styles. */
  mid: { w: [number, number]; h: [number, number]; gap: number; roofs: Roof[]; towers: number };
  /** Near-layer low buildings (height fraction). */
  near: { h: [number, number] };
  sky: { dayTop: string; dayHorizon: string; nightTop: string; nightHorizon: string };
  /** [day, night] fill for the far, mid and near layers. */
  tone: { far: [string, string]; mid: [string, string]; near: [string, string] };
  /** Colour of lit windows at night. */
  lights: string;
  /** Optional pastel house colours (Positano). */
  houses?: string[];
  landmarks: Landmark[];
}

export const PANORAMAS: Pano[] = [
  {
    id: 'positano',
    destId: 'positano',
    name: 'Positano',
    country: 'Italy',
    emoji: '🍋',
    tz: 'Europe/Rome',
    seed: 11,
    ground: 'slope',
    mountains: 'cliffs',
    mid: { w: [18, 34], h: [0.05, 0.12], gap: 2, roofs: ['gable', 'flat', 'dome'], towers: 0 },
    near: { h: [0.03, 0.07] },
    sky: { dayTop: '#4FA8EE', dayHorizon: '#EAF6FF', nightTop: '#070B28', nightHorizon: '#5A3F6E' },
    tone: { far: ['#8FA39A', '#1A2340'], mid: ['#7A9B7F', '#142030'], near: ['#C9916F', '#1B1426'] },
    lights: '#FFC878',
    houses: ['#F2B8A2', '#F7D49A', '#E9967A', '#F4E3B1', '#E7A27C', '#F6C6D0', '#FBE7B0'],
    landmarks: [
      {
        id: 'duomo',
        name: 'Santa Maria Assunta',
        fact: 'Positano’s landmark church with a colourful majolica-tiled dome; its Black Madonna icon is said to date from the 13th century.',
        kind: 'duomo',
        heading: 70,
        size: 0.2,
      },
    ],
  },
  {
    id: 'tokyo',
    destId: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    emoji: '🗼',
    tz: 'Asia/Tokyo',
    seed: 21,
    ground: 'road',
    mountains: 'hills',
    mid: { w: [16, 40], h: [0.05, 0.26], gap: 3, roofs: ['flat', 'step', 'slant', 'spire'], towers: 0.18 },
    near: { h: [0.05, 0.14] },
    sky: { dayTop: '#6BAFE8', dayHorizon: '#D6EAF8', nightTop: '#0A0F2C', nightHorizon: '#6B3A72' },
    tone: { far: ['#B3C2D4', '#1A2147'], mid: ['#8797AD', '#121832'], near: ['#5B6A80', '#0B0F22'] },
    lights: '#FFD27A',
    landmarks: [
      {
        id: 'tokyotower',
        name: 'Tokyo Tower',
        fact: '333 m tall and inspired by the Eiffel Tower. It is painted orange and white so aircraft can see it.',
        kind: 'tokyotower',
        heading: 40,
        size: 0.34,
      },
      { id: 'skytree', name: 'Tokyo Skytree', fact: '634 m — the tallest tower in the world, opened in 2012.', kind: 'skytree', heading: 150, size: 0.4 },
      { id: 'fuji', name: 'Mt Fuji', fact: '3,776 m, Japan’s highest peak. On clear days you can see it from Tokyo.', kind: 'fuji', heading: 255, size: 0.2, far: true },
    ],
  },
  {
    id: 'paris',
    destId: 'paris',
    name: 'Paris',
    country: 'France',
    emoji: '🥐',
    tz: 'Europe/Paris',
    seed: 31,
    ground: 'road',
    mid: { w: [20, 44], h: [0.04, 0.1], gap: 1, roofs: ['gable', 'slant', 'flat', 'dome'], towers: 0.02 },
    near: { h: [0.05, 0.11] },
    sky: { dayTop: '#8DB8E8', dayHorizon: '#F4E8D6', nightTop: '#0E1230', nightHorizon: '#6D3F5C' },
    tone: { far: ['#C9CFD8', '#1D2348'], mid: ['#B5AA9A', '#171B38'], near: ['#8E8372', '#0E1124'] },
    lights: '#FFCB7A',
    landmarks: [
      { id: 'eiffel', name: 'Eiffel Tower', fact: '330 m tall and finished in 1889. After dark it sparkles for five minutes every hour.', kind: 'eiffel', heading: 60, size: 0.36 },
      { id: 'sacre', name: 'Sacré-Cœur', fact: 'A white basilica on Montmartre hill, finished in 1914 — the best free view in Paris.', kind: 'sacre', heading: 170, size: 0.2 },
      { id: 'arc', name: 'Arc de Triomphe', fact: 'Commissioned by Napoleon in 1806. Twelve avenues meet around it.', kind: 'arc', heading: 270, size: 0.16 },
    ],
  },
  {
    id: 'new-york',
    destId: 'new-york',
    name: 'New York',
    country: 'USA',
    emoji: '🗽',
    tz: 'America/New_York',
    seed: 41,
    ground: 'water',
    mid: { w: [16, 38], h: [0.08, 0.34], gap: 2, roofs: ['flat', 'step', 'spire', 'slant'], towers: 0.3 },
    near: { h: [0.05, 0.13] },
    sky: { dayTop: '#5FA2E6', dayHorizon: '#D7E8F8', nightTop: '#070B22', nightHorizon: '#473366' },
    tone: { far: ['#A6B7CC', '#18204A'], mid: ['#7C8DA6', '#10162F'], near: ['#55637A', '#0A0E20'] },
    lights: '#FFD684',
    landmarks: [
      { id: 'esb', name: 'Empire State Building', fact: '443 m with its antenna, opened in 1931. The top lights change colour for holidays and events.', kind: 'esb', heading: 30, size: 0.4 },
      { id: 'chrysler', name: 'Chrysler Building', fact: 'An Art Deco gem from 1930 with a stainless-steel crown that glows at night.', kind: 'chrysler', heading: 75, size: 0.36 },
      { id: 'wtc', name: 'One World Trade Center', fact: '541 m (1,776 feet) — the tallest building in the Western Hemisphere.', kind: 'wtc', heading: 160, size: 0.44 },
    ],
  },
  {
    id: 'london',
    destId: 'london',
    name: 'London',
    country: 'United Kingdom',
    emoji: '🎡',
    tz: 'Europe/London',
    seed: 51,
    ground: 'water',
    mid: { w: [18, 40], h: [0.05, 0.14], gap: 2, roofs: ['flat', 'gable', 'step'], towers: 0.08 },
    near: { h: [0.05, 0.12] },
    sky: { dayTop: '#8FA9C4', dayHorizon: '#DDE2E7', nightTop: '#0C1128', nightHorizon: '#52405A' },
    tone: { far: ['#B8C1CC', '#1C2347'], mid: ['#8D98A6', '#141A36'], near: ['#667180', '#0C1022'] },
    lights: '#FFD07A',
    landmarks: [
      { id: 'bigben', name: 'Big Ben', fact: 'Technically the bell inside the Elizabeth Tower, which is 96 m tall.', kind: 'bigben', heading: 20, size: 0.3 },
      { id: 'eye', name: 'London Eye', fact: '135 m tall — one full turn takes about 30 minutes.', kind: 'eye', heading: 85, size: 0.28 },
      { id: 'shard', name: 'The Shard', fact: '310 m, the tallest building in the UK, opened in 2012.', kind: 'shard', heading: 205, size: 0.4 },
    ],
  },
  {
    id: 'dubai',
    destId: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    emoji: '🏙️',
    tz: 'Asia/Dubai',
    seed: 61,
    ground: 'water',
    mid: { w: [14, 34], h: [0.07, 0.3], gap: 4, roofs: ['flat', 'slant', 'spire', 'step'], towers: 0.3 },
    near: { h: [0.04, 0.1] },
    sky: { dayTop: '#E4B67A', dayHorizon: '#F8E6C6', nightTop: '#0B1026', nightHorizon: '#8A4A2E' },
    tone: { far: ['#D9C4A2', '#221E3E'], mid: ['#B79F7E', '#171A36'], near: ['#8C7757', '#0C0F22'] },
    lights: '#FFD58A',
    landmarks: [
      { id: 'burj', name: 'Burj Khalifa', fact: '828 m — the tallest building in the world since 2010.', kind: 'burj', heading: 90, size: 0.5 },
      { id: 'burjalarab', name: 'Burj Al Arab', fact: 'A sail-shaped hotel on its own island, 321 m tall.', kind: 'burjalarab', heading: 225, size: 0.34 },
    ],
  },
  {
    id: 'sydney',
    destId: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    emoji: '🦘',
    tz: 'Australia/Sydney',
    seed: 71,
    ground: 'water',
    mid: { w: [16, 36], h: [0.05, 0.2], gap: 3, roofs: ['flat', 'step', 'slant'], towers: 0.1 },
    near: { h: [0.05, 0.11] },
    sky: { dayTop: '#4FA9EE', dayHorizon: '#DDF1FF', nightTop: '#080D2C', nightHorizon: '#4C3B72' },
    tone: { far: ['#A8C0D4', '#1A2248'], mid: ['#7E96AE', '#121936'], near: ['#586C84', '#0A0F24'] },
    lights: '#FFD27A',
    landmarks: [
      { id: 'opera', name: 'Sydney Opera House', fact: 'Opened in 1973. Its roof is covered by more than a million tiles.', kind: 'opera', heading: 60, size: 0.16 },
      { id: 'harbour', name: 'Sydney Harbour Bridge', fact: 'Opened in 1932 — locals call it “the Coathanger”.', kind: 'harbour', heading: 135, size: 0.22 },
      { id: 'sydtower', name: 'Sydney Tower', fact: '309 m — the tallest structure in Sydney.', kind: 'sydtower', heading: 255, size: 0.4 },
    ],
  },
  {
    id: 'singapore',
    destId: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    emoji: '🦁',
    tz: 'Asia/Singapore',
    seed: 81,
    ground: 'water',
    mid: { w: [16, 36], h: [0.07, 0.26], gap: 3, roofs: ['flat', 'step', 'slant', 'spire'], towers: 0.22 },
    near: { h: [0.04, 0.1] },
    sky: { dayTop: '#53B7EA', dayHorizon: '#E5F6FF', nightTop: '#080C2A', nightHorizon: '#2D4E7A' },
    tone: { far: ['#A9C8D6', '#162448'], mid: ['#7FA0B0', '#101A38'], near: ['#587888', '#0A1122'] },
    lights: '#FFE08A',
    landmarks: [
      { id: 'mbs', name: 'Marina Bay Sands', fact: 'Three towers topped by a 340 m-long SkyPark with the world’s largest rooftop infinity pool.', kind: 'mbs', heading: 80, size: 0.2 },
      { id: 'supertrees', name: 'Supertree Grove', fact: 'Giant solar-powered “trees” at Gardens by the Bay, up to 50 m tall and lit up every night.', kind: 'supertrees', heading: 200, size: 0.2 },
    ],
  },
  {
    id: 'rio',
    destId: 'rio',
    name: 'Rio de Janeiro',
    country: 'Brazil',
    emoji: '⛰️',
    tz: 'America/Sao_Paulo',
    seed: 91,
    ground: 'water',
    mountains: 'granite',
    mid: { w: [16, 36], h: [0.05, 0.18], gap: 3, roofs: ['flat', 'step', 'slant'], towers: 0.08 },
    near: { h: [0.04, 0.1] },
    sky: { dayTop: '#4DAFE6', dayHorizon: '#E9F6FF', nightTop: '#0A1030', nightHorizon: '#6B3C5E' },
    tone: { far: ['#6F9A86', '#13213A'], mid: ['#8FA2B4', '#131B38'], near: ['#667A8E', '#0B1124'] },
    lights: '#FFD27A',
    landmarks: [
      { id: 'christ', name: 'Christ the Redeemer', fact: 'A 30 m statue on top of 700 m-high Corcovado, finished in 1931.', kind: 'christ', heading: 60, size: 0.28, far: true },
      { id: 'sugarloaf', name: 'Sugarloaf Mountain', fact: 'A 396 m granite peak reached by a two-stage cable car since 1912.', kind: 'sugarloaf', heading: 190, size: 0.3, far: true },
    ],
  },
  {
    id: 'rome',
    destId: 'rome',
    name: 'Rome',
    country: 'Italy',
    emoji: '🏛️',
    tz: 'Europe/Rome',
    seed: 101,
    ground: 'road',
    mountains: 'hills',
    mid: { w: [20, 44], h: [0.04, 0.11], gap: 1, roofs: ['gable', 'flat', 'dome', 'slant'], towers: 0.02 },
    near: { h: [0.05, 0.11] },
    sky: { dayTop: '#74B2E6', dayHorizon: '#F6E8CC', nightTop: '#0D1130', nightHorizon: '#7A4A3A' },
    tone: { far: ['#B9B79C', '#1E2444'], mid: ['#C2A17E', '#1A1D3A'], near: ['#9A7A58', '#0F1226'] },
    lights: '#FFC878',
    landmarks: [
      { id: 'colosseum', name: 'Colosseum', fact: 'Opened in AD 80 and could seat roughly 50,000 spectators.', kind: 'colosseum', heading: 50, size: 0.2 },
      { id: 'stpeters', name: 'St Peter’s Basilica', fact: 'Michelangelo’s dome rises about 136 m — one of the tallest domes in the world.', kind: 'stpeters', heading: 200, size: 0.3 },
    ],
  },
];

export const panoById = (id: string | undefined) => PANORAMAS.find((p) => p.id === id || p.destId === id);
