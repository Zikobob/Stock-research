import { useEffect, useMemo, useState } from 'react';

import { mergeHits, normalizeQuery, searchOnline, searchSaved, type PlaceHit } from '@/services/placeSearch';
import { getLocation, type LocationResult } from '@/services/location';
import type { LatLng } from '@/utils/geo';

/** Where the phone is (or `fallback` while that is unknown, denied or unavailable). Asks once the screen needs it. */
export function useMyLocation(fallback: LatLng, enabled: boolean): LocationResult {
  const [fix, setFix] = useState<LocationResult | null>(null);
  const { lat, lng } = fallback;
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getLocation({ lat, lng }).then((r) => live && setFix(r));
    return () => {
      live = false;
    };
  }, [enabled, lat, lng]);
  return fix ?? { lat, lng, source: 'fallback' };
}

export interface PlaceSearchState {
  hits: PlaceHit[];
  /** Waiting for the online answer (saved places are already in `hits`). */
  loading: boolean;
  /** The online search could not be reached, so only saved places are shown. */
  offline: boolean;
}

const WAIT_MS = 350;

/**
 * Matches for what is typed: the trip's saved places at once, then OpenStreetMap places a moment after typing stops.
 * `around` is where to look first (the trip, or the phone when it is at the trip).
 */
export function usePlaceSearch(text: string, o: { destinationIds: string[]; around: LatLng | null; enabled: boolean }): PlaceSearchState {
  const q = normalizeQuery(text);
  const ids = o.destinationIds.join(',');
  const lat = o.around?.lat;
  const lng = o.around?.lng;
  const saved = useMemo(() => (q.length >= 2 ? searchSaved(q, ids.split(',').filter(Boolean)) : []), [q, ids]);
  const [done, setDone] = useState<{ q: string; hits: PlaceHit[]; offline: boolean } | null>(null);
  const active = o.enabled && q.length >= 2;

  useEffect(() => {
    if (!active) return;
    const stop = new AbortController();
    const timer = setTimeout(() => {
      searchOnline(q, lat === undefined || lng === undefined ? null : { lat, lng }, { signal: stop.signal }).then(
        (hits) => !stop.signal.aborted && setDone({ q, hits, offline: false }),
        () => !stop.signal.aborted && setDone({ q, hits: [], offline: true }),
      );
    }, WAIT_MS);
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [active, q, lat, lng]);

  const answer = active && done?.q === q ? done : null;
  return {
    hits: active ? mergeHits(saved, answer?.hits ?? []) : [],
    loading: active && !answer,
    offline: !!answer?.offline,
  };
}
