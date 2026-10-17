/**
 * Demo content: the sample trips and the "Demo timeline" switch (upcoming / in progress / finished).
 */
import * as Crypto from 'expo-crypto';

import { uid } from '@/utils/format';
import { hashPassword } from '@/utils/password';

import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_TRIP_IDS, DEMO_USER_ID, buildDemoTrip, buildSecondaryTrips, type DemoTimeline } from '../seed';
import type { Account, AppNotification, BucketItem } from '../types';
import type { Slice } from './types';

/** The sample bucket-list items: text, destination, done. */
const BUCKET_SEED: [string, string, boolean][] = [
  ['See the northern lights in Iceland', 'iceland', false],
  ['Sunrise at Machu Picchu', 'machu-picchu', false],
  ['Eat street tacos in Mexico City', 'mexico-city', false],
  ['Watch the sunset in Oia, Santorini', 'santorini', false],
  ['Tapas crawl in Barcelona', 'barcelona', true],
];

function seedBucket(): BucketItem[] {
  const now = Date.now();
  return BUCKET_SEED.map(([text, destinationId, done], i) => ({ id: uid('b-'), text, destinationId, done, addedAt: now - (9 - i) * 1e7 }));
}

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    { id: uid('n-'), kind: 'vote', title: 'New poll from Sam', body: 'Beach day — which beach? Cast your vote.', ts: now - 600 * 60000, read: false, tripId: 'trip-amalfi', route: '/crew' },
    { id: uid('n-'), kind: 'expense', title: 'Diego added an expense', body: 'Dinner deposits & groceries · $86 split 4 ways', ts: now - 420 * 60000, read: false, tripId: 'trip-amalfi', route: '/(tabs)/budget' },
    { id: uid('n-'), kind: 'chat', title: 'Diego in Amalfi Squad', body: 'Dinner tonight at 7, I reserved for 4 🍝', ts: now - 42 * 60000, read: false, tripId: 'trip-amalfi', route: '/(tabs)/chat' },
  ];
}

export interface DemoSlice {
  demoTimeline: DemoTimeline;
  seeded: boolean;
  ensureSeed: () => Promise<void>;
  reseedDemo: (timeline: DemoTimeline) => void;
  /** Removes the sample trips, their notifications and the sample bucket list; accounts and your own trips stay. */
  clearDemoData: () => void;
}

/** Starting values, also used by "reset everything". */
export const initialDemo = {
  demoTimeline: 'upcoming' as DemoTimeline,
  seeded: false,
};

export const createDemoSlice: Slice<DemoSlice> = (set, get) => {
  return {
    ...initialDemo,
    ensureSeed: async () => {
      if (get().seeded) return;
      const salt = Crypto.randomUUID();
      const passwordHash = await hashPassword(DEMO_PASSWORD, salt);
      const demo: Account = { id: DEMO_USER_ID, name: 'Maya Chen', email: DEMO_EMAIL, passwordHash, salt, avatar: 'avatar-maya', homeCity: 'New York', provider: 'password' };
      set((s) => {
        if (s.seeded) return;
        s.accounts = [demo, ...s.accounts.filter((a) => a.email !== DEMO_EMAIL)];
        s.trips = [buildDemoTrip('upcoming'), ...buildSecondaryTrips(), ...s.trips];
        s.activeTripId = 'trip-amalfi';
        s.bucket = seedBucket();
        s.notifications = seedNotifications();
        s.seeded = true;
      });
    },

    reseedDemo: (timeline) =>
      set((s) => {
        const fresh = buildDemoTrip(timeline);
        s.trips = [fresh, ...s.trips.filter((t) => t.id !== fresh.id)];
        s.activeTripId = fresh.id;
        s.demoTimeline = timeline;
        s.firedReminders = {};
      }),

    clearDemoData: () =>
      set((s) => {
        s.trips = s.trips.filter((t) => !DEMO_TRIP_IDS.includes(t.id));
        s.activeTripId = s.trips.find((t) => t.members.some((m) => m.id === s.session?.userId))?.id ?? null;
        s.notifications = s.notifications.filter((n) => !n.tripId || !DEMO_TRIP_IDS.includes(n.tripId));
        const sample = new Set(BUCKET_SEED.map(([text]) => text));
        s.bucket = s.bucket.filter((b) => !sample.has(b.text));
        s.firedReminders = {};
      }),
  };
};
