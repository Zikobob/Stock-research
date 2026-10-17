import { useAppStore } from '@/store/useAppStore';

import type { StoreAdapter } from './engine';

/** Lets the sync engine read and write trips in the app's store. */
export const storeAdapter: StoreAdapter = {
  getTrip: (id) => useAppStore.getState().trips.find((t) => t.id === id),
  getUserId: () => useAppStore.getState().session?.userId,
  setTrip: (trip) => {
    const { trips } = useAppStore.getState();
    useAppStore.setState({ trips: trips.map((t) => (t.id === trip.id ? trip : t)) });
  },
  addTrip: (trip) => {
    const { trips } = useAppStore.getState();
    useAppStore.setState({ trips: [trip, ...trips.filter((t) => t.id !== trip.id)], activeTripId: trip.id });
  },
  subscribe: (listener) => useAppStore.subscribe(() => listener()),
};
