/** Selectors and derived data (the "view-model" helpers screens use to read the store). */
import { destinationById } from '@/data/destinations';
import { daysBetween, todayInTz } from '@/utils/time';

import { useAppStore } from './store';
import type { Account, Member, Trip, TripStatus } from './types';

export function useCurrentUser(): Account | undefined {
  return useAppStore((s) => s.accounts.find((a) => a.id === s.session?.userId));
}

export function useActiveTrip(): Trip | undefined {
  return useAppStore((s) => {
    const uidNow = s.session?.userId;
    const t = s.trips.find((x) => x.id === s.activeTripId);
    if (t && (!uidNow || t.members.some((m) => m.id === uidNow))) return t;
    return undefined;
  });
}

export function useMyTrips(): Trip[] {
  const userId = useAppStore((s) => s.session?.userId);
  const trips = useAppStore((s) => s.trips);
  return trips.filter((t) => t.members.some((m) => m.id === userId));
}

export function tripStatus(t: Trip): TripStatus {
  if (t.completed) return 'completed';
  const dest = destinationById(t.destinationId);
  const today = todayInTz(dest?.tz ?? 'UTC');
  if (daysBetween(today, t.startDate) > 0) return 'planning';
  if (daysBetween(t.endDate, today) > 0) return 'completed';
  return 'active';
}

export function memberById(t: Trip | undefined, id: string): Member | undefined {
  return t?.members.find((m) => m.id === id);
}
