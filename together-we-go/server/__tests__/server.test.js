/** @jest-environment node */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { createServer } = require('../index');
const { SyncStore, SyncError } = require('../store');

const TRIP = 'trip_abcdefghijklmnop1234';
const stamp = (n, node = 'aaaa1111') => `${String(1800000000000 + n)}-0000-${node}`;
const op = (n, extra = {}) => ({ p: ['name'], v: `Name ${n}`, t: stamp(n), ...extra });

describe('SyncStore', () => {
  it('keeps an ordered log and hands out everything after a position', () => {
    const s = new SyncStore();
    expect(s.append(TRIP, 'ROM-1234', 'phoneA01', [op(1), op(2)])).toEqual({ seq: 2 });
    expect(s.append(TRIP, 'ROM-1234', 'phoneB01', [op(3)])).toEqual({ seq: 3 });
    const all = s.since(TRIP, 0, 'phoneA01');
    expect(all.ops.map((o) => o.v)).toEqual(['Name 1', 'Name 2', 'Name 3']);
    expect(s.since(TRIP, 2, 'phoneA01').ops.map((o) => o.v)).toEqual(['Name 3']);
    expect(s.since(TRIP, 3, 'phoneA01').ops).toEqual([]);
    expect(s.since(TRIP, 0, 'phoneA01', 2).ops).toHaveLength(2); // paging
  });

  it('looks up a trip by invite code and follows a changed code', () => {
    const s = new SyncStore();
    s.append(TRIP, 'ROM-1234', 'phoneA01', [op(1)]);
    expect(s.lookup('ROM-1234')).toBe(TRIP);
    expect(s.lookup('XXX-0000')).toBeNull();
    expect(s.lookup('not a code')).toBeNull();
    s.append(TRIP, 'ROM-9999', 'phoneA01', [op(2)]);
    expect(s.lookup('ROM-1234')).toBeNull();
    expect(s.lookup('ROM-9999')).toBe(TRIP);
  });

  it('rejects anything that is not a well-formed change', () => {
    const s = new SyncStore();
    const bad = [
      [],
      [{}],
      [{ p: [], v: 1, t: stamp(1) }],
      [{ p: [1], v: 1, t: stamp(1) }],
      [{ p: ['a'], v: 1, t: 'nope' }],
      [{ p: ['a'], t: stamp(1) }], // no value and no delete marker
      [{ p: ['a'], v: 1, d: 1, t: stamp(1) }], // both
      [{ p: ['a'], d: 2, t: stamp(1) }],
      [{ p: Array(9).fill('x'), v: 1, t: stamp(1) }],
      [{ p: ['a'], v: 'x'.repeat(5000), t: stamp(1) }],
    ];
    for (const ops of bad) expect(() => s.append(TRIP, null, 'phoneA01', ops)).toThrow(SyncError);
    expect(() => s.append('short', null, 'phoneA01', [op(1)])).toThrow(/trip id/);
    expect(() => s.append(TRIP, 'bad code', 'phoneA01', [op(1)])).toThrow(/invite code/);
    expect(() => s.append(TRIP, null, '!', [op(1)])).toThrow(/device id/);
    expect(() => s.append(TRIP, null, 'phoneA01', Array.from({ length: 501 }, (_, i) => op(i)))).toThrow(/Too many/);
    expect(s.trips.size).toBe(0);
  });

  it('stores deletes without a value', () => {
    const s = new SyncStore();
    s.append(TRIP, null, 'phoneA01', [{ p: ['tasks', 't1'], d: 1, t: stamp(1) }]);
    expect(s.since(TRIP, 0).ops[0]).toEqual({ p: ['tasks', 't1'], d: 1, t: stamp(1) });
  });

  it('wakes a waiting phone as soon as a change arrives, and gives up after the wait time', async () => {
    const s = new SyncStore();
    s.append(TRIP, null, 'phoneA01', [op(1)]);
    const started = Date.now();
    const waiting = s.wait(TRIP, 1, 5000);
    setTimeout(() => s.append(TRIP, null, 'phoneB01', [op(2)]), 30);
    await waiting;
    expect(Date.now() - started).toBeLessThan(1500);
    const t0 = Date.now();
    await s.wait(TRIP, 2, 60);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(50);
  });

  it('counts the phones seen recently', () => {
    let clock = 1_000_000;
    const s = new SyncStore({ now: () => clock });
    s.append(TRIP, null, 'phoneA01', [op(1)]);
    s.append(TRIP, null, 'phoneB01', [op(2)]);
    expect(s.since(TRIP, 0, 'phoneC01').peers).toBe(3);
    clock += 60000; // a minute later only the phone that just asked is still "online"
    expect(s.since(TRIP, 0, 'phoneC01').peers).toBe(1);
  });

  it('survives a restart', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'twg-')), 'sync.json');
    const a = new SyncStore({ file });
    a.append(TRIP, 'ROM-1234', 'phoneA01', [op(1), op(2)]);
    a.flush();
    const b = new SyncStore({ file });
    expect(b.since(TRIP, 0).ops).toHaveLength(2);
    expect(b.lookup('ROM-1234')).toBe(TRIP);
  });
});

