/**
 * App-wide state: onboarding, settings, personalization, bucket list, favourites, notifications and cached weather/rates.
 */
import { uid } from '@/utils/format';

import type { AppNotification, BucketItem, RatesSnapshot, Settings, WeatherSnapshot, Personal } from '../types';
import { initialAuth } from './auth';
import { initialDemo } from './demo';
import { initialTrips } from './trips';
import type { Slice } from './types';

export const defaultSettings: Settings = {
  language: 'en',
  homeCurrency: 'USD',
  notificationsEnabled: true,
  reminderLeadMin: 30,
  textScale: 1,
  showTripTime: true,
  aiMode: 'offline',
  haptics: true,
};

export const defaultPersonal: Personal = {
  done: false,
  nickname: '',
  emoji: '✈️',
  interests: [],
  travelStyle: 'balanced',
  budgetStyle: 'mid',
  sections: { glance: true, budget: true, upnext: true, quick: true, forYou: true, nearby: false, discover: true },
  motion: true,
};

export interface AppSlice {
  hydrated: boolean;
  hasOnboarded: boolean;
  bucket: BucketItem[];
  favorites: string[];
  notifications: AppNotification[];
  settings: Settings;
  weather: Record<string, WeatherSnapshot>;
  rates: RatesSnapshot | null;
  quizBest: number;
  surveyResult: string[] | null;
  personal: Personal;
  restyled: boolean;
  firedReminders: Record<string, number>;
  setHydrated: () => void;
  completeOnboarding: () => void;
  addBucket: (text: string, destinationId?: string) => void;
  toggleBucket: (id: string) => void;
  deleteBucket: (id: string) => void;
  toggleFavorite: (destinationId: string) => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'ts' | 'read'>) => void;
  markAllRead: () => void;
  markKindRead: (kind: AppNotification['kind']) => void;
  clearNotifications: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setWeather: (w: WeatherSnapshot) => void;
  setRates: (r: RatesSnapshot) => void;
  setQuizBest: (n: number) => void;
  setSurveyResult: (ids: string[] | null) => void;
  updatePersonal: (patch: Partial<Personal>) => void;
  setRestyled: (v: boolean) => void;
  setToured: (v: boolean) => void;
  markReminderFired: (key: string) => void;
  resetEverything: () => void;
}

/** Starting values, also used by "reset everything". */
export const initialApp = {
  hydrated: false,
  hasOnboarded: false,
  bucket: [],
  favorites: ['tokyo', 'kyoto'],
  notifications: [],
  settings: defaultSettings,
  weather: {},
  rates: null,
  quizBest: 0,
  surveyResult: null,
  personal: defaultPersonal,
  restyled: false,
  firedReminders: {},
};

export const createAppSlice: Slice<AppSlice> = (set) => {
  return {
    ...initialApp,
    setHydrated: () => set({ hydrated: true }),

    completeOnboarding: () => set({ hasOnboarded: true }),

    addBucket: (text, destinationId) =>
      set((s) => {
        s.bucket.unshift({ id: uid('b-'), text: text.trim(), destinationId, done: false, addedAt: Date.now() });
      }),

    toggleBucket: (id) =>
      set((s) => {
        const b = s.bucket.find((x) => x.id === id);
        if (b) b.done = !b.done;
      }),

    deleteBucket: (id) =>
      set((s) => {
        s.bucket = s.bucket.filter((x) => x.id !== id);
      }),

    toggleFavorite: (destinationId) =>
      set((s) => {
        s.favorites = s.favorites.includes(destinationId)
          ? s.favorites.filter((x) => x !== destinationId)
          : [...s.favorites, destinationId];
      }),

    pushNotification: (n) =>
      set((s) => {
        s.notifications.unshift({ ...n, id: uid('n-'), ts: Date.now(), read: false });
        if (s.notifications.length > 60) s.notifications.length = 60;
      }),

    markAllRead: () =>
      set((s) => {
        s.notifications.forEach((n) => (n.read = true));
      }),

    markKindRead: (kind) =>
      set((s) => {
        s.notifications.forEach((n) => {
          if (n.kind === kind) n.read = true;
        });
      }),

    clearNotifications: () => set({ notifications: [] }),

    updateSettings: (patch) =>
      set((s) => {
        Object.assign(s.settings, patch);
      }),

    setWeather: (w) =>
      set((s) => {
        s.weather[w.destinationId] = w;
      }),

    setRates: (r) => set({ rates: r }),

    setQuizBest: (n) => set((s) => ({ quizBest: Math.max(s.quizBest, n) })),

    setSurveyResult: (ids) => set({ surveyResult: ids }),

    updatePersonal: (patch) =>
      set((s) => {
        Object.assign(s.personal, patch);
      }),

    setRestyled: (v) => set({ restyled: v }),

    setToured: (v) =>
      set((s) => {
        s.personal.toured = v;
      }),

    markReminderFired: (key) =>
      set((s) => {
        s.firedReminders[key] = Date.now();
      }),

    resetEverything: () =>
      set(() => ({ ...initialAuth,
        ...initialTrips,
        ...initialDemo,
        ...initialApp, hydrated: true, hasOnboarded: true })),
  };
};
