/**
 * Public entry point for app state. Screens import from here:
 *   import { useAppStore, useActiveTrip, balances } from '@/store/useAppStore';
 * The pieces live in ./store (the store itself), ./slices (the actions), ./selectors (reading helpers)
 * and utils/money (expense maths).
 */
export { useAppStore, type AppStore } from './store';
export { memberById, tripStatus, useActiveTrip, useCurrentUser, useMyTrips } from './selectors';
export { defaultPersonal } from './slices/app';
export { balances, settlePlan, totalSpent } from '@/utils/money';
