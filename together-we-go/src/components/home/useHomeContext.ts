import { destinationById, type Destination } from '@/data/destinations';
import { useNow } from '@/hooks/useTrip';
import type { Personal, Trip } from '@/store/types';
import { tripStatus, useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import { daysBetween, partsInTz } from '@/utils/time';

import type { HeroStatus } from './logic';

/** What every Home block needs to know about the trip and the moment, worked out once. */
export interface HomeCtx {
  userId: string;
  userName: string;
  personal: Personal;
  trip: Trip | undefined;
  dest: Destination | undefined;
  /** The destination's time zone (everything about "today" on a trip is told in the place's own time). */
  tz: string;
  status: HeroStatus;
  now: number;
  /** Today's date at the destination. */
  today: string;
  tripLen: number;
  /** Days until the trip starts (0 or less once it has begun). */
  daysToGo: number;
  /** Which day of the trip it is (1 until it starts, then 1..tripLen). */
  dayNo: number;
}

/** A context for a person who has a trip (the blocks that need a trip take this). */
export type TripCtx = HomeCtx & { trip: Trip };

export const hasTrip = (c: HomeCtx): c is TripCtx => !!c.trip;

export function useHomeContext(): HomeCtx {
  const user = useCurrentUser();
  const trip = useActiveTrip();
  const personal = useAppStore((s) => s.personal);
  const now = useNow(30000);
  const dest = destinationById(trip?.destinationId ?? 'positano');
  const tz = dest?.tz ?? 'UTC';
  const today = partsInTz(now, tz).ymd;
  const tripLen = trip ? daysBetween(trip.startDate, trip.endDate) + 1 : 0;
  return {
    userId: user?.id ?? '',
    userName: user?.name ?? '',
    personal,
    trip,
    dest,
    tz,
    status: trip ? tripStatus(trip) : null,
    now,
    today,
    tripLen,
    daysToGo: trip ? Math.max(0, daysBetween(today, trip.startDate)) : 0,
    dayNo: trip ? Math.min(tripLen, Math.max(1, daysBetween(trip.startDate, today) + 1)) : 0,
  };
}
