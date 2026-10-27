import type { Trip } from '@/store/types';

import { SyncStore, SyncError } from '../../../server/store';
import { BlobSync, FileTransferError, MAX_SHARED_FILE_BYTES, assetRef, extensionOf, fileNameOf, isAssetRef, isLocalFile, makeBlobId, resolveFile, type BlobFiles } from '../blobs';
import { SyncEngine } from '../engine';
import { FakeStore, MemoryStorage, fakeNow, makeTrip, memoryTransport, seeded } from '../testing';

type Server = InstanceType<typeof SyncStore>;

/** A phone's storage and its connection to the server's files, in memory. */
function fakeFiles(server: Server, name: string) {
  const disk = new Map<string, Buffer>();
  const files: BlobFiles & { offline: boolean; uploads: string[]; downloads: string[]; disk: Map<string, Buffer> } = {
    offline: false,
    uploads: [],
    downloads: [],
    disk,
    exists: async (uri) => disk.has(uri),
    size: async (uri) => disk.get(uri)?.length ?? null,
    async upload(uri, url) {
      if (files.offline) throw new FileTransferError('network', 'offline');
      const [, tripId, fileId] = /\/v1\/trips\/([^/]+)\/files\/([^/]+)$/.exec(url)!;
      files.uploads.push(fileId);
      try {
        await server.putBlob(tripId, fileId, disk.get(uri)!);
      } catch (e) {
        const status = e instanceof SyncError ? e.status : 500;
        throw new FileTransferError(status === 404 ? 'missing' : status === 400 || status === 413 ? 'rejected' : 'network', String(e));
      }
    },
    async download(url, fileName) {
      if (files.offline) throw new FileTransferError('network', 'offline');
      const [, tripId, fileId] = /\/v1\/trips\/([^/]+)\/files\/([^/]+)$/.exec(url)!;
      files.downloads.push(fileId);
      const bytes = await server.getBlob(tripId, fileId);
      if (!bytes) throw new FileTransferError('missing', 'no such file');
      const uri = `file:///${name}/shared/${fileName}`;
      disk.set(uri, bytes);
      return uri;
    },
  };
  return files;
}

// a pass that keeps failing schedules its own retries: stop them so the test run can finish
const started: { blobs: BlobSync }[] = [];
afterEach(() => started.splice(0).forEach((p) => p.blobs.stop()));

function phone(server: Server, userId: string, name: string, seed: number) {
  const store = new FakeStore();
  store.userId = userId;
  const transport = memoryTransport(server);
  const engine = new SyncEngine({ store, storage: new MemoryStorage(), getTransport: () => transport, pollWaitMs: 0, now: fakeNow(), random: seeded(seed).next });
  const files = fakeFiles(server, name);
  const saved = new Map<string, string>();
  const rejected = new Set<string>();
  const notices: string[] = [];
  const pending: number[] = [];
  const random = seeded(seed + 100).next;
  const blobs = new BlobSync({
    trips: () => store.trips,
    remoteId: (id) => engine.remoteId(id),
    baseUrl: () => 'http://sync.test',
    files,
    cache: { get: (id) => saved.get(id), set: (id, uri) => void saved.set(id, uri), isRejected: (k) => rejected.has(k), reject: (k) => void rejected.add(k) },
    attach: (tripId, list, itemId, blobId) =>
      store.edit(tripId, (d) => {
        if (list === 'expenses') d.expenses.find((x) => x.id === itemId)!.receiptBlob = blobId;
        else (d[list].find((x) => x.id === itemId) as { blob?: string }).blob = blobId;
      }),
    newId: () => Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0'),
    onNotice: (m) => notices.push(m),
    onPending: (n) => pending.push(n),
  });
  const created = { store, engine, files, blobs, saved, rejected, notices, pending, name };
  started.push(created);
  return created;
}

type Phone = ReturnType<typeof phone>;

const bytesOf = (text: string) => Buffer.from(text);

