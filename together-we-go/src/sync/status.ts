import { create } from 'zustand';

import type { SyncStatus } from './engine';

/** What the screens show about syncing. The engine writes to it; screens only read. */
export const useSyncStatus = create<SyncStatus>(() => ({ online: null, pending: 0, peers: 0, lastSyncAt: null, error: null, shared: [] }));
