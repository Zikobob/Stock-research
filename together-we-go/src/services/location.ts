/** Device location with graceful fallbacks (permission denied, web, timeouts). */
import * as Location from 'expo-location';

import type { LatLng } from '@/utils/geo';

export interface LocationResult extends LatLng {
  source: 'device' | 'fallback';
}

/** The last real fix, reused for a couple of minutes so screens that ask often do not ask the phone every time. */
let recent: { at: number; fix: LocationResult } | null = null;

export async function getLocation(fallback: LatLng): Promise<LocationResult> {
  if (recent && Date.now() - recent.at < 2 * 60 * 1000) return recent.fix;
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ...fallback, source: 'fallback' };
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    const pos =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]));
    if (!pos) return { ...fallback, source: 'fallback' };
    const fix: LocationResult = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device' };
    recent = { at: Date.now(), fix };
    return fix;
  } catch {
    return { ...fallback, source: 'fallback' };
  }
}