/** Ana has a trip with a local photo, receipt and (optionally) more; Ben joins it. */
async function setup(options: { server?: Server; tripEdit?: (t: Trip) => void } = {}) {
  const server = options.server ?? new SyncStore();
  const ana = phone(server, 'u-a', 'ana', 1);
  const ben = phone(server, 'u-b', 'ben', 2);
  const trip = makeTrip();
  trip.expenses[0].receipt = 'file:///ana/receipt.jpg';
  trip.photos[0].uri = 'file:///ana/photo.jpg';
  options.tripEdit?.(trip);
  ana.store.trips = [trip];
  ana.files.disk.set('file:///ana/photo.jpg', bytesOf('PHOTO-BYTES'));
  ana.files.disk.set('file:///ana/receipt.jpg', bytesOf('RECEIPT-BYTES'));
  await ana.engine.init();
  await ben.engine.init();
  await ana.engine.share('trip-1');
  await ana.engine.syncNow();
  await ben.engine.join('ROM-1234');
  return { server, ana, ben };
}

/** Everyone sends and fetches, files move, and the news about the files travels once more. */
async function settle(...phones: Phone[]) {
  for (let i = 0; i < 2; i++) {
    for (const p of phones) await p.engine.syncNow();
    for (const p of phones) await p.blobs.run();
  }
  for (const p of phones) await p.engine.syncNow();
}

const tripOf = (p: Phone) => p.store.getTrip('trip-1')!;

describe('helpers', () => {
  it('works out a file extension from an address', () => {
    expect(extensionOf('file:///a/Photo.JPG')).toBe('jpg');
    expect(extensionOf('file:///a/photo.jpeg?x=1#y')).toBe('jpg');
    expect(extensionOf('file:///a/ticket.pdf')).toBe('pdf');
    expect(extensionOf('data:image/png;base64,AAAA')).toBe('png');
    expect(extensionOf('data:image/svg+xml;base64,AAAA')).toBe('svg');
    expect(extensionOf('blob:http://localhost/1234-5678', 'jpg')).toBe('jpg');
    expect(extensionOf('file:///a/no-extension')).toBe('bin');
  });

  it('makes server ids that turn back into a usable file name', () => {
    const id = makeBlobId('k3j9x2m1', 'file:///a/trip-plan.PDF');
    expect(id).toBe('k3j9x2m1_pdf');
    expect(fileNameOf(id)).toBe('k3j9x2m1.pdf');
    expect(fileNameOf('plainid')).toBe('plainid');
  });

  it('tells real files from the pictures that ship with the app', () => {
    expect(isLocalFile('file:///a/b.jpg')).toBe(true);
    expect(isLocalFile('blob:http://x/1')).toBe(true);
    expect(isLocalFile('data:image/png;base64,AA')).toBe(true);
    expect(isLocalFile('amalfi')).toBe(false);
    expect(isLocalFile('')).toBe(false);
    expect(isLocalFile(undefined)).toBe(false);
  });
});

describe('what to show for a file', () => {
  it('prefers this phone’s own file, then a bundled picture, then the downloaded copy', () => {
    expect(resolveFile('file:///mine.jpg', 'abc_jpg', 'file:///copy.jpg')).toEqual({ uri: 'file:///mine.jpg', loading: false });
    expect(resolveFile('', 'asset:amalfi', undefined)).toEqual({ uri: 'amalfi', loading: false });
    expect(resolveFile('', 'abc12345_jpg', 'file:///copy.jpg')).toEqual({ uri: 'file:///copy.jpg', loading: false });
    expect(resolveFile('', 'abc12345_jpg', undefined)).toEqual({ uri: undefined, loading: true });
    expect(resolveFile(undefined, undefined, undefined)).toEqual({ uri: undefined, loading: false });
    expect(isAssetRef(assetRef('amalfi'))).toBe(true);
    expect(isAssetRef('abc12345_jpg')).toBe(false);
  });
});

