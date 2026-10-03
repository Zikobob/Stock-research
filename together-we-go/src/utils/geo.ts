import { airports, type Airport } from '@/data/airports';

export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function compassPoint(deg: number): string {
  const pts = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return pts[Math.round(deg / 45) % 8];
}

export function kmLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Rough door-to-door estimate for city driving / airport transfer. */
export function driveMinutes(km: number): number {
  return Math.max(5, Math.round((km / 38) * 60 + 8));
}

export function nearestAirports(from: LatLng, count = 5): (Airport & { km: number })[] {
  return airports
    .map((a) => ({ ...a, km: distanceKm(from, a) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, count);
}

/** Projects a point into x/y kilometres east/north of `center` (equirectangular, fine for < 50 km). */
export function projectKm(center: LatLng, p: LatLng) {
  return {
    x: (p.lng - center.lng) * 111.32 * Math.cos(rad(center.lat)),
    y: (p.lat - center.lat) * 110.57,
  };
}
