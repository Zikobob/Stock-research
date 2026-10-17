/** The few things screens ask the sync engine to do: share a trip, join one, test the server. */
import { useAppStore } from '@/store/useAppStore';

import { useBlobCache } from './blobCache';
import { CodeTakenError } from './engine';
import { deleteSharedFiles } from './fileio';
import { SERVER_PORT, effectiveServerUrl } from './prefs';
import { syncReady } from './runtime';
import { NetworkError, ServerError, normalizeServerUrl } from './transport';

export type JoinOutcome = { ok: true; tripId: string; synced: boolean; offlineCopy: boolean } | { ok: false; error: string };

/**
 * Joins a trip by invite code. If a sync server is set, its shared trip is downloaded first, so everyone ends up
 * in the same trip. If the server is not reachable (or does not know the code) the code is tried on this phone,
 * which is how the demo trips and offline use keep working.
 */
export async function joinTripAnywhere(code: string): Promise<JoinOutcome> {
  let unreachable = false;
  if (effectiveServerUrl()) {
    try {
      const engine = await syncReady();
      if (await engine.join(code)) {
        const r = useAppStore.getState().joinTrip(code); // adds this person to the trip we just downloaded
        return r.ok ? { ok: true, tripId: r.tripId, synced: true, offlineCopy: false } : { ok: false, error: r.error };
      }
    } catch (e) {
      if (e instanceof ServerError && e.status === 429) return { ok: false, error: e.message };
      unreachable = e instanceof NetworkError;
    }
  }
  const r = useAppStore.getState().joinTrip(code);
  return r.ok ? { ok: true, tripId: r.tripId, synced: false, offlineCopy: unreachable } : { ok: false, error: r.error };
}

export type ShareOutcome = { ok: true } | { ok: false; reason: 'no-server' | 'code-taken' | 'network' | 'error'; message: string };

/** Starts sharing a trip with other phones. */
export async function shareTrip(tripId: string): Promise<ShareOutcome> {
  const url = effectiveServerUrl();
  if (!url) return { ok: false, reason: 'no-server', message: 'Set the sync server address first (Settings → Sync across phones).' };
  try {
    const engine = await syncReady();
    await engine.share(tripId);
    engine.start();
    return { ok: true };
  } catch (e) {
    if (e instanceof CodeTakenError) return { ok: false, reason: 'code-taken', message: e.message };
    if (e instanceof NetworkError) return { ok: false, reason: 'network', message: `Can’t reach the sync server at ${url}. Is it running, and are you on the same wifi?` };
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Something went wrong' };
  }
}

/** Stops syncing a trip on this phone. It stays as a normal trip. */
export async function stopSharing(tripId: string): Promise<void> {
  (await syncReady()).detach(tripId);
}

/** Forgets all sync state (used when the app's data is reset). */
export async function resetSync(): Promise<void> {
  await (await syncReady()).reset();
  useBlobCache.getState().clear();
  deleteSharedFiles();
}

export type ConnectionTest = { ok: true; trips: number } | { ok: false; message: string };

/** Asks a server address "are you there?" with a short time limit. */
export async function testServer(input: string, fetchImpl: typeof fetch = fetch): Promise<ConnectionTest> {
  const url = normalizeServerUrl(input);
  if (!url) return { ok: false, message: `That doesn’t look like an address. Try something like 192.168.1.20:${SERVER_PORT}` };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetchImpl(`${url}/health`, { signal: controller.signal });
    if (!res.ok) return { ok: false, message: `The address answered, but not like the sync server (error ${res.status}).` };
    const data = (await res.json()) as { ok?: boolean; trips?: number };
    return data.ok ? { ok: true, trips: data.trips ?? 0 } : { ok: false, message: 'The address answered, but it is not the TogetherWeGo sync server.' };
  } catch {
    return { ok: false, message: `Couldn’t reach ${url}. Check that the server is running (npm run server) and that this phone is on the same wifi.` };
  } finally {
    clearTimeout(timer);
  }
}
