/** Talking to the sync server over plain HTTP (see server/index.js). */
import type { Op } from './crdt';

export interface PullResult {
  ops: Op[];
  /** Position to ask from next time. */
  seq: number;
  /** How many changes the server holds in total (more than `seq` means there is another page). */
  total: number;
  /** How many phones talked to the server about this trip in the last minute. */
  peers: number;
}

export interface SyncTransport {
  /** Invite code to the trip's server id, or null when no trip has that code. */
  lookup(code: string): Promise<string | null>;
  push(tripId: string, code: string | undefined, client: string, ops: Op[]): Promise<{ seq: number }>;
  /** Fetches changes after `since`. With `waitMs` the server holds the request until something new arrives. */
  pull(tripId: string, since: number, client: string, waitMs: number, signal?: AbortSignal): Promise<PullResult>;
}

/** The server could not be reached (wrong address, wifi off, server not running). */
export class NetworkError extends Error {}
/** The server answered with an error. */
export class ServerError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const HOST = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;

/**
 * "192.168.1.5:8787" or "http://192.168.1.5:8787/" -> "http://192.168.1.5:8787". Returns null if it cannot be an address.
 * The phone's built-in URL class is much looser than a browser's (it accepts spaces in a host name), so the host is checked here too.
 */
export function normalizeServerUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  url = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, (scheme) => scheme.toLowerCase()) : `http://${url}`;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol) || !HOST.test(parsed.hostname)) return null;
    if (!/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(parsed.host)) return null;
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}`;
  } catch {
    return null;
  }
}

export interface HttpTransportOptions {
  /** How long a request may take before we give up on the server (ms). Waiting requests get extra time on top. */
  timeoutMs?: number;
  /** Looking up an invite code is quick on a home network, so it gives up sooner (a server that is not there should not stall "Join"). */
  lookupTimeoutMs?: number;
}

export function createHttpTransport(serverUrl: string, fetchImpl: typeof fetch = fetch, options: HttpTransportOptions = {}): SyncTransport {
  const base = serverUrl.replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? 8000;
  const lookupTimeoutMs = options.lookupTimeoutMs ?? 3000;

  /** One request with a time limit, so a wifi that silently drops packets cannot freeze "Join" for a minute. */
  async function request<T>(path: string, init?: RequestInit & { signal?: AbortSignal }, extraMs = 0, limitMs = timeoutMs): Promise<{ status: number; data: T }> {
    const limit = new AbortController();
    const outer = init?.signal;
    const cancel = () => limit.abort();
    outer?.addEventListener('abort', cancel);
    const timer = setTimeout(cancel, limitMs + extraMs);
    try {
      let res: Response;
      try {
        res = await fetchImpl(base + path, { ...init, signal: limit.signal });
      } catch (e) {
        if (outer?.aborted) throw e; // the app cancelled this request on purpose
        throw new NetworkError(limit.signal.aborted ? 'The sync server took too long to answer' : e instanceof Error ? e.message : 'Network request failed');
      }
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // an empty or non-JSON body is handled below
      }
      return { status: res.status, data: data as T };
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', cancel);
    }
  }

  const fail = (status: number, data: unknown): never => {
    const message = (data as { error?: string } | null)?.error ?? `Server answered ${status}`;
    throw new ServerError(status, message);
  };

  return {
    async lookup(code) {
      const { status, data } = await request<{ tripId: string }>(`/v1/codes/${encodeURIComponent(code)}`, undefined, 0, lookupTimeoutMs);
      if (status === 404) return null;
      if (status !== 200) fail(status, data);
      return data.tripId;
    },
    async push(tripId, code, client, ops) {
      const { status, data } = await request<{ seq: number }>(`/v1/trips/${tripId}/ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client, ops }),
      });
      if (status !== 200) fail(status, data);
      return data;
    },
    async pull(tripId, since, client, waitMs, signal) {
      const { status, data } = await request<PullResult>(`/v1/trips/${tripId}/ops?since=${since}&wait=${waitMs}&client=${client}`, { signal }, waitMs);
      if (status !== 200) fail(status, data);
      return data;
    },
  };
}
