/** Device location with graceful fallbacks (permission denied, web, timeouts). */
import * as Location from 'expo-location';

import type { LatLng } from '@/utils/geo';

export interface LocationResult extends LatLng {
  source: 'device' | 'fallback';
}

export async function getLocation(fallback: LatLng): Promise<LocationResult> {
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
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device' };
  } catch {
    return { ...fallback, source: 'fallback' };
  }
}
