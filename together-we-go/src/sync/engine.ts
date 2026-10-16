/**
 * The sync engine: keeps a shared trip identical on every phone that has joined it.
 *
 *   phone edits the store ──► diff ──► ops ──► registers + outbox ──► server
 *   server ──► ops from friends ──► registers ──► rebuilt trip ──► store
 *
 * It knows nothing about React or the network library: the app store, the server connection and the place the
 * state is saved are all passed in, which is what lets the tests run two phones against one server in memory.
 */
import type { Trip } from '@/store/types';

import { applyOps, diffTrip, materializeTrip, type Op, type Registers } from './crdt';
import { HybridClock, newNodeId, type ClockState } from './hlc';
import { NetworkError, ServerError, type SyncTransport } from './transport';
import { toViewTrip } from './view';

/** What we remember about one shared trip. */
export interface TripSync {
  /** The trip's id on the server (long and random, so it works like a password). */
  remoteId: string;
  /** Everything we know about every shared field, with the stamp of its last change. */
  regs: Registers;
  /** How many of the server's changes we have already read. */
  cursor: number;
  /** Our own changes the server has not confirmed yet, in batches. */
  outbox: Op[][];
}

export interface SyncMeta {
  nodeId: string;
  clock?: ClockState;
  trips: Record<string, TripSync>;
}

/** How the engine reads and writes the app's trips. The real one wraps the zustand store. */
export interface StoreAdapter {
  getTrip(tripId: string): Trip | undefined;
  getUserId(): string | undefined;
  /** Replaces a trip that is already in the store. */
  setTrip(trip: Trip): void;
  /** Puts a trip that came from a friend into the store (replacing one with the same id) and makes it the active trip. */
  addTrip(trip: Trip): void;
  /** Calls the listener after any change to the trips. Returns a function that stops listening. */
  subscribe(listener: () => void): () => void;
}

export interface MetaStorage {
  load(): Promise<SyncMeta | null>;
  save(meta: SyncMeta): Promise<void>;
}

/** What the screens show about syncing. */
export interface SyncStatus {
  /** null until the first try, then whether the last conversation with the server worked. */
  online: boolean | null;
  /** Changes made here that the server has not confirmed. */
  pending: number;
  /** Phones talking to the server about our shared trips (including this one). */
  peers: number;
  lastSyncAt: number | null;
  error: string | null;
  /** Ids (in the app) of the trips being shared. */
  shared: string[];
}

export interface EngineOptions {
  store: StoreAdapter;
  storage: MetaStorage;
  /** The connection to the server, or null while no server address is set. Asked again every time it is needed. */
  getTransport: () => SyncTransport | null;
  /** Called after changes from friends were put into the store. */
  onRemoteChange?: (previous: Trip | undefined, next: Trip) => void;
  onStatus?: (status: SyncStatus) => void;
  now?: () => number;
  random?: () => number;
  /** How long to hold a request open waiting for news (ms). Tests use 0. */
  pollWaitMs?: number;
}

export class CodeTakenError extends Error {
  constructor(readonly code: string) {
    super(`The invite code ${code} is already used by another shared trip.`);
  }
}

interface Attached {
  sync: TripSync;
  /** The trip as it was when we last compared, so the next comparison finds only what changed since. */
  shadow: Trip | undefined;
  pushing: boolean;
  peers: number;
  retry: ReturnType<typeof setTimeout> | null;
  abort: AbortController | null;
  running: boolean;
  /** Ends a backoff wait early (used when stopping). */
  wake: (() => void) | null;
}

const BATCH = 400;
const chunk = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

export class SyncEngine {
  private meta: SyncMeta = { nodeId: '', trips: {} };
  private clock!: HybridClock;
  private attached = new Map<string, Attached>();
  private unsubscribe: (() => void) | null = null;
  private applying = false;
  private running = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private status: SyncStatus = { online: null, pending: 0, peers: 0, lastSyncAt: null, error: null, shared: [] };

  constructor(private readonly o: EngineOptions) {}

  // ------------------------------------------------------------------ setup

  /** Loads what was saved, starts watching the store, and sends any change that was made while the app was closed. */
  async init(): Promise<void> {
    const saved = await this.o.storage.load();
    this.meta = saved ?? { nodeId: newNodeId(this.o.random), trips: {} };
    if (!this.meta.nodeId) this.meta.nodeId = newNodeId(this.o.random);
    this.clock = new HybridClock(this.meta.nodeId, this.o.now);
    this.clock.restore(this.meta.clock);
    for (const [tripId, sync] of Object.entries(this.meta.trips)) {
      this.attach(tripId, sync, materializeTrip(sync.regs) ? toViewTrip(materializeTrip(sync.regs)!, undefined) : undefined);
    }
    this.unsubscribe?.();
    this.unsubscribe = this.o.store.subscribe(() => this.onStoreChange());
    this.onStoreChange(); // catches changes made while the app was closed (they differ from the saved registers)
    this.publishStatus();
  }

  get nodeId(): string {
    return this.meta.nodeId;
  }

