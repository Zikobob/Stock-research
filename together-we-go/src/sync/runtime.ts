/**
 * Starts the sync engine for the real app and wires it to the store, the saved state, the server address and
 * the app lifecycle (it pauses in the background and resumes when you come back).
 */
import { AppState } from 'react-native';

import { toast } from '@/components/ui/feedback';
import { useAppStore } from '@/store/useAppStore';

import { storeAdapter } from './adapter';
import { BlobSync } from './blobs';
import { blobCache, useFileStatus } from './blobCache';
import { SyncEngine } from './engine';
import { deviceFiles } from './fileio';
import { newNodeId } from './hlc';
import { notifyRemoteChange } from './notify';
import { effectiveServerUrl, useSyncPrefs } from './prefs';
import { secureRandom } from './secureRandom';
import { useSyncStatus } from './status';
import { asyncStorageMeta } from './storage';
import { createHttpTransport, type SyncTransport } from './transport';

let engine: SyncEngine | null = null;
let blobSync: BlobSync | null = null;
let ready: Promise<void> | null = null;
let cached: { url: string; transport: SyncTransport } | null = null;

function currentTransport(): SyncTransport | null {
  const url = effectiveServerUrl();
  if (!url) return null;
  if (cached?.url !== url) cached = { url, transport: createHttpTransport(url) };
  return cached.transport;
}

export function getEngine(): SyncEngine {
  engine ??= new SyncEngine({
    store: storeAdapter,
    storage: asyncStorageMeta,
    getTransport: currentTransport,
    random: secureRandom,
    onStatus: (status) => useSyncStatus.setState(status),
    onRemoteChange: (prev, next) => notifyRemoteChange(prev, next, useAppStore.getState().session?.userId),
  });
  return engine;
}

/** Sends your photos, documents and receipts to the server and fetches your friends' ones. */
export function getBlobSync(): BlobSync {
  blobSync ??= new BlobSync({
    trips: () => useAppStore.getState().trips,
    remoteId: (tripId) => getEngine().remoteId(tripId),
    baseUrl: effectiveServerUrl,
    files: deviceFiles,
    cache: blobCache,
    attach: (tripId, list, itemId, blobId) => useAppStore.getState().attachBlob(tripId, list, itemId, blobId),
    newId: () => newNodeId(secureRandom),
    onNotice: (message) => toast(message, { tone: 'warn', icon: 'alert-circle-outline' }),
    onPending: (pending) => useFileStatus.setState({ pending }),
  });
  return blobSync;
}

/** Call once when the app is ready. Safe to call again. */
export function startSync(): Promise<void> {
  ready ??= (async () => {
    const e = getEngine();
    await e.init();
    const files = getBlobSync();
    useAppStore.subscribe(() => files.schedule()); // a new photo here, or a friend's change that mentions a file
    useSyncPrefs.subscribe(() => files.schedule());
    useSyncStatus.subscribe((now, before) => {
      if (now.online && !before.online) files.schedule(0); // the connection came back
    });
    files.schedule(1000);
    if (AppState.currentState === 'active') e.start();
    AppState.addEventListener('change', (state) => {
      if (state === 'active') e.start();
      else if (state === 'background') e.stop();
    });
  })();
  return ready;
}

/** Waits for the engine to be loaded (used before sharing or joining). */
export async function syncReady(): Promise<SyncEngine> {
  await startSync();
  return getEngine();
}
