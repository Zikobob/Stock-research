/**
 * The one store for the whole app (the "model" in MVVM): zustand for state + actions, immer for safe
 * nested updates, and AsyncStorage persistence so everything keeps working offline.
 * The actions are grouped into slices (see ./slices); this file only puts them together.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createAppSlice } from './slices/app';
import { createAuthSlice } from './slices/auth';
import { createBudgetSlice } from './slices/budget';
import { createDemoSlice } from './slices/demo';
import { createGroupToolsSlice } from './slices/groupTools';
import { createItinerarySlice } from './slices/itinerary';
import { createSocialSlice } from './slices/social';
import { createTripsSlice } from './slices/trips';
import type { AppStore } from './slices/types';

export type { AppStore };

export const useAppStore = create<AppStore>()(
  persist(
    immer((...a) => ({
      ...createAuthSlice(...a),
      ...createTripsSlice(...a),
      ...createItinerarySlice(...a),
      ...createBudgetSlice(...a),
      ...createGroupToolsSlice(...a),
      ...createSocialSlice(...a),
      ...createDemoSlice(...a),
      ...createAppSlice(...a),
    })),
    {
      name: 'togetherwego-v1',
      version: 2,
      // v2: "Amalfi Squad" replaced the Tokyo trip as the main demo — re-seed the demo trips once, keep the user's own.
      migrate: (persisted, version) => {
        const old = persisted as Partial<AppStore>;
        if (version >= 2) return old as AppStore;
        const demoIds = ['trip-tokyo', 'trip-bali', 'trip-bcn', 'trip-amalfi'];
        return { ...old, seeded: false, activeTripId: null, trips: (old.trips ?? []).filter((t) => !demoIds.includes(t.id)) } as AppStore;
      },
      // New settings added in later versions fall back to their defaults instead of vanishing.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppStore>;
        return { ...current, ...p, personal: { ...current.personal, ...p.personal, sections: { ...current.personal.sections, ...p.personal?.sections } } } as AppStore;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        // Don't persist the session unless "Remember me" was ticked.
        const { hydrated, ...rest } = s;
        void hydrated;
        return { ...rest, session: s.session?.remember || s.restyled ? s.session : null };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
