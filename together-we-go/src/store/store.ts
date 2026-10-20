/**
 * The one store for the whole app (the "model" in MVVM): zustand for state + actions, immer for safe
 * nested updates, and AsyncStorage persistence so everything keeps working offline.
 * The actions are grouped into slices (see ./slices); this file only puts them together.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { layoutAnswers, layoutOf } from '@/data/layouts';

import { DEMO_TRIP_IDS } from './seed';
import { createAppSlice } from './slices/app';
import { createAuthSlice } from './slices/auth';
import { createBudgetSlice } from './slices/budget';
import { createDemoSlice } from './slices/demo';
import { createFilesSlice } from './slices/files';
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
      ...createFilesSlice(...a),
      ...createDemoSlice(...a),
      ...createAppSlice(...a),
    })),
    {
      name: 'togetherwego-v1',
      version: 4,
      // v2: "Amalfi Squad" replaced the Tokyo trip as the main demo — re-seed the demo trips once, keep the user's own.
      // v3: a calmer Home — the "Nearby radius" block starts switched off. Only people who never changed the Home sections get it switched off.
      // v4: the new Home (Up next, Weather, Budget, Crew, Play...) with an order and a layout: "glance" became "weather", the quick tiles went away,
      //     and what the person had switched on or off is kept.
      migrate: (persisted, version) => {
        let old = persisted as Partial<AppStore>;
        if (version < 2) {
          old = { ...old, seeded: false, activeTripId: null, trips: (old.trips ?? []).filter((t) => !DEMO_TRIP_IDS.includes(t.id)) };
        }
        const sections = old.personal?.sections;
        if (version < 3 && old.personal && sections && Object.values(sections).every(Boolean)) {
          old = { ...old, personal: { ...old.personal, sections: { ...sections, nearby: false } } };
        }
        if (version < 4 && old.personal) {
          const { glance, budget, upnext, forYou, nearby, discover } = (old.personal.sections ?? {}) as Record<string, boolean | undefined>;
          const planner = layoutAnswers('planner');
          const sections = { ...planner.sections, weather: glance ?? true, budget: budget ?? true, upnext: upnext ?? true, forYou: forYou ?? true, nearby: nearby ?? false, discover: discover ?? true };
          old = { ...old, personal: { ...old.personal, sections, order: planner.order, layout: layoutOf({ order: planner.order, sections }), effects: 'lively', triviaReminder: false } };
        }
        return old as AppStore;
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
