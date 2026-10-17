/**
 * The sync server's memory: for every shared trip, an ordered log of changes ("ops") that phones send and
 * fetch. The server never needs to understand a change; phones merge them (see src/sync/crdt.ts), so this stays
 * small. Plain JavaScript with no dependencies so it runs anywhere Node runs.
 */
const fs = require('fs');
const path = require('path');

const TRIP_ID = /^[A-Za-z0-9_-]{16,64}$/;
const CODE = /^[A-Z]{3}-\d{4}$/;
const STAMP = /^\d{13}-[0-9a-z]{4}-\w{1,16}$/;
const CLIENT = /^\w{4,32}$/;
const MAX_OPS_PER_REQUEST = 500;
const MAX_OP_BYTES = 4000;
const MAX_OPS_PER_TRIP = 50000;
const PEER_WINDOW_MS = 45000;
const BLOB_ID = /^[A-Za-z0-9_-]{8,40}$/;
const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const MAX_BLOB_BYTES_PER_TRIP = 150 * 1024 * 1024;

class SyncError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Throws a SyncError for anything that is not a well-formed op. */
function checkOp(op) {
  if (!op || typeof op !== 'object') throw new SyncError(400, 'Each change must be an object');
  if (!Array.isArray(op.p) || op.p.length < 1 || op.p.length > 8 || op.p.some((s) => typeof s !== 'string' || s.length < 1 || s.length > 80)) {
    throw new SyncError(400, 'Bad change path');
  }
  if (typeof op.t !== 'string' || !STAMP.test(op.t)) throw new SyncError(400, 'Bad change stamp');
  if (op.d !== undefined && op.d !== 1) throw new SyncError(400, 'Bad delete marker');
  if (op.d === 1 && op.v !== undefined) throw new SyncError(400, 'A delete cannot carry a value');
  if (op.d !== 1 && op.v === undefined) throw new SyncError(400, 'A change needs a value');
  if (JSON.stringify(op).length > MAX_OP_BYTES) throw new SyncError(413, 'Change too large');
}

class SyncStore {
  /**
   * @param {{ file?: string, blobDir?: string, now?: () => number, maxBlobBytes?: number, maxBlobBytesPerTrip?: number }} [options]
   * Files (photos, documents, receipts) are kept next to the JSON file, or in memory when there is no file.
   */
  constructor(options = {}) {
    this.file = options.file;
    this.blobDir = options.blobDir || (options.file ? path.join(path.dirname(options.file), 'files') : null);
    this.limits = { blob: options.maxBlobBytes || MAX_BLOB_BYTES, perTrip: options.maxBlobBytesPerTrip || MAX_BLOB_BYTES_PER_TRIP };
    this.memBlobs = new Map();
    this.now = options.now || Date.now;
    /** @type {Map<string, { ops: object[], code: string | null, created: number, clients: Map<string, number>, blobs: Map<string, number>, blobBytes: number }>} */
    this.trips = new Map();
    /** @type {Map<string, string>} */
    this.codes = new Map();
    this.waiters = new Map();
    this.saveTimer = null;
    if (this.file) this.load();
  }

  trip(tripId, create) {
    if (!TRIP_ID.test(tripId)) throw new SyncError(400, 'Bad trip id');
    let t = this.trips.get(tripId);
    if (!t && create) {
      t = { ops: [], code: null, created: this.now(), clients: new Map(), blobs: new Map(), blobBytes: 0 };
      this.trips.set(tripId, t);
    }
    return t;
  }

  /** Adds changes from a phone. Returns the new log length (the "sequence number" phones remember). */
  append(tripId, code, client, ops) {
    if (!Array.isArray(ops) || ops.length === 0) throw new SyncError(400, 'Send at least one change');
    if (ops.length > MAX_OPS_PER_REQUEST) throw new SyncError(413, 'Too many changes in one request');
    if (!CLIENT.test(client || '')) throw new SyncError(400, 'Bad device id');
    if (code !== undefined && code !== null && !CODE.test(code)) throw new SyncError(400, 'Bad invite code');
    ops.forEach(checkOp);
    const t = this.trip(tripId, true);
    if (t.ops.length + ops.length > MAX_OPS_PER_TRIP) throw new SyncError(413, 'This trip has reached the server limit');
    for (const op of ops) t.ops.push({ p: op.p, t: op.t, ...(op.d ? { d: 1 } : { v: op.v }) });
    if (code && t.code !== code) {
      if (t.code) this.codes.delete(t.code);
      t.code = code;
      this.codes.set(code, tripId);
    }
    t.clients.set(client, this.now());
    this.wake(tripId);
    this.scheduleSave();
    return { seq: t.ops.length };
  }

  /** Changes after position `since`. */
  since(tripId, since, client, limit = 1000) {
    const t = this.trip(tripId, false);
    if (!t) throw new SyncError(404, 'Unknown trip');
    if (client && CLIENT.test(client)) t.clients.set(client, this.now());
    const from = Math.max(0, Math.min(Number(since) || 0, t.ops.length));
    return { ops: t.ops.slice(from, from + limit), seq: Math.min(t.ops.length, from + limit), total: t.ops.length, peers: this.peers(t) };
  }

