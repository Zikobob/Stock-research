/**
 * Files (photos, documents, receipts) travel through the sync server on their own, next to the trip's text changes.
 *
 *  - Your own new file is uploaded, then the server's id for it (`blob`) is written on the item. That small change
 *    syncs like any other, so friends' phones hear that a file exists.
 *  - A friend's item that has a `blob` but no file on this phone is downloaded and remembered in a cache, so it also
 *    opens with no connection later.
 *
 * A pass is safe to run at any time. Failures are retried later with a growing pause and never block the screens.
 */
import type { FileList } from '@/store/slices/files';
import type { Trip } from '@/store/types';

import { quiet } from './timers';

/** Matches the server's limit (server/index.js). Bigger files stay on the phone that has them. */
export const MAX_SHARED_FILE_BYTES = 8 * 1024 * 1024;

export type TransferFailure = 'network' | 'rejected' | 'missing';

/** What went wrong with an upload or download: no connection, the server said no, or it does not have the file. */
export class FileTransferError extends Error {
  constructor(
    readonly kind: TransferFailure,
    message: string,
  ) {
    super(message);
  }
}

/** Where files live on this phone and how they reach the server. The app has a native and a web version; tests use a fake. */
export interface BlobFiles {
  exists(uri: string): Promise<boolean>;
  /** Size in bytes, or null when there is no such file. */
  size(uri: string): Promise<number | null>;
  /** Sends the file to `url` (HTTP PUT with the raw bytes). Throws FileTransferError. */
  upload(uri: string, url: string): Promise<void>;
  /** Fetches `url` and keeps it as a file called `name`; returns where it is now. Throws FileTransferError. */
  download(url: string, name: string): Promise<string>;
}

/** This phone's memory of which downloaded file belongs to which blob. */
export interface BlobCache {
  get(blobId: string): string | undefined;
  set(blobId: string, uri: string): void;
  /** Items that cannot be shared (too big, file gone): remembered so the app does not complain every time it opens. */
  isRejected(key: string): boolean;
  reject(key: string): void;
}

/** For each list that holds files: the field with this phone's file path and the field with the server's id. */
export const FILE_FIELDS: Record<FileList, { local: 'uri' | 'receipt'; blob: 'blob' | 'receiptBlob' }> = {
  photos: { local: 'uri', blob: 'blob' },
  docs: { local: 'uri', blob: 'blob' },
  expenses: { local: 'receipt', blob: 'receiptBlob' },
};

const LISTS = Object.keys(FILE_FIELDS) as FileList[];

/** A real file on this phone, as opposed to the names of the pictures that come with the app ("amalfi"). */
export const isLocalFile = (uri: string | undefined): uri is string => !!uri && /^(file|content|blob|data):/i.test(uri);

/**
 * The pictures that come with the app are not files to send: every phone has them already. A photo that uses one is
 * shared by name, as `asset:amalfi`, in the same field that holds a server file id for real files.
 */
const ASSET_PREFIX = 'asset:';
export const isAssetRef = (blob: string | undefined): blob is string => !!blob && blob.startsWith(ASSET_PREFIX);
export const assetRef = (key: string) => `${ASSET_PREFIX}${key}`;

/**
 * What to show for a photo, document or receipt: this phone's own file, a bundled picture shared by name, the copy
 * downloaded from a friend, or (while that is on its way) nothing yet.
 */
export function resolveFile(local: string | undefined, blob: string | undefined, downloaded: string | undefined): { uri: string | undefined; loading: boolean } {
  if (local) return { uri: local, loading: false };
  if (isAssetRef(blob)) return { uri: blob.slice(ASSET_PREFIX.length), loading: false };
  if (downloaded) return { uri: downloaded, loading: false };
  return { uri: undefined, loading: !!blob };
}

const MIME_EXT: Record<string, string> = { jpeg: 'jpg', 'svg+xml': 'svg', 'x-icon': 'ico' };

