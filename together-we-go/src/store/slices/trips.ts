/**
 * The list of trips: create, join with an invite code, leave, delete, edit, and who is in each trip.
 */
import { destinationById } from '@/data/destinations';
import { uid } from '@/utils/format';
import type { Role } from '@/data/reference';

import { directoryTrips, inviteCodeFor } from '../seed';
import type { Trip } from '../types';
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export interface TripsSlice {
  trips: Trip[];
  activeTripId: string | null;
  setActiveTrip: (id: string) => void;
  createTrip: (t: { name: string; destinationId: string; startDate: string; endDate: string; budget: number }) => string;
  joinTrip: (code: string) => { ok: true; tripId: string } | { ok: false; error: string };
  leaveTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => void;
  updateTrip: (tripId: string, patch: Partial<Pick<Trip, 'name' | 'startDate' | 'endDate' | 'budget' | 'completed' | 'cover' | 'destinationId' | 'extraDestinationIds'>>) => void;
  regenerateInvite: (tripId: string) => void;
  addMember: (tripId: string, name: string, email?: string) => void;
  removeMember: (tripId: string, memberId: string) => void;
  setRole: (tripId: string, memberId: string, role: Role) => void;
}

/** Starting values, also used by "reset everything". */
export const initialTrips = {
  trips: [],
  activeTripId: null,
};

export const createTripsSlice: Slice<TripsSlice> = (set, get) => {
  const { withTrip, me } = tripHelpers(set, get);
  return {
    ...initialTrips,
    setActiveTrip: (id) => set({ activeTripId: id }),

    createTrip: ({ name, destinationId, startDate, endDate, budget }) => {
      const id = uid('trip-');
      const acct = get().accounts.find((a) => a.id === me());
      const dest = destinationById(destinationId);
      set((s) => {
        s.trips.unshift({
          id, name: name.trim(), destinationId, extraDestinationIds: [], startDate, endDate,
          cover: dest?.image ?? 'planning', budget, inviteCode: inviteCodeFor(dest?.city ?? name), ownerId: me(),
          members: [{ id: me(), name: acct?.name ?? 'You', email: acct?.email, avatar: acct?.avatar, role: 'Organizer', homeCity: acct?.homeCity }],
          activities: [], expenses: [], flights: [], polls: [], tasks: [
            { id: uid('t-'), text: 'Invite your travel group', done: false, assignee: me() },
            { id: uid('t-'), text: 'Agree on a budget', done: false },
            { id: uid('t-'), text: 'Add everyone’s flights', done: false },
          ], docs: [], photos: [], packing: [],
          messages: [{ id: uid('c-'), authorId: 'assistant', ai: true, aiSource: 'local', ts: Date.now(), text: `Welcome to ${name.trim()}! Share invite code to bring your group in, then ask me anything — budget, weather, food nearby or what to do next.` }],
          createdAt: Date.now(),
        });
        s.activeTripId = id;
      });
      return id;
    },

    joinTrip: (code) => {
      const c = code.trim().toUpperCase();
      const user = me();
      const acct = get().accounts.find((a) => a.id === user);
      const local = get().trips.find((t) => t.inviteCode === c);
      if (local) {
        if (local.members.some((m) => m.id === user)) {
          set({ activeTripId: local.id });
          return { ok: false, error: `You’re already in “${local.name}”.` };
        }
        set((s) => {
          const t = s.trips.find((x) => x.id === local.id)!;
          t.members.push({ id: user, name: acct?.name ?? 'New member', email: acct?.email, avatar: acct?.avatar, role: 'Member', homeCity: acct?.homeCity });
          t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${acct?.name ?? 'Someone'} joined the trip`, ts: Date.now() });
          s.activeTripId = t.id;
        });
        return { ok: true, tripId: local.id };
      }
      const remote = directoryTrips().find((t) => t.inviteCode === c);
      if (!remote) return { ok: false, error: 'No trip found with that code. Check with your friend and try again.' };
      set((s) => {
        remote.members.push({ id: user, name: acct?.name ?? 'New member', email: acct?.email, avatar: acct?.avatar, role: 'Member', homeCity: acct?.homeCity });
        remote.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${acct?.name ?? 'Someone'} joined the trip`, ts: Date.now() });
        s.trips.unshift(remote);
        s.activeTripId = remote.id;
      });
      return { ok: true, tripId: remote.id };
    },

    leaveTrip: (tripId) =>
      set((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t) return;
        t.members = t.members.filter((m) => m.id !== s.session?.userId);
        if (s.activeTripId === tripId) {
          s.activeTripId = s.trips.find((x) => x.id !== tripId && x.members.some((m) => m.id === s.session?.userId))?.id ?? null;
        }
      }),

    deleteTrip: (tripId) =>
      set((s) => {
        s.trips = s.trips.filter((t) => t.id !== tripId);
        if (s.activeTripId === tripId) {
          s.activeTripId = s.trips.find((x) => x.members.some((m) => m.id === s.session?.userId))?.id ?? null;
        }
      }),

    updateTrip: (tripId, patch) => withTrip(tripId, (t) => Object.assign(t, patch)),

    regenerateInvite: (tripId) =>
      withTrip(tripId, (t) => {
        t.inviteCode = inviteCodeFor(destinationById(t.destinationId)?.city ?? t.name);
      }),

    addMember: (tripId, name, email) =>
      withTrip(tripId, (t) => {
        t.members.push({ id: uid('m-'), name: name.trim(), email: email?.trim() || undefined, role: 'Member', invited: true });
        t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${name.trim()} was added to the trip`, ts: Date.now() });
      }),

    removeMember: (tripId, memberId) =>
      withTrip(tripId, (t) => {
        t.members = t.members.filter((m) => m.id !== memberId);
        t.activities.forEach((a) => {
          a.assigned = a.assigned.filter((x) => x !== memberId);
          delete a.votes[memberId];
        });
        t.tasks.forEach((k) => {
          if (k.assignee === memberId) k.assignee = undefined;
        });
      }),

    setRole: (tripId, memberId, role) =>
      withTrip(tripId, (t) => {
        const m = t.members.find((x) => x.id === memberId);
        if (m) m.role = role;
      }),
  };
};
