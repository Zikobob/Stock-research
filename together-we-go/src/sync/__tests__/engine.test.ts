import type { Trip } from '@/store/types';

import { SyncStore } from '../../../server/store';
import { CodeTakenError, SyncEngine } from '../engine';
import { FakeStore, MemoryStorage, fakeNow, makeTrip, memoryTransport, seeded, sharedPart } from '../testing';

type Server = InstanceType<typeof SyncStore>;

function phone(server: Server, userId: string, seed = 1, now = fakeNow()) {
  const store = new FakeStore();
  store.userId = userId;
  const storage = new MemoryStorage();
  const transport = memoryTransport(server);
  const remote: { prev: Trip | undefined; next: Trip }[] = [];
  const engine = new SyncEngine({ store, storage, getTransport: () => transport, pollWaitMs: 0, now, random: seeded(seed).next, onRemoteChange: (prev, next) => remote.push({ prev, next }) });
  return { store, storage, transport, engine, remote, userId, now };
}

/** Everyone sends, then everyone fetches, twice, so changes travel all the way around. */
async function settle(...phones: ReturnType<typeof phone>[]) {
  for (let i = 0; i < 2; i++) for (const p of phones) await p.engine.syncNow();
}

async function sharedTrip() {
  const server = new SyncStore();
  const ana = phone(server, 'u-a', 1);
  const ben = phone(server, 'u-b', 2);
  ana.store.trips = [makeTrip()];
  await ana.engine.init();
  await ben.engine.init();
  await ana.engine.share('trip-1');
  await ana.engine.syncNow();
  const joined = await ben.engine.join('ROM-1234');
  return { server, ana, ben, joined };
}

describe('sharing and joining a trip', () => {
  it('a friend joins with the invite code and gets the same trip', async () => {
    const { ana, ben, joined } = await sharedTrip();
    expect(joined?.id).toBe('trip-1');
    expect(ben.store.trips).toHaveLength(1);
    expect(sharedPart(ben.store.getTrip('trip-1'))).toEqual(sharedPart(ana.store.getTrip('trip-1')));
    expect(ben.engine.isShared('trip-1')).toBe(true);
  });

  it('keeps each phone’s private parts private', async () => {
    const { ana, ben } = await sharedTrip();
    expect(ana.store.getTrip('trip-1')!.messages.map((m) => m.id)).toContain('ai1'); // Ana's Scout chat
    expect(ben.store.getTrip('trip-1')!.messages.map((m) => m.id)).not.toContain('ai1');
    expect(ben.store.getTrip('trip-1')!.members.find((m) => m.id === 'u-a')?.email).toBeUndefined();
    expect(ana.store.getTrip('trip-1')!.members.find((m) => m.id === 'u-a')?.email).toBe('ana@example.com');
  });

  it('an unknown code finds nothing', async () => {
    const { ben } = await sharedTrip();
    expect(await ben.engine.join('ZZZ-0000')).toBeNull();
  });

  it('refuses to share a second trip under a code another shared trip already uses', async () => {
    const { server } = await sharedTrip();
    const cara = phone(server, 'u-c', 3);
    cara.store.trips = [{ ...makeTrip(), id: 'trip-other' }];
    await cara.engine.init();
    await expect(cara.engine.share('trip-other')).rejects.toBeInstanceOf(CodeTakenError);
  });

  it('a big trip (700 chat messages) travels in pages', async () => {
    const server = new SyncStore();
    const ana = phone(server, 'u-a', 1);
    const ben = phone(server, 'u-b', 2);
    const trip = makeTrip();
    for (let i = 0; i < 700; i++) trip.messages.push({ id: `bulk${i}`, authorId: 'u-a', text: `message ${i}`, ts: 2000 + i });
    ana.store.trips = [trip];
    await ana.engine.init();
    await ben.engine.init();
    await ana.engine.share('trip-1');
    await ana.engine.syncNow();
    await ben.engine.join('ROM-1234');
    expect(ben.store.getTrip('trip-1')!.messages.filter((m) => m.id.startsWith('bulk'))).toHaveLength(700);
    expect(server.stats().ops).toBeGreaterThan(2500); // more than two pages of 1000 changes
  });
});

