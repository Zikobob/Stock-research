/** @jest-environment node */
import http from 'http';
import type { AddressInfo } from 'net';

import { createServer } from '../../../server/index';
import { SyncStore } from '../../../server/store';
import { SyncEngine } from '../engine';
import { FakeStore, MemoryStorage, makeTrip, seeded, sharedPart } from '../testing';
import { createHttpTransport, normalizeServerUrl } from '../transport';

/** Jest's React Native setup replaces the global fetch, so these tests bring a tiny real one built on Node's http. */
const nodeFetch = ((input: string, init: RequestInit = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(input, { method: init.method ?? 'GET', headers: init.headers as Record<string, string>, agent: false }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, json: async () => JSON.parse(text) }));
    });
    req.on('error', reject);
    init.signal?.addEventListener('abort', () => {
      req.destroy();
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
    if (init.body) req.write(init.body);
    req.end();
  })) as unknown as typeof fetch;

const until = async (check: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 15));
  }
};

describe('two phones talking to the real server over HTTP', () => {
  let server: ReturnType<typeof createServer>;
  let url: string;
  const engines: SyncEngine[] = [];

  beforeEach(async () => {
    server = createServer(new SyncStore());
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    engines.splice(0).forEach((e) => e.stop());
    await new Promise((r) => server.close(r));
  });

  function phone(userId: string, seed: number) {
    const store = new FakeStore();
    store.userId = userId;
    const engine = new SyncEngine({ store, storage: new MemoryStorage(), getTransport: () => createHttpTransport(url, nodeFetch), random: seeded(seed).next, pollWaitMs: 5000 });
    engines.push(engine);
    return { store, engine };
  }

  it('shares, joins and keeps chatting live (long-polling)', async () => {
    const ana = phone('u-a', 1);
    const ben = phone('u-b', 2);
    ana.store.trips = [makeTrip()];
    await ana.engine.init();
    await ben.engine.init();
    await ana.engine.share('trip-1');
    ana.engine.start();
    await until(() => ana.engine.getStatus().pending === 0 && ana.engine.getStatus().online === true);

    expect((await ben.engine.join('ROM-1234'))?.name).toBe('Rome Crew');
    ben.engine.start();

    ana.store.edit('trip-1', (d) => void d.messages.push({ id: 'live1', authorId: 'u-a', text: 'Can you see this?', ts: 9000 }));
    await until(() => !!ben.store.getTrip('trip-1')?.messages.some((m) => m.id === 'live1'));

    ben.store.edit('trip-1', (d) => void (d.activities[0].votes['u-b'] = 1));
    await until(() => ana.store.getTrip('trip-1')?.activities[0].votes['u-b'] === 1);

    expect(sharedPart(ana.store.getTrip('trip-1'))).toEqual(sharedPart(ben.store.getTrip('trip-1')));
    await until(() => ana.engine.getStatus().peers === 2);
  });

  it('reports a clear error when the server is not there', async () => {
    const lonely = phone('u-a', 3);
    lonely.store.trips = [makeTrip()];
    await lonely.engine.init();
    await expect(lonely.engine.share('trip-1')).resolves.toBeUndefined();
    await new Promise((r) => server.close(r));
    server = createServer(new SyncStore()); // so afterEach can close something
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    await lonely.engine.syncNow();
    expect(lonely.engine.getStatus()).toMatchObject({ online: false, error: 'Can’t reach the sync server' });
  });
});

describe('server addresses', () => {
  it('accepts the ways people type an address', () => {
    expect(normalizeServerUrl('192.168.1.20:8787')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl(' http://192.168.1.20:8787/ ')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl('https://sync.example.com')).toBe('https://sync.example.com');
    expect(normalizeServerUrl('localhost:8787/extra/path')).toBe('http://localhost:8787');
  });

  it('rejects things that are not addresses', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
    expect(normalizeServerUrl('http://')).toBeNull();
  });
});
