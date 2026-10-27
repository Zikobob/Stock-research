import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BlobCache } from './blobs';

interface BlobCacheState {
  /** Server file id -> where this phone keeps its copy. */
  files: Record<string, string>;
  /** Items that cannot be shared, so the app does not complain about them every time it opens. */
  rejected: Record<string, true>;
  setFile: (blobId: string, uri: string) => void;
  reject: (key: string) => void;
  clear: () => void;
}

/**
 * What this phone has downloaded. Saved between runs, except in the web preview, where a copy is a temporary
 * address that stops working when the page closes (so it is fetched again next time).
 */
export const useBlobCache = create<BlobCacheState>()(
  persist(
    (set) => ({
      files: {},
      rejected: {},
      setFile: (blobId, uri) => set((s) => ({ files: { ...s.files, [blobId]: uri } })),
      reject: (key) => set((s) => ({ rejected: { ...s.rejected, [key]: true } })),
      clear: () => set({ files: {}, rejected: {} }),
    }),
    {
      name: 'togetherwego-files',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ files: Platform.OS === 'web' ? {} : s.files, rejected: s.rejected }),
    },
  ),
);

/** The same cache, in the shape the file syncing code asks for. */
export const blobCache: BlobCache = {
  get: (blobId) => useBlobCache.getState().files[blobId],
  set: (blobId, uri) => useBlobCache.getState().setFile(blobId, uri),
  isRejected: (key) => !!useBlobCache.getState().rejected[key],
  reject: (key) => useBlobCache.getState().reject(key),
};

/** How many files are still waiting to be sent or fetched (for a small "syncing files" hint). */
export const useFileStatus = create<{ pending: number }>(() => ({ pending: 0 }));
