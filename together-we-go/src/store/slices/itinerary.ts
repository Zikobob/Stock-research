/**
 * The day-by-day plan: activities (with voting) and flights.
 */
import { uid } from '@/utils/format';

import type { Activity, Flight } from '../types';
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export interface ItinerarySlice {
  addActivity: (tripId: string, a: Omit<Activity, 'id' | 'createdBy' | 'votes'> & { votes?: Activity['votes'] }) => string;
  updateActivity: (tripId: string, id: string, patch: Partial<Activity>) => void;
  deleteActivity: (tripId: string, id: string) => void;
  voteActivity: (tripId: string, id: string, value: 1 | -1) => void;
  toggleAssign: (tripId: string, id: string, memberId: string) => void;
  addFlight: (tripId: string, f: Omit<Flight, 'id'>) => void;
  deleteFlight: (tripId: string, id: string) => void;
}

export const createItinerarySlice: Slice<ItinerarySlice> = (set, get) => {
  const { withTrip, me } = tripHelpers(set, get);
  return {
    addActivity: (tripId, a) => {
      const id = uid('a-');
      withTrip(tripId, (t) => {
        t.activities.push({ ...a, votes: a.votes ?? { [me()]: 1 }, id, createdBy: me() });
      });
      return id;
    },

    updateActivity: (tripId, id, patch) =>
      withTrip(tripId, (t) => {
        const a = t.activities.find((x) => x.id === id);
        if (a) Object.assign(a, patch);
      }),

    deleteActivity: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.activities = t.activities.filter((x) => x.id !== id);
      }),

    voteActivity: (tripId, id, value) =>
      withTrip(tripId, (t) => {
        const a = t.activities.find((x) => x.id === id);
        if (!a) return;
        const user = me();
        if (a.votes[user] === value) delete a.votes[user];
        else a.votes[user] = value;
        // Majority rule: a voting item is confirmed once more than half the group upvotes it.
        const ups = Object.values(a.votes).filter((v) => v === 1).length;
        if (a.status === 'voting' && ups > t.members.length / 2) a.status = 'confirmed';
      }),

    toggleAssign: (tripId, id, memberId) =>
      withTrip(tripId, (t) => {
        const a = t.activities.find((x) => x.id === id);
        if (!a) return;
        a.assigned = a.assigned.includes(memberId) ? a.assigned.filter((x) => x !== memberId) : [...a.assigned, memberId];
      }),

    addFlight: (tripId, f) =>
      withTrip(tripId, (t) => {
        t.flights.push({ ...f, id: uid('f-') });
      }),

    deleteFlight: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.flights = t.flights.filter((x) => x.id !== id);
      }),
  };
};