describe('sending and fetching files', () => {
  it('shares the pictures that come with the app by name instead of sending them', async () => {
    const { ana, ben } = await setup({
      tripEdit: (t) => {
        t.photos.push({ id: 'ph-demo', uri: 'amalfi', caption: 'Bundled', by: 'u-a', likes: [], ts: 6 });
      },
    });
    await settle(ana, ben);
    expect(tripOf(ana).photos.find((p) => p.id === 'ph-demo')?.blob).toBe('asset:amalfi');
    expect(tripOf(ben).photos.find((p) => p.id === 'ph-demo')?.blob).toBe('asset:amalfi');
    expect(ben.files.downloads).toHaveLength(2); // only the real photo and receipt were fetched
    expect(ana.files.uploads).toHaveLength(2);
  });

  it('uploads your photo and receipt and writes the server ids on them', async () => {
    const { server, ana } = await setup();
    await ana.blobs.run();
    const trip = tripOf(ana);
    expect(trip.photos[0].blob).toMatch(/^[a-z0-9]{8}_jpg$/);
    expect(trip.expenses[0].receiptBlob).toMatch(/^[a-z0-9]{8}_jpg$/);
    const remote = ana.engine.remoteId('trip-1')!;
    expect((await server.getBlob(remote, trip.photos[0].blob!))?.toString()).toBe('PHOTO-BYTES');
    expect((await server.getBlob(remote, trip.expenses[0].receiptBlob!))?.toString()).toBe('RECEIPT-BYTES');
    expect(ana.files.uploads).toHaveLength(2);
  });

  it('a friend’s phone downloads the files and keeps its own copy', async () => {
    const { ana, ben } = await setup();
    await settle(ana, ben);
    const photo = tripOf(ben).photos[0];
    expect(photo.blob).toBe(tripOf(ana).photos[0].blob);
    expect(photo.uri).toBe(''); // the path on Ana's phone means nothing here
    const copy = ben.saved.get(photo.blob!)!;
    expect(copy).toMatch(/^file:\/\/\/ben\/shared\/[a-z0-9]{8}\.jpg$/);
    expect(ben.files.disk.get(copy)?.toString()).toBe('PHOTO-BYTES');
    expect(ben.files.disk.get(ben.saved.get(tripOf(ben).expenses[0].receiptBlob!)!)?.toString()).toBe('RECEIPT-BYTES');
  });

  it('does not send a file twice or fetch it again', async () => {
    const { ana, ben } = await setup();
    await settle(ana, ben);
    await settle(ana, ben);
    await ana.blobs.run();
    await ben.blobs.run();
    expect(ana.files.uploads).toHaveLength(2);
    expect(ben.files.downloads).toHaveLength(2);
    expect(ana.files.downloads).toHaveLength(0); // the owner already has the files
  });

  it('two passes at the same time still upload once', async () => {
    const { ana } = await setup();
    await Promise.all([ana.blobs.run(), ana.blobs.run(), ana.blobs.run()]);
    expect(ana.files.uploads).toHaveLength(2);
  });

  it('leaves trips that are not shared alone', async () => {
    const { ana } = await setup({
      tripEdit: (t) => {
        t.photos.push({ id: 'ph-demo', uri: 'amalfi', caption: 'Bundled', by: 'u-a', likes: [], ts: 6 });
      },
    });
    ana.store.trips = [...ana.store.trips, { ...makeTrip(), id: 'trip-private', inviteCode: 'PRV-0001', photos: [{ id: 'x', uri: 'file:///ana/photo.jpg', caption: '', by: 'u-a', likes: [], ts: 1 }] }];
    await ana.blobs.run();
    expect(ana.files.uploads).toHaveLength(2); // only the two files in the shared trip
    expect(ana.store.getTrip('trip-private')!.photos[0].blob).toBeUndefined();
  });

  it('handles documents and keeps their file type', async () => {
    const { ana, ben } = await setup({
      tripEdit: (t) => {
        t.docs.push({ id: 'd1', name: 'Hotel booking', kind: 'pdf', uri: 'file:///ana/booking.pdf', addedBy: 'u-a', addedAt: 3, offline: true });
        t.docs.push({ id: 'd2', name: 'Packing tips', kind: 'note', note: 'Bring a hat', addedBy: 'u-a', addedAt: 4, offline: false });
      },
    });
    ana.files.disk.set('file:///ana/booking.pdf', bytesOf('PDF-BYTES'));
    await settle(ana, ben);
    const doc = tripOf(ben).docs.find((d) => d.id === 'd1')!;
    expect(doc.blob).toMatch(/_pdf$/);
    expect(ben.saved.get(doc.blob!)).toMatch(/\.pdf$/);
    expect(tripOf(ben).docs.find((d) => d.id === 'd2')?.blob).toBeUndefined(); // a note has no file
  });

  it('fetches the file again when the saved copy has disappeared', async () => {
    const { ana, ben } = await setup();
    await settle(ana, ben);
    const id = tripOf(ben).photos[0].blob!;
    ben.files.disk.delete(ben.saved.get(id)!); // the phone cleaned its storage
    await ben.blobs.run();
    expect(ben.files.downloads.filter((d) => d === id)).toHaveLength(2);
    expect(ben.files.disk.get(ben.saved.get(id)!)?.toString()).toBe('PHOTO-BYTES');
  });

  it('a friend who joins later also gets files that were added before', async () => {
    const { server, ana, ben } = await setup();
    await settle(ana, ben);
    const cara = phone(server, 'u-c', 'cara', 3);
    await cara.engine.init();
    await cara.engine.join('ROM-1234');
    await cara.blobs.run();
    expect(cara.saved.size).toBe(2);
  });
});

