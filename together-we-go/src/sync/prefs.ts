import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { normalizeServerUrl } from './transport';

/** The port the sync server listens on (see server/index.js). */
export const SERVER_PORT = 8787;

interface SyncPrefs {
  /** What the user typed in Settings. Empty means "use the automatic guess". */
  serverUrl: string;
  setServerUrl: (url: string) => void;
}

export const useSyncPrefs = create<SyncPrefs>()(
  persist(
    (set) => ({
      serverUrl: '',
      setServerUrl: (serverUrl) => set({ serverUrl }),
    }),
    { name: 'togetherwego-sync-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * While developing, the sync server runs on the same computer as Expo, so the phone can work out its address
 * from the Expo address it already used. Returns null when that is not possible (a published app, a tunnel...).
 */
export function guessServerUrl(): string | null {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    const { protocol, hostname } = window.location;
    return hostname === 'localhost' || IPV4.test(hostname) ? `${protocol}//${hostname}:${SERVER_PORT}` : null;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host && IPV4.test(host) ? `http://${host}:${SERVER_PORT}` : null;
}

/** The address the app will use: what the user typed, or else the automatic guess. */
export function effectiveServerUrl(): string | null {
  return normalizeServerUrl(useSyncPrefs.getState().serverUrl) ?? guessServerUrl();
}

/** The address to put in an invite. "localhost" only means something on the computer that runs the server, so it is left out. */
export function serverForInvites(): string | null {
  const url = effectiveServerUrl();
  return url && !/^https?:\/\/(localhost|127\.\d+\.\d+\.\d+)(:|$)/i.test(url) ? url : null;
}
