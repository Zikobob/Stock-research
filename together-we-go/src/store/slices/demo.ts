/**
 * Demo content: the sample trips and the "Demo timeline" switch (upcoming / in progress / finished).
 */
import * as Crypto from 'expo-crypto';

import { uid } from '@/utils/format';
import { hashPassword } from '@/utils/password';

import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER_ID, buildDemoTrip, buildSecondaryTrips, type DemoTimeline } from '../seed';
import type { Account, AppNotification, BucketItem } from '../types';
import type { Slice } from './types';

function seedBucket(): BucketItem[] {
  const now = Date.now();
  return [
    { id: uid('b-'), text: 'See the northern lights in Iceland', destinationId: 'iceland', done: false, addedAt: now - 9e7 },
    { id: uid('b-'), text: 'Sunrise at Machu Picchu', destinationId: 'machu-picchu', done: false, addedAt: now - 8e7 },
    { id: uid('b-'), text: 'Eat street tacos in Mexico City', destinationId: 'mexico-city', done: false, addedAt: now - 7e7 },
    { id: uid('b-'), text: 'Watch the sunset in Oia, Santorini', destinationId: 'santorini', done: false, addedAt: now - 6e7 },
    { id: uid('b-'), text: 'Tapas crawl in Barcelona', destinationId: 'barcelona', done: true, addedAt: now - 5e7 },
  ];
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
  };
};