/** "photo.JPG?x=1" -> "jpg". A data: address names its type instead of a file. */
export function extensionOf(uri: string, hint = 'bin'): string {
  const data = /^data:[\w.+-]+\/([\w.+-]+)/i.exec(uri);
  const raw = (data ? data[1] : (/\.([A-Za-z0-9]{1,5})$/.exec(uri.split(/[?#]/)[0])?.[1] ?? hint)).toLowerCase();
  return MIME_EXT[raw] ?? (raw.replace(/[^a-z0-9]/g, '').slice(0, 5) || hint);
}

/** The server's id for a file. It ends in `_ext` so the downloaded copy gets a name that apps can open. */
export const makeBlobId = (random: string, uri: string, hint?: string) => `${random}_${extensionOf(uri, hint)}`;

/** "k3j9x2m1_pdf" -> "k3j9x2m1.pdf" */
export const fileNameOf = (blobId: string) => blobId.replace(/_([a-z0-9]{1,5})$/, '.$1');

const hintFor = (list: FileList, item: { kind?: string }) => (list === 'docs' ? (item.kind === 'pdf' ? 'pdf' : item.kind === 'image' ? 'jpg' : 'bin') : 'jpg');

interface Job {
  kind: 'upload' | 'download' | 'reference';
  tripId: string;
  remoteId: string;
  list: FileList;
  itemId: string;
  /** For an upload: this phone's file. For a reference: the bundled picture's name. */
  uri?: string;
  /** For a download: the server's id. */
  blobId?: string;
  hint: string;
}

export interface BlobSyncOptions {
  /** The trips in the app. */
  trips: () => Trip[];
  /** The id the server uses for a trip, or undefined when the trip is not shared. */
  remoteId: (tripId: string) => string | undefined;
  /** The sync server's address, or null when none is set. */
  baseUrl: () => string | null;
  files: BlobFiles;
  cache: BlobCache;
  /** Writes the server's id onto the item (so it syncs like any other change). */
  attach: (tripId: string, list: FileList, itemId: string, blobId: string) => void;
  newId: () => string;
  /** Something the person should hear about (a file that is too big to share). */
  onNotice?: (message: string) => void;
  /** How many files are still waiting (for a "syncing…" hint). */
  onPending?: (count: number) => void;
}

export class BlobSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private again = false;
  private pause = 0;
  private stopped = false;

  constructor(private readonly o: BlobSyncOptions) {}

  /** Look for files to send or fetch soon. Cheap to call after every change; calls close together become one pass. */
  schedule(delayMs = 500): void {
    if (this.stopped || this.timer) return;
    this.timer = quiet(
      setTimeout(() => {
        this.timer = null;
        void this.run();
      }, delayMs),
    );
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Does one full pass (or asks the running one to go round again). Resolves when it is done. */
  async run(): Promise<void> {
    if (this.stopped) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    try {
      let failed: boolean;
      do {
        this.again = false;
        failed = await this.pass();
      } while (this.again && !this.stopped);
      this.pause = failed ? Math.min(this.pause ? this.pause * 2 : 3000, 60000) : 0;
      if (failed) this.schedule(this.pause);
    } finally {
      this.running = false;
    }
  }

  private collect(): Job[] {
    const jobs: Job[] = [];
    for (const trip of this.o.trips()) {
      const remoteId = this.o.remoteId(trip.id);
      if (!remoteId) continue;
      for (const list of LISTS) {
        const { local, blob } = FILE_FIELDS[list];
        for (const item of trip[list] as unknown as Record<string, string | undefined>[]) {
          const uri = item[local];
          const blobId = item[blob];
          const base = { tripId: trip.id, remoteId, list, itemId: item.id as string, hint: hintFor(list, item as { kind?: string }) };
          if (isLocalFile(uri) && !blobId) jobs.push({ ...base, kind: 'upload', uri });
          else if (list === 'photos' && uri && !isLocalFile(uri) && !blobId) jobs.push({ ...base, kind: 'reference', uri });
          else if (blobId && !isLocalFile(uri) && !isAssetRef(blobId)) jobs.push({ ...base, kind: 'download', blobId });
        }
      }
    }
    return jobs;
  }

  /** Returns true when something should be tried again later. */
  private async pass(): Promise<boolean> {
    const base = this.o.baseUrl();
    if (!base) {
      this.o.onPending?.(0);
      return false;
    }
    const jobs = this.collect();
    for (const job of jobs.filter((j) => j.kind === 'reference')) this.o.attach(job.tripId, job.list, job.itemId, assetRef(job.uri as string)); // nothing to send: just say which picture it is
    jobs.splice(0, jobs.length, ...jobs.filter((j) => j.kind !== 'reference'));
    this.o.onPending?.(jobs.length);
    let retry = false;
    for (const job of jobs) {
      if (this.stopped) return false;
      try {
        if (job.kind === 'upload') await this.upload(base, job);
        else await this.download(base, job);
      } catch (e) {
        retry = true;
        if (e instanceof FileTransferError && e.kind === 'network') break; // the server is out of reach: no point trying the rest now
      }
    }
    if (!retry) this.o.onPending?.(0);
    return retry;
  }

  private async upload(base: string, job: Job): Promise<void> {
    const key = `${job.tripId}/${job.list}/${job.itemId}`;
    if (this.o.cache.isRejected(key)) return;
    const uri = job.uri as string;
    const size = await this.o.files.size(uri);
    if (size === null) return this.o.cache.reject(key); // the file is gone from this phone: nothing to send
    if (size > MAX_SHARED_FILE_BYTES) return this.refuse(key, size);
    const blobId = makeBlobId(this.o.newId(), uri, job.hint);
    try {
      await this.o.files.upload(uri, `${base}/v1/trips/${job.remoteId}/files/${blobId}`);
    } catch (e) {
      if (e instanceof FileTransferError && e.kind === 'rejected') return this.refuse(key, size);
      throw e; // no connection, or the server has not heard of this trip yet: try again later
    }
    this.o.attach(job.tripId, job.list, job.itemId, blobId);
  }

  private refuse(key: string, size: number): void {
    this.o.cache.reject(key);
    this.o.onNotice?.(`That file is ${(size / 1024 / 1024).toFixed(1)} MB. Files over ${MAX_SHARED_FILE_BYTES / 1024 / 1024} MB stay on your phone and are not shared with friends.`);
  }

  private async download(base: string, job: Job): Promise<void> {
    const blobId = job.blobId as string;
    const have = this.o.cache.get(blobId);
    if (have && (await this.o.files.exists(have))) return;
    const uri = await this.o.files.download(`${base}/v1/trips/${job.remoteId}/files/${blobId}`, fileNameOf(blobId));
    this.o.cache.set(blobId, uri);
  }
}