  isShared(tripId: string): boolean {
    return this.attached.has(tripId);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  /** Starts talking to the server: sending changes and listening for friends' changes. */
  start(): void {
    this.running = true;
    for (const [tripId, a] of this.attached) {
      this.schedulePush(tripId, 0);
      this.startPullLoop(tripId, a);
    }
  }

  stop(): void {
    this.running = false;
    for (const a of this.attached.values()) {
      a.abort?.abort();
      a.wake?.();
      if (a.retry) clearTimeout(a.retry);
      a.retry = null;
      a.running = false;
    }
    if (this.saveTimer) void this.saveNow(); // do not lose recent changes when the app goes to the background
  }

  /** Stops everything and forgets all sync state (used by "reset app data"). */
  async reset(): Promise<void> {
    this.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.attached.clear();
    this.meta = { nodeId: newNodeId(this.o.random), trips: {} };
    await this.o.storage.save(this.meta);
    this.publishStatus();
  }

  // ------------------------------------------------------------------ sharing and joining

  /** Starts sharing a trip: describes the whole trip as changes and sends them. */
  async share(tripId: string): Promise<void> {
    if (this.attached.has(tripId)) return;
    const trip = this.o.store.getTrip(tripId);
    if (!trip) throw new Error('That trip no longer exists.');
    const transport = this.o.getTransport();
    if (!transport) throw new Error('Set the sync server address first.');
    const existing = await transport.lookup(trip.inviteCode);
    if (existing) throw new CodeTakenError(trip.inviteCode);
    const sync: TripSync = { remoteId: `r${newNodeId(this.o.random)}${newNodeId(this.o.random)}${newNodeId(this.o.random)}`, regs: {}, cursor: 0, outbox: [] };
    const ops = diffTrip(undefined, trip, () => this.clock.next());
    applyOps(sync.regs, ops);
    sync.outbox = chunk(ops, BATCH);
    this.meta.trips[tripId] = sync;
    this.attach(tripId, sync, trip);
    this.scheduleSave();
    this.publishStatus();
    if (this.running) {
      this.schedulePush(tripId, 0);
      this.startPullLoop(tripId, this.attached.get(tripId)!);
    }
  }

  /**
   * Joins a friend's shared trip using its invite code. Downloads the trip and puts it in the store.
   * Returns null when no trip has that code. Throws NetworkError when the server cannot be reached.
   */
  async join(code: string): Promise<Trip | null> {
    const transport = this.o.getTransport();
    if (!transport) throw new Error('Set the sync server address first.');
    const remoteId = await transport.lookup(code);
    if (!remoteId) return null;
    const already = [...this.attached.entries()].find(([, a]) => a.sync.remoteId === remoteId);
    if (already) return this.o.store.getTrip(already[0]) ?? null;
    const sync: TripSync = { remoteId, regs: {}, cursor: 0, outbox: [] };
    for (;;) {
      const page = await transport.pull(remoteId, sync.cursor, this.meta.nodeId, 0);
      page.ops.forEach((op) => this.clock.observe(op.t));
      applyOps(sync.regs, page.ops);
      sync.cursor = page.seq;
      if (sync.cursor >= page.total) break;
    }
    const shared = materializeTrip(sync.regs);
    if (!shared) throw new Error('That trip is not ready yet. Ask your friend to open the app and try again.');
    const trip = toViewTrip(shared, undefined);
    this.meta.trips[trip.id] = sync;
    this.attach(trip.id, sync, trip);
    this.applying = true;
    try {
      this.o.store.addTrip(trip);
    } finally {
      this.applying = false;
    }
    this.scheduleSave();
    this.publishStatus();
    if (this.running) {
      this.startPullLoop(trip.id, this.attached.get(trip.id)!);
    }
    return trip;
  }

  /** Stops syncing a trip on this phone. The trip stays here as a normal local trip. */
  detach(tripId: string): void {
    const a = this.attached.get(tripId);
    if (!a) return;
    a.abort?.abort();
    a.wake?.();
    if (a.retry) clearTimeout(a.retry);
    a.running = false;
    this.attached.delete(tripId);
    delete this.meta.trips[tripId];
    this.scheduleSave();
    this.publishStatus();
  }

  // ------------------------------------------------------------------ local changes

  private attach(tripId: string, sync: TripSync, shadow: Trip | undefined): void {
    this.attached.set(tripId, { sync, shadow, pushing: false, peers: 0, retry: null, abort: null, running: false, wake: null });
  }

  private onStoreChange(): void {
    if (this.applying) {
      // our own write of friends' changes: remember it as the new baseline instead of sending it back
      for (const [tripId, a] of this.attached) a.shadow = this.o.store.getTrip(tripId) ?? a.shadow;
      return;
    }
    let queued = false;
    for (const [tripId, a] of [...this.attached]) {
      const current = this.o.store.getTrip(tripId);
      if (!current) {
        this.detach(tripId); // the trip was deleted on this phone: stop syncing it, friends keep theirs
        continue;
      }
      if (current === a.shadow) continue;
      const ops = diffTrip(a.shadow, current, () => this.clock.next());
      a.shadow = current;
      if (!ops.length) continue;
      applyOps(a.sync.regs, ops);
      a.sync.outbox.push(...chunk(ops, BATCH));
      queued = true;
      this.schedulePush(tripId, 30);
    }
    if (queued) {
      this.scheduleSave();
      this.publishStatus();
    }
  }

  private schedulePush(tripId: string, delayMs: number): void {
    const a = this.attached.get(tripId);
    if (!a || !this.running || a.retry) return;
    a.retry = setTimeout(() => {
      a.retry = null;
      void this.push(tripId);
    }, delayMs);
  }

  /** Sends our unconfirmed changes. Safe to call at any time; only one send per trip runs at once. */
  async push(tripId: string): Promise<void> {
    const a = this.attached.get(tripId);
    const transport = this.o.getTransport();
    if (!a || a.pushing || !a.sync.outbox.length || !transport) return;
    a.pushing = true;
    try {
      while (a.sync.outbox.length) {
        const code = this.o.store.getTrip(tripId)?.inviteCode;
        await transport.push(a.sync.remoteId, code, this.meta.nodeId, a.sync.outbox[0]);
        a.sync.outbox.shift();
        this.scheduleSave();
      }
      this.setOnline(true, null);
    } catch (e) {
      this.setOnline(false, describe(e));
      if (this.running && !(e instanceof ServerError && e.status === 400)) this.schedulePush(tripId, 3000);
    } finally {
      a.pushing = false;
      this.publishStatus();
    }
  }

  // ------------------------------------------------------------------ changes from friends

  /** Asks the server for new changes once and applies them. `waitMs` > 0 holds the request open for news. */
  async pull(tripId: string, waitMs = 0, signal?: AbortSignal): Promise<number> {
    const a = this.attached.get(tripId);
    const transport = this.o.getTransport();
    if (!a || !transport) return 0;
    const page = await transport.pull(a.sync.remoteId, a.sync.cursor, this.meta.nodeId, waitMs, signal);
    if (!this.attached.has(tripId)) return 0;
    a.peers = page.peers;
    a.sync.cursor = page.seq;
    this.applyRemote(tripId, page.ops);
    this.scheduleSave();
    this.setOnline(true, null);
    this.publishStatus();
    return page.ops.length;
  }

  private applyRemote(tripId: string, ops: Op[]): void {
    const a = this.attached.get(tripId);
    if (!a || !ops.length) return;
    ops.forEach((op) => this.clock.observe(op.t));
    if (!applyOps(a.sync.regs, ops)) return; // nothing new (for example our own changes coming back)
    const shared = materializeTrip(a.sync.regs);
    if (!shared) return;
    const current = this.o.store.getTrip(tripId);
    const view = toViewTrip(shared, current);
    if (view === current) return;
    this.applying = true;
    try {
      this.o.store.setTrip(view);
    } finally {
      this.applying = false;
    }
    a.shadow = view;
    this.o.onRemoteChange?.(current, view);
  }

  private startPullLoop(tripId: string, a: Attached): void {
    if (a.running) return;
    a.running = true;
    void (async () => {
      let delay = 0;
      while (this.running && a.running && this.attached.get(tripId) === a) {
        a.abort = new AbortController();
        try {
          await this.pull(tripId, this.o.pollWaitMs ?? 20000, a.abort.signal);
          delay = 0;
        } catch (e) {
          if (!this.running || !a.running || a.abort.signal.aborted) break;
          this.setOnline(false, describe(e));
          this.publishStatus();
          delay = Math.min(delay ? delay * 2 : 1000, 15000);
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delay);
            a.wake = () => {
              clearTimeout(timer);
              resolve();
            };
          });
          a.wake = null;
        }
      }
      a.running = false;
    })();
  }

  /** Sends and fetches once for every shared trip. Used by "Sync now" and by the tests. */
  async syncNow(): Promise<void> {
    for (const tripId of [...this.attached.keys()]) {
      await this.push(tripId);
      try {
        await this.pull(tripId, 0);
      } catch (e) {
        this.setOnline(false, describe(e));
        this.publishStatus();
      }
    }
  }

  // ------------------------------------------------------------------ saving and status

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.saveNow();
    }, 800); // saving writes everything, so batch bursts of changes (the app also saves when it goes to the background)
  }

  async saveNow(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.meta.clock = this.clock.snapshot();
    await this.o.storage.save(this.meta);
  }

  private setOnline(online: boolean, error: string | null): void {
    this.status = { ...this.status, online, error, lastSyncAt: online ? (this.o.now ?? Date.now)() : this.status.lastSyncAt };
  }

  private publishStatus(): void {
    const all = [...this.attached.values()];
    this.status = {
      ...this.status,
      pending: all.reduce((n, a) => n + a.sync.outbox.reduce((m, b) => m + b.length, 0), 0),
      peers: all.reduce((n, a) => Math.max(n, a.peers), 0),
      shared: [...this.attached.keys()],
    };
    this.o.onStatus?.(this.status);
  }
}

function describe(e: unknown): string {
  if (e instanceof NetworkError) return 'Can’t reach the sync server';
  if (e instanceof ServerError) return e.message;
  return e instanceof Error ? e.message : 'Sync problem';
}