describe('working together', () => {
  it('chat, votes and expenses flow both ways', async () => {
    const { ana, ben } = await sharedTrip();
    ben.store.edit('trip-1', (d) => {
      d.messages.push({ id: 'm-ben', authorId: 'u-b', text: 'Hello from Ben', ts: 5000 });
      d.activities[0].votes['u-b'] = 1;
    });
    ana.store.edit('trip-1', (d) => {
      d.expenses.unshift({ id: 'e-ana', title: 'Pizza', amount: 40, category: 'Food', paidBy: 'u-a', splitBetween: ['u-a', 'u-b'], date: '2026-09-11' });
    });
    await settle(ana, ben);
    for (const p of [ana, ben]) {
      const t = p.store.getTrip('trip-1')!;
      expect(t.messages.map((m) => m.id)).toContain('m-ben');
      expect(t.activities[0].votes).toEqual({ 'u-a': 1, 'u-b': 1 });
      expect(t.expenses[0].id).toBe('e-ana');
    }
    expect(sharedPart(ana.store.getTrip('trip-1'))).toEqual(sharedPart(ben.store.getTrip('trip-1')));
  });

  it('a new member joining shows up for everyone', async () => {
    const { server, ana, ben } = await sharedTrip();
    const cara = phone(server, 'u-c', 3);
    await cara.engine.init();
    await cara.engine.join('ROM-1234');
    cara.store.edit('trip-1', (d) => void d.members.push({ id: 'u-c', name: 'Cara', role: 'Member' }));
    await settle(ana, ben, cara);
    for (const p of [ana, ben, cara]) expect(p.store.getTrip('trip-1')!.members.map((m) => m.id)).toEqual(['u-a', 'u-b', 'u-c']);
  });

  it('does not send friends’ changes back to the server', async () => {
    const { ana, ben, server } = await sharedTrip();
    ben.store.edit('trip-1', (d) => void d.tasks.push({ id: 't9', text: 'Buy water', done: false }));
    await settle(ana, ben);
    const total = server.stats().ops;
    await settle(ana, ben);
    await settle(ana, ben);
    expect(server.stats().ops).toBe(total);
  });

  it('tells the app when friends changed something', async () => {
    const { ana, ben } = await sharedTrip();
    ben.store.edit('trip-1', (d) => void d.messages.push({ id: 'm-ben', authorId: 'u-b', text: 'Ping', ts: 6000 }));
    await settle(ana, ben);
    expect(ana.remote.length).toBeGreaterThan(0);
    const last = ana.remote.at(-1)!;
    expect(last.prev!.messages.some((m) => m.id === 'm-ben')).toBe(false);
    expect(last.next.messages.some((m) => m.id === 'm-ben')).toBe(true);
  });

  it('concurrent edits to different things both survive', async () => {
    const { ana, ben } = await sharedTrip();
    ana.store.edit('trip-1', (d) => void (d.activities[0].title = 'Colosseum at sunrise'));
    ben.store.edit('trip-1', (d) => void (d.activities[0].time = '07:30'));
    await settle(ana, ben);
    for (const p of [ana, ben]) expect(p.store.getTrip('trip-1')!.activities[0]).toMatchObject({ title: 'Colosseum at sunrise', time: '07:30' });
  });

  it('keeps private Scout messages off the server', async () => {
    const { ana, ben } = await sharedTrip();
    ana.store.edit('trip-1', (d) => void d.messages.push({ id: 'ai-new', authorId: 'assistant', text: 'secret', ts: 7000, ai: true, channel: 'ai' }));
    await settle(ana, ben);
    expect(ben.store.getTrip('trip-1')!.messages.map((m) => m.id)).not.toContain('ai-new');
  });
});

