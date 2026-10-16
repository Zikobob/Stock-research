import { produce } from 'immer';

import type { Trip } from '@/store/types';

import { applyOps, diffTrip, materializeTrip, type Op, type Registers } from './crdt';
import { HybridClock } from './hlc';
import type { MetaStorage, StoreAdapter, SyncMeta } from './engine';
import { NetworkError, type SyncTransport } from './transport';
import { toViewTrip } from './view';

/** A tiny trip with a few of everything, for tests. */
export function makeTrip(): Trip {
  return {
    id: 'trip-1',
    name: 'Rome Crew',
    destinationId: 'rome',
    extraDestinationIds: [],
    startDate: '2026-09-10',
    endDate: '2026-09-16',
    cover: 'rome',
    budget: 3000,
    inviteCode: 'ROM-1234',
    ownerId: 'u-a',
    members: [
      { id: 'u-a', name: 'Ana', email: 'ana@example.com', role: 'Organizer' },
      { id: 'u-b', name: 'Ben', role: 'Member' },
    ],
    activities: [
      { id: 'a1', date: '2026-09-11', time: '10:00', title: 'Colosseum', location: 'Rome', type: 'sightseeing', durationMin: 120, costPerPerson: 20, status: 'voting', assigned: ['u-a'], votes: { 'u-a': 1 }, reminder: false, createdBy: 'u-a' },
    ],
    expenses: [{ id: 'e1', title: 'Hotel', amount: 300, category: 'Stays', paidBy: 'u-a', splitBetween: ['u-a', 'u-b'], date: '2026-09-10', receipt: 'file:///receipt.jpg' }],
    flights: [],
    polls: [{ id: 'p1', question: 'Beach?', createdBy: 'u-a', createdAt: 1, options: [{ id: 'o1', text: 'Ostia', votes: [] }, { id: 'o2', text: 'Sperlonga', votes: ['u-b'] }] }],
    tasks: [{ id: 't1', text: 'Book tickets', done: false }],
    docs: [],
    messages: [
      { id: 'm1', authorId: 'u-a', text: 'Hi all', ts: 1000 },
      { id: 'ai1', authorId: 'assistant', text: 'private answer', ts: 1001, ai: true, channel: 'ai' },
    ],
    photos: [{ id: 'ph1', uri: 'file:///photo.jpg', caption: 'Pasta', by: 'u-a', likes: ['u-b'], ts: 5 }],
    packing: [],
    createdAt: 1,
  };
}

/** A fake clock shared by every phone in a test: each reading is one millisecond later. */
export function fakeNow(start = 1_800_000_000_000) {
  let t = start;
  return () => (t += 1);
}

/** One simulated phone: its own copy of the trip, its registers and its clock. */
export class Replica {
  regs: Registers = {};
  trip: Trip | undefined;
  clock: HybridClock;

  constructor(node: string, now: () => number, trip?: Trip) {
    this.clock = new HybridClock(node, now);
    this.trip = trip;
  }

  /** Makes a change the way a store action would, and returns the ops to send to the others. */
  edit(fn: (draft: Trip) => void): Op[] {
    const next = produce(this.trip!, fn);
    const ops = diffTrip(this.trip, next, () => this.clock.next());
    applyOps(this.regs, ops);
    this.trip = next;
    return ops;
  }

  /** Shares a trip for the first time: describes the whole trip as ops. */
  publish(): Op[] {
    const ops = diffTrip(undefined, this.trip!, () => this.clock.next());
    applyOps(this.regs, ops);
    return ops;
  }

  /** Receives ops from another phone. */
  receive(ops: readonly Op[]): void {
    ops.forEach((o) => this.clock.observe(o.t));
    if (applyOps(this.regs, ops)) {
      const shared = materializeTrip(this.regs);
      if (shared) this.trip = toViewTrip(shared, this.trip);
    }
  }
}

/** The trip without anything that stays on one phone, for comparing phones with each other. */
export function sharedPart(trip: Trip | undefined): unknown {
  if (!trip) return undefined;
  const t = JSON.parse(JSON.stringify(trip)) as Trip;
  t.messages = t.messages.filter((m) => m.channel !== 'ai');
  t.members.forEach((m) => delete m.email);
  t.photos.forEach((p) => delete (p as Partial<typeof p>).uri);
  t.docs.forEach((d) => delete d.uri);
  t.expenses.forEach((e) => delete e.receipt);
  t.flights.forEach((f) => {
    delete f.ticketUri;
    delete f.ticketName;
  });
  return t;
}

/** Small deterministic random numbers so a failing run can be repeated. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T,>(a: readonly T[]): T => a[Math.floor(next() * a.length)],
    shuffle: <T,>(a: readonly T[]): T[] => {
      const r = [...a];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    },
  };
}

// ------------------------------------------------------------------ engine test doubles

/** An app store with just the trips: enough for the engine, and it notifies listeners like zustand does. */
export class FakeStore implements StoreAdapter {
  trips: Trip[] = [];
  userId: string | undefined = 'u-a';
  private listeners = new Set<() => void>();

  getTrip = (id: string) => this.trips.find((t) => t.id === id);
  getUserId = () => this.userId;
  setTrip = (trip: Trip) => {
    this.trips = this.trips.map((t) => (t.id === trip.id ? trip : t));
    this.emit();
  };
  addTrip = (trip: Trip) => {
    this.trips = [trip, ...this.trips.filter((t) => t.id !== trip.id)];
    this.emit();
  };
  removeTrip = (id: string) => {
    this.trips = this.trips.filter((t) => t.id !== id);
    this.emit();
  };
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  };
  private emit() {
    [...this.listeners].forEach((l) => l());
  }

  /** Changes a trip the way a store action would. */
  edit(tripId: string, fn: (d: Trip) => void) {
    this.trips = this.trips.map((t) => (t.id === tripId ? produce(t, fn) : t));
    this.emit();
  }
}

export class MemoryStorage implements MetaStorage {
  saved: string | null = null;
  async load(): Promise<SyncMeta | null> {
    return this.saved ? (JSON.parse(this.saved) as SyncMeta) : null;
  }
  async save(meta: SyncMeta): Promise<void> {
    this.saved = JSON.stringify(meta);
  }
}

/** Connects an engine straight to a server store in memory, and can be switched "offline". */
export function memoryTransport(server: {
  append: (...args: any[]) => { seq: number };
  since: (...args: any[]) => { ops: unknown[]; seq: number; total: number; peers: number };
  lookup: (code: string) => string | null;
}): SyncTransport & { offline: boolean; calls: { push: number; pull: number } } {
  const t = {
    offline: false,
    calls: { push: 0, pull: 0 },
    async lookup(code: string) {
      if (t.offline) throw new NetworkError('offline');
      return server.lookup(code);
    },
    async push(tripId: string, code: string | undefined, client: string, ops: Op[]) {
      if (t.offline) throw new NetworkError('offline');
      t.calls.push++;
      return server.append(tripId, code, client, JSON.parse(JSON.stringify(ops)));
    },
    async pull(tripId: string, since: number, client: string) {
      if (t.offline) throw new NetworkError('offline');
      t.calls.pull++;
      return server.since(tripId, since, client) as Awaited<ReturnType<SyncTransport['pull']>>;
    },
  };
  return t;
}