  /**
   * Waits until the trip has changes after `since` (or `ms` pass), so phones hear about changes almost instantly.
   * The returned promise has a `cancel()` for when the phone hangs up.
   */
  wait(tripId, since, ms) {
    const t = this.trip(tripId, false);
    if (!t) throw new SyncError(404, 'Unknown trip');
    if (t.ops.length > since || ms <= 0) return Promise.resolve();
    let finish;
    const promise = new Promise((resolve) => {
      const set = this.waiters.get(tripId) || new Set();
      this.waiters.set(tripId, set);
      const timer = setTimeout(() => finish(), ms);
      finish = () => {
        clearTimeout(timer);
        set.delete(finish);
        resolve();
      };
      set.add(finish);
    });
    promise.cancel = finish;
    return promise;
  }

  wake(tripId) {
    for (const done of [...(this.waiters.get(tripId) || [])]) done();
  }

  /** Keeps one file (a photo, document or receipt) for a trip. Sending the same id again replaces it. */
  async putBlob(tripId, blobId, bytes) {
    const t = this.trip(tripId, false);
    if (!t) throw new SyncError(404, 'Unknown trip');
    if (!BLOB_ID.test(blobId || '')) throw new SyncError(400, 'Bad file id');
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new SyncError(400, 'The file is empty');
    if (bytes.length > this.limits.blob) throw new SyncError(413, 'That file is too large to share');
    const before = t.blobs.get(blobId);
    if (t.blobBytes - (before || 0) + bytes.length > this.limits.perTrip) throw new SyncError(413, 'This trip has reached the server’s file limit');
    t.blobBytes += bytes.length - (before || 0); // counted first, so two uploads at once cannot both slip under the limit
    t.blobs.set(blobId, bytes.length);
    try {
      if (this.blobDir) {
        const dir = path.join(this.blobDir, tripId);
        await fs.promises.mkdir(dir, { recursive: true });
        const tmp = path.join(dir, `${blobId}.tmp`);
        await fs.promises.writeFile(tmp, bytes);
        await fs.promises.rename(tmp, path.join(dir, blobId));
      } else {
        this.memBlobs.set(`${tripId}/${blobId}`, bytes);
      }
    } catch (e) {
      t.blobBytes += (before || 0) - bytes.length;
      if (before) t.blobs.set(blobId, before);
      else t.blobs.delete(blobId);
      throw e;
    }
    return { size: bytes.length };
  }

  /** A stored file, or null when there is none with that id. */
  async getBlob(tripId, blobId) {
    const t = this.trip(tripId, false);
    if (!t) throw new SyncError(404, 'Unknown trip');
    if (!BLOB_ID.test(blobId || '') || !t.blobs.has(blobId)) return null;
    if (!this.blobDir) return this.memBlobs.get(`${tripId}/${blobId}`) || null;
    try {
      return await fs.promises.readFile(path.join(this.blobDir, tripId, blobId));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  lookup(code) {
    return CODE.test(code || '') ? this.codes.get(code) || null : null;
  }

  peers(t) {
    const cutoff = this.now() - PEER_WINDOW_MS;
    let n = 0;
    for (const seen of t.clients.values()) if (seen >= cutoff) n++;
    return n;
  }

  stats() {
    const all = [...this.trips.values()];
    return { trips: this.trips.size, ops: all.reduce((a, t) => a + t.ops.length, 0), files: all.reduce((a, t) => a + t.blobs.size, 0) };
  }

  // ---- saving to a plain JSON file, so a restart loses nothing ----
  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const [id, t] of Object.entries(data.trips || {})) {
        this.trips.set(id, { ops: t.ops, code: t.code, created: t.created, clients: new Map(), ...this.indexBlobs(id) });
        if (t.code) this.codes.set(t.code, id);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('Could not read', this.file, e.message);
    }
  }

  /** Which files are on disk for a trip (after a restart), and how big they are. */
  indexBlobs(tripId) {
    const blobs = new Map();
    let blobBytes = 0;
    if (this.blobDir) {
      try {
        for (const name of fs.readdirSync(path.join(this.blobDir, tripId))) {
          if (!BLOB_ID.test(name)) continue; // leftovers of an interrupted upload end in .tmp
          const size = fs.statSync(path.join(this.blobDir, tripId, name)).size;
          blobs.set(name, size);
          blobBytes += size;
        }
      } catch (e) {
        if (e.code !== 'ENOENT') console.error('Could not read files of', tripId, e.message);
      }
    }
    return { blobs, blobBytes };
  }

  scheduleSave() {
    if (!this.file || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 300);
    if (this.saveTimer.unref) this.saveTimer.unref();
  }

  flush() {
    if (!this.file) return;
    const data = { trips: {} };
    for (const [id, t] of this.trips) data.trips[id] = { ops: t.ops, code: t.code, created: t.created };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { SyncStore, SyncError, TRIP_ID, CODE, BLOB_ID };