describe('losing the connection and the app closing', () => {
  it('queues changes while offline and sends them when the connection returns', async () => {
    const { ana, ben } = await sharedTrip();
    ana.transport.offline = true;
    ana.store.edit('trip-1', (d) => void d.tasks.push({ id: 't-offline', text: 'Written offline', done: false }));
    await ana.engine.syncNow();
    expect(ana.engine.getStatus()).toMatchObject({ online: false, error: 'Can’t reach the sync server' });
    expect(ana.engine.getStatus().pending).toBeGreaterThan(0);
    await ben.engine.syncNow();
    expect(ben.store.getTrip('trip-1')!.tasks.map((t) => t.id)).not.toContain('t-offline');

    ana.transport.offline = false;
    await settle(ana, ben);
    expect(ana.engine.getStatus()).toMatchObject({ online: true, pending: 0, error: null });
    expect(ben.store.getTrip('trip-1')!.tasks.map((t) => t.id)).toContain('t-offline');
  });

  it('remembers where it was after the app restarts', async () => {
    const { server, ana, ben } = await sharedTrip();
    await ana.engine.saveNow();
    // "restart": a new engine with the same saved state and the same trips
    const again = phone(server, 'u-a', 9);
    again.store.trips = ana.store.trips;
    again.storage.saved = ana.storage.saved;
    await again.engine.init();
    expect(again.engine.isShared('trip-1')).toBe(true);
    expect(again.engine.nodeId).toBe(ana.engine.nodeId);
    const before = again.store.getTrip('trip-1');
    await again.engine.syncNow();
    expect(again.store.getTrip('trip-1')).toBe(before); // nothing new, nothing re-applied
    ben.store.edit('trip-1', (d) => void d.tasks.push({ id: 't-after', text: 'After restart', done: false }));
    await ben.engine.syncNow();
    await again.engine.syncNow();
    expect(again.store.getTrip('trip-1')!.tasks.map((t) => t.id)).toContain('t-after');
  });

  it('sends a change that was made while the app was closed', async () => {
    const { server, ana, ben } = await sharedTrip();
    await ana.engine.saveNow();
    const savedMeta = ana.storage.saved;
    // The change reaches the saved trips, but the app is killed before the sync engine hears about it.
    const edited = ana.store.trips.map((t) => ({ ...t, name: 'Renamed while closed' }));
    const again = phone(server, 'u-a', 9);
    again.store.trips = edited;
    again.storage.saved = savedMeta;
    await again.engine.init();
    await settle(again, ben);
    expect(ben.store.getTrip('trip-1')!.name).toBe('Renamed while closed');
  });

  it('stops syncing a trip that is deleted on this phone, and friends keep theirs', async () => {
    const { ana, ben, server } = await sharedTrip();
    ana.store.removeTrip('trip-1');
    await ana.engine.syncNow();
    expect(ana.engine.isShared('trip-1')).toBe(false);
    await ben.engine.syncNow();
    expect(ben.store.getTrip('trip-1')).toBeDefined();
    expect(server.stats().trips).toBe(1);
  });

  it('detaching leaves a normal local trip', async () => {
    const { ana, ben } = await sharedTrip();
    ana.engine.detach('trip-1');
    ana.store.edit('trip-1', (d) => void (d.name = 'Local only now'));
    await settle(ana, ben);
    expect(ben.store.getTrip('trip-1')!.name).toBe('Rome Crew');
    expect(ana.store.getTrip('trip-1')!.name).toBe('Local only now');
  });

  it('reports how many phones are in the trip', async () => {
    const { ana, ben } = await sharedTrip();
    await settle(ana, ben);
    expect(ana.engine.getStatus().peers).toBe(2);
    expect(ana.engine.getStatus().shared).toEqual(['trip-1']);
  });
});
