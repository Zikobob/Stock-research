import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MetaStorage, SyncMeta } from './engine';

const KEY = 'togetherwego-sync-v1';

/** Keeps the sync engine's memory (what it has merged, what it has not sent yet) on the phone. */
export const asyncStorageMeta: MetaStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as SyncMeta) : null;
    } catch {
      return null;
    }
  },
  async save(meta) {
    await AsyncStorage.setItem(KEY, JSON.stringify(meta));
  },
};
