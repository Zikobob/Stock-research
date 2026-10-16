import type { StateCreator } from 'zustand';

import type { AppSlice } from './app';
import type { AuthSlice } from './auth';
import type { BudgetSlice } from './budget';
import type { DemoSlice } from './demo';
import type { GroupToolsSlice } from './groupTools';
import type { ItinerarySlice } from './itinerary';
import type { SocialSlice } from './social';
import type { TripsSlice } from './trips';

/** Everything in the store: each slice contributes its own state and actions. */
export type AppStore = AuthSlice & TripsSlice & ItinerarySlice & BudgetSlice & GroupToolsSlice & SocialSlice & DemoSlice & AppSlice;

/** A slice is a function that gets `set` / `get` and returns its piece of state plus the actions that change it. */
export type Slice<T> = StateCreator<AppStore, [['zustand/persist', unknown], ['zustand/immer', never]], [], T>;
export type SliceSet = Parameters<Slice<object>>[0];
export type SliceGet = Parameters<Slice<object>>[1];