describe('HTTP API', () => {
  let server;
  let base;

  const call = (method, pathname, body) =>
    new Promise((resolve, reject) => {
      const data = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
      const req = http.request(base + pathname, { method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: text && res.headers['content-type']?.includes('json') ? JSON.parse(text) : text }));
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });

  beforeEach(async () => {
    server = createServer(new SyncStore());
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterEach(() => new Promise((r) => server.close(r)));

  it('says it is alive', async () => {
    const r = await call('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, trips: 0 });
    expect((await call('GET', '/')).json).toContain('sync server is running');
  });

  it('sends and receives changes, and looks up a code', async () => {
    const post = await call('POST', `/v1/trips/${TRIP}/ops`, { code: 'ROM-1234', client: 'phoneA01', ops: [op(1), op(2)] });
    expect(post).toMatchObject({ status: 200, json: { seq: 2 } });
    const get = await call('GET', `/v1/trips/${TRIP}/ops?since=1&client=phoneB01`);
    expect(get.status).toBe(200);
    expect(get.json.ops).toHaveLength(1);
    expect(get.json).toMatchObject({ seq: 2, peers: 2 });
    expect(get.headers['access-control-allow-origin']).toBe('*');
    expect((await call('GET', '/v1/codes/ROM-1234')).json).toEqual({ tripId: TRIP });
    expect((await call('GET', '/v1/codes/NOP-0000')).status).toBe(404);
  });

  it('answers the browser pre-flight request', async () => {
    const r = await call('OPTIONS', `/v1/trips/${TRIP}/ops`);
    expect(r.status).toBe(204);
    expect(r.headers['access-control-allow-methods']).toContain('POST');
  });

  it('long-polling returns as soon as another phone posts', async () => {
    await call('POST', `/v1/trips/${TRIP}/ops`, { client: 'phoneA01', ops: [op(1)] });
    const started = Date.now();
    const waiting = call('GET', `/v1/trips/${TRIP}/ops?since=1&wait=8000&client=phoneB01`);
    setTimeout(() => call('POST', `/v1/trips/${TRIP}/ops`, { client: 'phoneA01', ops: [op(2)] }), 40);
    const r = await waiting;
    expect(Date.now() - started).toBeLessThan(2000);
    expect(r.json.ops.map((o) => o.v)).toEqual(['Name 2']);
  });

  it('returns clear errors', async () => {
    expect((await call('POST', `/v1/trips/${TRIP}/ops`, '{not json')).status).toBe(400);
    expect((await call('POST', `/v1/trips/${TRIP}/ops`, { client: 'phoneA01', ops: [{ p: [] }] })).status).toBe(400);
    expect((await call('GET', `/v1/trips/${TRIP}/ops?since=0`)).status).toBe(404);
    expect((await call('GET', '/v1/trips/short/ops')).status).toBe(400);
    expect((await call('GET', '/nothing')).status).toBe(404);
    expect((await call('POST', `/v1/trips/${TRIP}/ops`, { client: 'phoneA01', ops: [{ p: ['x'], v: 'y'.repeat(1_100_000), t: stamp(1) }] })).status).toBe(413);
  });

  it('limits how fast invite codes can be guessed', async () => {
    let last;
    for (let i = 0; i < 61; i++) last = await call('GET', '/v1/codes/AAA-0000');
    expect(last.status).toBe(429);
  });
});