describe('when things go wrong', () => {
  it('keeps the file for later when there is no connection, then sends it', async () => {
    const { ana, ben } = await setup();
    ana.files.offline = true;
    await ana.blobs.run();
    expect(tripOf(ana).photos[0].blob).toBeUndefined();
    expect(ana.notices).toEqual([]); // being offline is not worth a message
    ana.files.offline = false;
    await settle(ana, ben);
    expect(tripOf(ben).photos[0].blob).toBeDefined();
    expect(ben.saved.size).toBe(2);
  });

  it('tries again by itself after a pause', async () => {
    jest.useFakeTimers();
    try {
      const { ana } = await setup();
      ana.files.offline = true;
      await ana.blobs.run(); // fails and schedules a retry
      expect(ana.files.uploads).toHaveLength(0);
      ana.files.offline = false;
      await jest.advanceTimersByTimeAsync(2900);
      expect(ana.files.uploads).toHaveLength(0); // still waiting
      await jest.advanceTimersByTimeAsync(300);
      expect(ana.files.uploads).toHaveLength(2);
      ana.blobs.stop();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not share a file that is too big, and says so once', async () => {
    const { ana } = await setup();
    ana.files.disk.set('file:///ana/photo.jpg', Buffer.alloc(MAX_SHARED_FILE_BYTES + 1024 * 1024));
    await ana.blobs.run();
    await ana.blobs.run();
    expect(ana.notices).toHaveLength(1);
    expect(ana.notices[0]).toMatch(/9\.0 MB/);
    expect(tripOf(ana).photos[0].blob).toBeUndefined();
    expect(tripOf(ana).expenses[0].receiptBlob).toBeDefined(); // the receipt still went
  });

  it('remembers a file the server refused instead of trying it forever', async () => {
    const server = new SyncStore({ maxBlobBytes: 5 });
    const { ana } = await setup({ server });
    await ana.blobs.run();
    await ana.blobs.run();
    expect(ana.notices.length).toBe(2); // one per file, each only once
    expect(ana.files.uploads).toHaveLength(2);
    expect(ana.rejected.size).toBe(2);
  });

  it('stops quietly when the file was deleted from the phone', async () => {
    const { ana } = await setup();
    ana.files.disk.delete('file:///ana/photo.jpg');
    await ana.blobs.run();
    expect(tripOf(ana).photos[0].blob).toBeUndefined();
    expect(ana.notices).toEqual([]);
    expect(tripOf(ana).expenses[0].receiptBlob).toBeDefined();
  });

  it('keeps going with other files when one is missing on the server', async () => {
    const { ana, ben } = await setup();
    await settle(ana, ben);
    // a second photo whose file the server never received, plus the earlier ones gone from Ben's phone
    ana.store.edit('trip-1', (d) => void d.photos.unshift({ id: 'ph-lost', uri: '', blob: 'lost0000_jpg', caption: 'Lost', by: 'u-a', likes: [], ts: 9 }));
    await ana.engine.syncNow();
    await ben.engine.syncNow();
    ben.files.disk.delete(ben.saved.get(tripOf(ben).expenses[0].receiptBlob!)!); // this one can be fetched again
    await ben.blobs.run();
    expect(ben.files.disk.get(ben.saved.get(tripOf(ben).expenses[0].receiptBlob!)!)?.toString()).toBe('RECEIPT-BYTES');
  });

  it('reports how many files are waiting', async () => {
    const { ana } = await setup();
    await ana.blobs.run();
    expect(ana.pending[0]).toBe(2);
    expect(ana.pending.at(-1)).toBe(0);
  });

  it('does nothing without a server address', async () => {
    const { ana } = await setup();
    const quiet = new BlobSync({ trips: () => ana.store.trips, remoteId: (id) => ana.engine.remoteId(id), baseUrl: () => null, files: ana.files, cache: { get: () => undefined, set: () => undefined, isRejected: () => false, reject: () => undefined }, attach: () => undefined, newId: () => 'abcdefgh' });
    await quiet.run();
    expect(ana.files.uploads).toHaveLength(0);
  });
});
