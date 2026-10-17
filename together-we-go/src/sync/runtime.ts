/**
 * Starts the sync engine for the real app and wires it to the store, the saved state, the server address and
 * the app lifecycle (it pauses in the background and resumes when you come back).
 */
import { AppState } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import { storeAdapter } from './adapter';
import { SyncEngine } from './engine';
import { notifyRemoteChange } from './notify';
import { effectiveServerUrl } from './prefs';
import { useSyncStatus } from './status';
import { asyncStorageMeta } from './storage';
import { createHttpTransport, type SyncTransport } from './transport';

let engine: SyncEngine | null = null;
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
    onStatus: (status) => useSyncStatus.setState(status),
    onRemoteChange: (prev, next) => notifyRemoteChange(prev, next, useAppStore.getState().session?.userId),
  });
  return engine;
}

/** Call once when the app is ready. Safe to call again. */
export function startSync(): Promise<void> {
  ready ??= (async () => {
    const e = getEngine();
    await e.init();
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
