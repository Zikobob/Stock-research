import { DEMO_USER_ID } from '../seed';
import type { Trip } from '../types';
import type { AppStore, SliceGet, SliceSet } from './types';

/** Shortcuts for every slice that edits a trip. */
export function tripHelpers(set: SliceSet, get: SliceGet) {
  /** Runs `fn` on the trip with this id. The trip is an immer draft, so it can be changed in place. */
  const withTrip = (tripId: string, fn: (t: Trip, s: AppStore) => void) =>
    set((s) => {
      const t = s.trips.find((x) => x.id === tripId);
      if (t) fn(t, s);
    });
  /** The signed-in user's id (the demo user when nobody is signed in, so the demo screens always work). */
  const me = () => get().session?.userId ?? DEMO_USER_ID;
  return { withTrip, me };
}
