/**
 * Finds places for the "Where do you want to go?" box. Two sources:
 *  - the trip's own saved places: instant, works with no connection;
 *  - OpenStreetMap places from Photon (free, no account or key), searched around the trip first and anywhere if nothing is near.
 * Only the words you typed and a rounded map point (about 1 km) are sent. Distances are worked out on the phone.
 */
import { destinationById } from '@/data/destinations';
import { placeToActivityType, placesFor, type Place } from '@/data/places';
import type { ActivityType } from '@/store/types';
import { distanceKm, type LatLng } from '@/utils/geo';

export interface PlaceHit {
  id: string;
  name: string;
  /** Street or area, e.g. "Via Pasitea 172, Positano". */
  detail: string;
  lat: number;
  lng: number;
  type: ActivityType;
  source: 'saved' | 'online';
  /** Only for saved places: the id in our own data and the usual visit length and price. */
  placeId?: string;
  durationMin?: number;
  costPerPerson?: number;
}

export const PHOTON_URL = 'https://photon.komoot.io/api/';
export const MAX_HITS = 7;

/** "The museum" -> "museum": leading articles only get in the way of a search. */
export function normalizeQuery(text: string): string {
  const q = text.trim().replace(/\s+/g, ' ').replace(/^(the|a|an)\s+/i, '');
  return /^(the|a|an)$/i.test(q) ? '' : q;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function savedScore(p: Place, q: string): number {
  const name = p.name.toLowerCase();
  if (name.startsWith(q)) return 4;
  if (name.split(/[\s,\-–—]+/).some((w) => w.startsWith(q))) return 3;
  if (name.includes(q)) return 2;
  if (p.area.toLowerCase().includes(q) || new RegExp(`\\b${escapeRe(q)}\\b`).test(p.blurb.toLowerCase())) return 1;
  return 0;
}

function savedHit(p: Place): PlaceHit {
  const city = destinationById(p.destinationId)?.city;
  return {
    id: `saved:${p.id}`,
    name: p.name,
    detail: [...new Set([p.area, city].filter((x): x is string => !!x))].join(', '),
    lat: p.lat,
    lng: p.lng,
    type: placeToActivityType[p.category],
    source: 'saved',
    placeId: p.id,
    durationMin: p.durationMin,
    costPerPerson: p.cost,
  };
}

/** The trip's saved places that match what was typed (best first). Instant and offline. */
export function searchSaved(query: string, destinationIds: string[]): PlaceHit[] {
  const q = normalizeQuery(query).toLowerCase();
  if (q.length < 2) return [];
  const places = new Map(destinationIds.flatMap((id) => placesFor(id)).map((p) => [p.id, p] as const));
  return [...places.values()]
    .map((p) => ({ p, score: savedScore(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, 4)
    .map((x) => savedHit(x.p));
}

// ---- online

interface PhotonFeature {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, unknown>;
}

/** Streets and bus stops match almost any word but are never a plan. */
const NOT_A_PLAN = new Set(['highway', 'public_transport', 'boundary', 'waterway', 'building', 'landuse']);

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

/** What kind of activity an OpenStreetMap place is, from its tag (for example tourism=museum). */
export function typeFromOsm(key: string, value: string): ActivityType {
  const v = value.toLowerCase();
  switch (key) {
    case 'amenity':
      if (/^(bar|pub|nightclub|biergarten|casino)$/.test(v)) return 'nightlife';
      if (/^(restaurant|cafe|fast_food|food_court|ice_cream|bakery)$/.test(v)) return 'food';
      if (/^(place_of_worship|theatre|arts_centre|library|cinema|townhall)$/.test(v)) return 'culture';
      return 'sightseeing';
    case 'tourism':
      if (/^(hotel|hostel|guest_house|apartment|motel|chalet|camp_site)$/.test(v)) return 'stay';
      if (/^(museum|gallery|artwork)$/.test(v)) return 'culture';
      return 'sightseeing';
    case 'historic':
      return 'culture';
    case 'shop':
    case 'craft':
      return v === 'bakery' || v === 'pastry' || v === 'confectionery' ? 'food' : 'shopping';
    case 'railway':
    case 'aeroway':
      return 'transport';
    case 'leisure':
      return /^(sports_centre|pitch|swimming_pool|marina|water_park)$/.test(v) ? 'adventure' : 'sightseeing';
    case 'natural':
      return /^(peak|cave_entrance|volcano|cliff)$/.test(v) ? 'adventure' : 'sightseeing';
    default:
      return 'sightseeing';
  }
}

function fromFeature(f: PhotonFeature): PlaceHit | null {
  const p = f.properties ?? {};
  const [lng, lat] = f.geometry?.coordinates ?? [];
  const name = str(p.name);
  const key = str(p.osm_key);
  if (!name || typeof lat !== 'number' || typeof lng !== 'number' || NOT_A_PLAN.has(key)) return null;
  const street = [str(p.street), str(p.housenumber)].filter(Boolean).join(' ');
  const town = str(p.city) || str(p.district) || str(p.county) || str(p.state);
  const parts = [...new Set([street, town].filter((x) => x && x !== name))];
  return {
    id: `online:${str(p.osm_type)}${str(p.osm_id) || `${lat.toFixed(5)},${lng.toFixed(5)}`}`,
    name,
    detail: (parts.length ? parts : [str(p.country)].filter(Boolean)).join(', '),
    lat,
    lng,
    type: typeFromOsm(key, str(p.osm_value)),
    source: 'online',
  };
}

/** [west, south, east, north] of a square around `c`, `radiusKm` out in every direction. */
export function boxAround(c: LatLng, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 110.57;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((c.lat * Math.PI) / 180)));
  return [c.lng - dLng, c.lat - dLat, c.lng + dLng, c.lat + dLat];
}

export interface OnlineOptions {
  signal?: AbortSignal;
  /** For tests. */
  fetchFn?: typeof fetch;
  /** How far around the trip to look first. */
  radiusKm?: number;
  timeoutMs?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const cache = new Map<string, PlaceHit[]>();

async function ask(q: string, center: LatLng | null, boxed: boolean, o: OnlineOptions): Promise<PlaceHit[]> {
  const params = [`q=${encodeURIComponent(q)}`, 'limit=6', 'lang=en'];
  if (center) params.push(`lat=${r2(center.lat)}`, `lon=${r2(center.lng)}`);
  if (center && boxed) params.push(`bbox=${boxAround(center, o.radiusKm ?? 40).map((n) => n.toFixed(3)).join(',')}`);

  // one signal that stops on the caller's cancel or on our own time limit
  const stop = new AbortController();
  const cancel = () => stop.abort();
  if (o.signal?.aborted) cancel();
  o.signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, o.timeoutMs ?? 6000);
  try {
    const res = await (o.fetchFn ?? fetch)(`${PHOTON_URL}?${params.join('&')}`, { signal: stop.signal });
    if (!res.ok) throw new Error(`Place search answered ${res.status}`);
    const json = (await res.json()) as { features?: PhotonFeature[] };
    return (json.features ?? []).map(fromFeature).filter((h): h is PlaceHit => !!h);
  } finally {
    clearTimeout(timer);
    o.signal?.removeEventListener('abort', cancel);
  }
}

/**
 * Places from OpenStreetMap that match what was typed, looked for around `center` first and anywhere if none are there.
 * Rejects when there is no connection or the service is down.
 */
export async function searchOnline(query: string, center: LatLng | null, o: OnlineOptions = {}): Promise<PlaceHit[]> {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const key = `${q.toLowerCase()}|${center ? `${r2(center.lat)}|${r2(center.lng)}` : 'anywhere'}`;
  const known = cache.get(key);
  if (known) return known;
  const near = center ? await ask(q, center, true, o) : [];
  const hits = near.length ? near : await ask(q, center, false, o);
  cache.set(key, hits);
  if (cache.size > 60) cache.delete(cache.keys().next().value as string);
  return hits;
}

const plain = (s: string) => s.toLowerCase().replace(/[\s\-–—.,'’"()]+/g, ' ').trim();

/** Saved places first, then the online ones, without showing the same place twice. */
export function mergeHits(saved: PlaceHit[], online: PlaceHit[]): PlaceHit[] {
  const same = (a: PlaceHit, b: PlaceHit) => {
    const x = plain(a.name);
    const y = plain(b.name);
    return distanceKm(a, b) < 0.4 && (x.includes(y) || y.includes(x));
  };
  const out = [...saved];
  for (const h of online) if (!out.some((o) => o.id === h.id || same(o, h))) out.push(h);
  return out.slice(0, MAX_HITS);
}

const GUESSES: [RegExp, ActivityType][] = [
  [/\b(flight|airport|train|bus|ferry|taxi|transfer|station|metro|drive|rental)\b/, 'transport'],
  [/\b(hotel|hostel|check[- ]?in|check[- ]?out|airbnb|apartment|resort)\b/, 'stay'],
  [/\b(dinner|lunch|breakfast|brunch|restaurant|pizza|pasta|cafe|café|coffee|gelato|ice cream|bakery|food|eat|tacos|sushi|ramen|bbq)\b/, 'food'],
  [/\b(bar|pub|club|drinks|cocktails?|aperitivo|nightlife|party|karaoke)\b/, 'nightlife'],
  [/\b(museum|gallery|church|cathedral|temple|shrine|palace|castle|ruins|monument|theat(er|re)|opera|historic)\b/, 'culture'],
  [/\b(hike|hiking|trail|climb|kayak|surf|dive|diving|snorkel|boat|bike|ski|zipline)\b/, 'adventure'],
  [/\b(shop|shopping|market|mall|boutique|souvenirs?|store)\b/, 'shopping'],
];

/** The likeliest activity type for words typed by hand ("dinner at 7" is food). */
export function guessType(text: string): ActivityType {
  const t = text.toLowerCase();
  return GUESSES.find(([re]) => re.test(t))?.[1] ?? 'sightseeing';
}
