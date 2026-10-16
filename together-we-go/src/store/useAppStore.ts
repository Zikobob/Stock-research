/**
 * Single source of truth for the app (MVVM "model" layer).
 * - zustand for state + actions, immer for safe nested updates
 * - persisted to AsyncStorage so everything works offline
 * - passwords are salted + PBKDF2 hashed (see utils/password.ts), never stored in plain text
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { destinationById } from '@/data/destinations';
import type { Role } from '@/data/reference';
import { uid } from '@/utils/format';
import { hashPassword, verifyPassword } from '@/utils/password';
import { daysBetween, todayInTz } from '@/utils/time';
import { EMAIL_RE } from '@/utils/validation';

import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  buildDemoTrip,
  buildSecondaryTrips,
  directoryTrips,
  inviteCodeFor,
  type DemoTimeline,
} from './seed';
import type {
  Personal,
  Account,
  Activity,
  AppNotification,
  BucketItem,
  ChatMessage,
  Expense,
  Flight,
  Member,
  PackingItem,
  Photo,
  Poll,
  RatesSnapshot,
  Settings,
  Trip,
  TripDoc,
  TripStatus,
  WeatherSnapshot,
} from './types';

type Result = { ok: true } | { ok: false; error: string };

interface Session {
  userId: string;
  remember: boolean;
}

interface State {
  hydrated: boolean;
  hasOnboarded: boolean;
  session: Session | null;
  accounts: Account[];
  trips: Trip[];
  activeTripId: string | null;
  bucket: BucketItem[];
  favorites: string[];
  notifications: AppNotification[];
  settings: Settings;
  weather: Record<string, WeatherSnapshot>;
  rates: RatesSnapshot | null;
  quizBest: number;
  surveyResult: string[] | null;
  personal: Personal;
  /** Set just before the app reloads to apply a new look: keeps the session for that one restart. */
  restyled: boolean;
  firedReminders: Record<string, number>;
  demoTimeline: DemoTimeline;
  seeded: boolean;
}

interface Actions {
  setHydrated: () => void;
  ensureSeed: () => Promise<void>;
  completeOnboarding: () => void;

  signIn: (email: string, password: string, remember: boolean) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  signInWithGoogle: (email: string, name: string) => Promise<Result>;
  signOut: () => void;
  accountExists: (email: string) => boolean;
  resetPassword: (email: string, newPassword: string) => Promise<Result>;
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'homeCity' | 'avatar'>>) => void;

  setActiveTrip: (id: string) => void;
  createTrip: (t: { name: string; destinationId: string; startDate: string; endDate: string; budget: number }) => string;
  joinTrip: (code: string) => { ok: true; tripId: string } | { ok: false; error: string };
  leaveTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => void;
  updateTrip: (tripId: string, patch: Partial<Pick<Trip, 'name' | 'startDate' | 'endDate' | 'budget' | 'completed' | 'cover' | 'destinationId' | 'extraDestinationIds'>>) => void;
  regenerateInvite: (tripId: string) => void;
  reseedDemo: (timeline: DemoTimeline) => void;

  addMember: (tripId: string, name: string, email?: string) => void;
  removeMember: (tripId: string, memberId: string) => void;
  setRole: (tripId: string, memberId: string, role: Role) => void;

  addActivity: (tripId: string, a: Omit<Activity, 'id' | 'createdBy' | 'votes'> & { votes?: Activity['votes'] }) => string;
  updateActivity: (tripId: string, id: string, patch: Partial<Activity>) => void;
  deleteActivity: (tripId: string, id: string) => void;
  voteActivity: (tripId: string, id: string, value: 1 | -1) => void;
  toggleAssign: (tripId: string, id: string, memberId: string) => void;

  addExpense: (tripId: string, e: Omit<Expense, 'id'>) => void;
  deleteExpense: (tripId: string, id: string) => void;
  settleUp: (tripId: string, from: string, to: string, amount: number) => void;

  addFlight: (tripId: string, f: Omit<Flight, 'id'>) => void;
  deleteFlight: (tripId: string, id: string) => void;

  createPoll: (tripId: string, question: string, options: string[]) => void;
  votePoll: (tripId: string, pollId: string, optionId: string) => void;
  closePoll: (tripId: string, pollId: string) => void;
  deletePoll: (tripId: string, pollId: string) => void;

  addTask: (tripId: string, text: string, assignee?: string) => void;
  toggleTask: (tripId: string, id: string) => void;
  deleteTask: (tripId: string, id: string) => void;
  assignTask: (tripId: string, id: string, memberId?: string) => void;

  addDoc: (tripId: string, d: Omit<TripDoc, 'id' | 'addedAt' | 'addedBy'>) => void;
  deleteDoc: (tripId: string, id: string) => void;

  sendMessage: (tripId: string, msg: Omit<ChatMessage, 'id' | 'ts'> & { ts?: number }) => void;
  clearChat: (tripId: string) => void;

  addPhoto: (tripId: string, p: Omit<Photo, 'id' | 'ts' | 'likes' | 'by'>) => void;
  toggleLikePhoto: (tripId: string, id: string) => void;
  deletePhoto: (tripId: string, id: string) => void;

  togglePacked: (tripId: string, id: string) => void;
  assignPacking: (tripId: string, id: string, memberId?: string) => void;
  addPackingItems: (tripId: string, items: Omit<PackingItem, 'id' | 'packed'>[]) => void;
  deletePackingItem: (tripId: string, id: string) => void;

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

export type AppStore = State & Actions;

const defaultSettings: Settings = {
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
  sections: { glance: true, budget: true, upnext: true, quick: true, forYou: true, nearby: true, discover: true },
  motion: true,
};

const initialState: State = {
  hydrated: false,
  hasOnboarded: false,
  session: null,
  accounts: [],
  trips: [],
  activeTripId: null,
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
  demoTimeline: 'upcoming',
  seeded: false,
};

function seedBucket(): BucketItem[] {
  const now = Date.now();
  return [
    { id: uid('b-'), text: 'See the northern lights in Iceland', destinationId: 'iceland', done: false, addedAt: now - 9e7 },
    { id: uid('b-'), text: 'Sunrise at Machu Picchu', destinationId: 'machu-picchu', done: false, addedAt: now - 8e7 },
    { id: uid('b-'), text: 'Eat street tacos in Mexico City', destinationId: 'mexico-city', done: false, addedAt: now - 7e7 },
    { id: uid('b-'), text: 'Watch the sunset in Oia, Santorini', destinationId: 'santorini', done: false, addedAt: now - 6e7 },
    { id: uid('b-'), text: 'Tapas crawl in Barcelona', destinationId: 'barcelona', done: true, addedAt: now - 5e7 },
  ];
}

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    { id: uid('n-'), kind: 'vote', title: 'New poll from Sam', body: 'Beach day — which beach? Cast your vote.', ts: now - 600 * 60000, read: false, tripId: 'trip-amalfi', route: '/crew' },
    { id: uid('n-'), kind: 'expense', title: 'Diego added an expense', body: 'Dinner deposits & groceries · $86 split 4 ways', ts: now - 420 * 60000, read: false, tripId: 'trip-amalfi', route: '/(tabs)/budget' },
    { id: uid('n-'), kind: 'chat', title: 'Diego in Amalfi Squad', body: 'Dinner tonight at 7, I reserved for 4 🍝', ts: now - 42 * 60000, read: false, tripId: 'trip-amalfi', route: '/(tabs)/chat' },
  ];
}

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => {
      /** Mutates a trip in place (immer draft) if it exists. */
      const withTrip = (tripId: string, fn: (t: Trip, s: State) => void) =>
        set((s) => {
          const t = s.trips.find((x) => x.id === tripId);
          if (t) fn(t, s);
        });
      const me = () => get().session?.userId ?? DEMO_USER_ID;

      return {
        ...initialState,

        setHydrated: () => set({ hydrated: true }),

        ensureSeed: async () => {
          if (get().seeded) return;
          const salt = Crypto.randomUUID();
          const passwordHash = await hashPassword(DEMO_PASSWORD, salt);
          const demo: Account = { id: DEMO_USER_ID, name: 'Maya Chen', email: DEMO_EMAIL, passwordHash, salt, avatar: 'avatar-maya', homeCity: 'New York', provider: 'password' };
          set((s) => {
            if (s.seeded) return;
            s.accounts = [demo, ...s.accounts.filter((a) => a.email !== DEMO_EMAIL)];
            s.trips = [buildDemoTrip('upcoming'), ...buildSecondaryTrips(), ...s.trips];
            s.activeTripId = 'trip-amalfi';
            s.bucket = seedBucket();
            s.notifications = seedNotifications();
            s.seeded = true;
          });
        },

        completeOnboarding: () => set({ hasOnboarded: true }),

        signIn: async (email, password, remember) => {
          const acct = get().accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
          if (!acct) return { ok: false, error: 'No account found with that email. Try Sign Up instead.' };
          if (acct.provider === 'google' && !acct.passwordHash) return { ok: false, error: 'This account uses Google sign-in.' };
          const check = await verifyPassword(password, acct);
          if (!check.ok) return { ok: false, error: 'Incorrect password. Please try again.' };
          set((s) => {
            // Old accounts used a single SHA-256 round: quietly move them to the stronger hash.
            if (check.upgrade) {
              const mine = s.accounts.find((a) => a.id === acct.id);
              if (mine) mine.passwordHash = check.upgrade;
            }
            s.session = { userId: acct.id, remember };
            const mine = s.trips.find((t) => t.members.some((m) => m.id === acct.id));
            if (!s.trips.find((t) => t.id === s.activeTripId && t.members.some((m) => m.id === acct.id))) {
              s.activeTripId = mine?.id ?? null;
            }
          });
          return { ok: true };
        },

        signUp: async (name, email, password) => {
          const e = email.trim().toLowerCase();
          if (!EMAIL_RE.test(e)) return { ok: false, error: 'Enter a valid email address.' };
          if (get().accounts.some((a) => a.email.toLowerCase() === e)) {
            return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
          }
          const salt = Crypto.randomUUID();
          const passwordHash = await hashPassword(password, salt);
          const id = uid('u-');
          set((s) => {
            s.accounts.push({ id, name: name.trim(), email: e, passwordHash, salt, provider: 'password' });
            s.session = { userId: id, remember: true };
            s.activeTripId = null;
          });
          return { ok: true };
        },

        signInWithGoogle: async (email, name) => {
          const e = email.trim().toLowerCase();
          let acct = get().accounts.find((a) => a.email.toLowerCase() === e);
          if (!acct) {
            acct = { id: uid('u-'), name, email: e, passwordHash: '', salt: '', provider: 'google' };
            const created = acct;
            set((s) => {
              s.accounts.push(created);
            });
          }
          const id = acct.id;
          set((s) => {
            s.session = { userId: id, remember: true };
            const mine = s.trips.find((t) => t.members.some((m) => m.id === id));
            s.activeTripId = mine?.id ?? null;
          });
          return { ok: true };
        },

        signOut: () => set({ session: null }),

        accountExists: (email) => get().accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase()),

        resetPassword: async (email, newPassword) => {
          const e = email.trim().toLowerCase();
          if (!get().accounts.some((a) => a.email.toLowerCase() === e)) return { ok: false, error: 'No account found with that email.' };
          const salt = Crypto.randomUUID();
          const passwordHash = await hashPassword(newPassword, salt);
          set((s) => {
            const a = s.accounts.find((x) => x.email.toLowerCase() === e);
            if (a) {
              a.salt = salt;
              a.passwordHash = passwordHash;
              a.provider = 'password';
            }
          });
          return { ok: true };
        },

        updateProfile: (patch) =>
          set((s) => {
            const a = s.accounts.find((x) => x.id === s.session?.userId);
            if (!a) return;
            Object.assign(a, patch);
            for (const t of s.trips) {
              const m = t.members.find((x) => x.id === a.id);
              if (m) {
                if (patch.name) m.name = patch.name;
                if (patch.avatar !== undefined) m.avatar = patch.avatar;
                if (patch.homeCity !== undefined) m.homeCity = patch.homeCity;
              }
            }
          }),

        setActiveTrip: (id) => set({ activeTripId: id }),

        createTrip: ({ name, destinationId, startDate, endDate, budget }) => {
          const id = uid('trip-');
          const acct = get().accounts.find((a) => a.id === me());
          const dest = destinationById(destinationId);
          set((s) => {
            s.trips.unshift({
              id, name: name.trim(), destinationId, extraDestinationIds: [], startDate, endDate,
              cover: dest?.image ?? 'planning', budget, inviteCode: inviteCodeFor(dest?.city ?? name), ownerId: me(),
              members: [{ id: me(), name: acct?.name ?? 'You', email: acct?.email, avatar: acct?.avatar, role: 'Organizer', homeCity: acct?.homeCity }],
              activities: [], expenses: [], flights: [], polls: [], tasks: [
                { id: uid('t-'), text: 'Invite your travel group', done: false, assignee: me() },
                { id: uid('t-'), text: 'Agree on a budget', done: false },
                { id: uid('t-'), text: 'Add everyone’s flights', done: false },
              ], docs: [], photos: [], packing: [],
              messages: [{ id: uid('c-'), authorId: 'assistant', ai: true, aiSource: 'local', ts: Date.now(), text: `Welcome to ${name.trim()}! Share invite code to bring your group in, then ask me anything — budget, weather, food nearby or what to do next.` }],
              createdAt: Date.now(),
            });
            s.activeTripId = id;
          });
          return id;
        },

        joinTrip: (code) => {
          const c = code.trim().toUpperCase();
          const user = me();
          const acct = get().accounts.find((a) => a.id === user);
          const local = get().trips.find((t) => t.inviteCode === c);
          if (local) {
            if (local.members.some((m) => m.id === user)) {
              set({ activeTripId: local.id });
              return { ok: false, error: `You’re already in “${local.name}”.` };
            }
            set((s) => {
              const t = s.trips.find((x) => x.id === local.id)!;
              t.members.push({ id: user, name: acct?.name ?? 'New member', email: acct?.email, avatar: acct?.avatar, role: 'Member', homeCity: acct?.homeCity });
              t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${acct?.name ?? 'Someone'} joined the trip 👋`, ts: Date.now() });
              s.activeTripId = t.id;
            });
            return { ok: true, tripId: local.id };
          }
          const remote = directoryTrips().find((t) => t.inviteCode === c);
          if (!remote) return { ok: false, error: 'No trip found with that code. Check with your friend and try again.' };
          set((s) => {
            remote.members.push({ id: user, name: acct?.name ?? 'New member', email: acct?.email, avatar: acct?.avatar, role: 'Member', homeCity: acct?.homeCity });
            remote.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${acct?.name ?? 'Someone'} joined the trip 👋`, ts: Date.now() });
            s.trips.unshift(remote);
            s.activeTripId = remote.id;
          });
          return { ok: true, tripId: remote.id };
        },

        leaveTrip: (tripId) =>
          set((s) => {
            const t = s.trips.find((x) => x.id === tripId);
            if (!t) return;
            t.members = t.members.filter((m) => m.id !== s.session?.userId);
            if (s.activeTripId === tripId) {
              s.activeTripId = s.trips.find((x) => x.id !== tripId && x.members.some((m) => m.id === s.session?.userId))?.id ?? null;
            }
          }),

        deleteTrip: (tripId) =>
          set((s) => {
            s.trips = s.trips.filter((t) => t.id !== tripId);
            if (s.activeTripId === tripId) {
              s.activeTripId = s.trips.find((x) => x.members.some((m) => m.id === s.session?.userId))?.id ?? null;
            }
          }),

        updateTrip: (tripId, patch) => withTrip(tripId, (t) => Object.assign(t, patch)),

        regenerateInvite: (tripId) =>
          withTrip(tripId, (t) => {
            t.inviteCode = inviteCodeFor(destinationById(t.destinationId)?.city ?? t.name);
          }),

        reseedDemo: (timeline) =>
          set((s) => {
            const fresh = buildDemoTrip(timeline);
            s.trips = [fresh, ...s.trips.filter((t) => t.id !== fresh.id)];
            s.activeTripId = fresh.id;
            s.demoTimeline = timeline;
            s.firedReminders = {};
          }),

        addMember: (tripId, name, email) =>
          withTrip(tripId, (t) => {
            t.members.push({ id: uid('m-'), name: name.trim(), email: email?.trim() || undefined, role: 'Member', invited: true });
            t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `${name.trim()} was added to the trip`, ts: Date.now() });
          }),

        removeMember: (tripId, memberId) =>
          withTrip(tripId, (t) => {
            t.members = t.members.filter((m) => m.id !== memberId);
            t.activities.forEach((a) => {
              a.assigned = a.assigned.filter((x) => x !== memberId);
              delete a.votes[memberId];
            });
            t.tasks.forEach((k) => {
              if (k.assignee === memberId) k.assignee = undefined;
            });
          }),

        setRole: (tripId, memberId, role) =>
          withTrip(tripId, (t) => {
            const m = t.members.find((x) => x.id === memberId);
            if (m) m.role = role;
          }),

        addActivity: (tripId, a) => {
          const id = uid('a-');
          withTrip(tripId, (t) => {
            t.activities.push({ ...a, votes: a.votes ?? { [me()]: 1 }, id, createdBy: me() });
          });
          return id;
        },

        updateActivity: (tripId, id, patch) =>
          withTrip(tripId, (t) => {
            const a = t.activities.find((x) => x.id === id);
            if (a) Object.assign(a, patch);
          }),

        deleteActivity: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.activities = t.activities.filter((x) => x.id !== id);
          }),

        voteActivity: (tripId, id, value) =>
          withTrip(tripId, (t) => {
            const a = t.activities.find((x) => x.id === id);
            if (!a) return;
            const user = me();
            if (a.votes[user] === value) delete a.votes[user];
            else a.votes[user] = value;
            // Majority rule: a voting item is confirmed once more than half the group upvotes it.
            const ups = Object.values(a.votes).filter((v) => v === 1).length;
            if (a.status === 'voting' && ups > t.members.length / 2) a.status = 'confirmed';
          }),

        toggleAssign: (tripId, id, memberId) =>
          withTrip(tripId, (t) => {
            const a = t.activities.find((x) => x.id === id);
            if (!a) return;
            a.assigned = a.assigned.includes(memberId) ? a.assigned.filter((x) => x !== memberId) : [...a.assigned, memberId];
          }),

        addExpense: (tripId, e) =>
          withTrip(tripId, (t) => {
            t.expenses.unshift({ ...e, id: uid('e-') });
          }),

        deleteExpense: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.expenses = t.expenses.filter((x) => x.id !== id);
          }),

        settleUp: (tripId, from, to, amount) =>
          withTrip(tripId, (t) => {
            const toName = t.members.find((m) => m.id === to)?.name.split(' ')[0] ?? 'member';
            t.expenses.unshift({
              id: uid('e-'), title: `Settle-up to ${toName}`, amount: Math.round(amount * 100) / 100, category: 'Other',
              paidBy: from, splitBetween: [to], date: todayInTz('UTC'), settlement: true,
            });
          }),

        addFlight: (tripId, f) =>
          withTrip(tripId, (t) => {
            t.flights.push({ ...f, id: uid('f-') });
          }),

        deleteFlight: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.flights = t.flights.filter((x) => x.id !== id);
          }),

        createPoll: (tripId, question, options) =>
          withTrip(tripId, (t) => {
            t.polls.unshift({
              id: uid('poll-'), question: question.trim(), createdBy: me(), createdAt: Date.now(),
              options: options.map((text, i) => ({ id: `o${i + 1}`, text: text.trim(), votes: [] })),
            } satisfies Poll);
            t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `New poll: ${question.trim()}`, ts: Date.now() });
          }),

        votePoll: (tripId, pollId, optionId) =>
          withTrip(tripId, (t) => {
            const p = t.polls.find((x) => x.id === pollId);
            if (!p || p.closed) return;
            const user = me();
            const already = p.options.find((o) => o.id === optionId)?.votes.includes(user);
            p.options.forEach((o) => (o.votes = o.votes.filter((v) => v !== user)));
            if (!already) p.options.find((o) => o.id === optionId)?.votes.push(user);
          }),

        closePoll: (tripId, pollId) =>
          withTrip(tripId, (t) => {
            const p = t.polls.find((x) => x.id === pollId);
            if (p) p.closed = !p.closed;
          }),

        deletePoll: (tripId, pollId) =>
          withTrip(tripId, (t) => {
            t.polls = t.polls.filter((x) => x.id !== pollId);
          }),

        addTask: (tripId, text, assignee) =>
          withTrip(tripId, (t) => {
            t.tasks.push({ id: uid('t-'), text: text.trim(), done: false, assignee });
          }),

        toggleTask: (tripId, id) =>
          withTrip(tripId, (t) => {
            const k = t.tasks.find((x) => x.id === id);
            if (k) k.done = !k.done;
          }),

        deleteTask: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.tasks = t.tasks.filter((x) => x.id !== id);
          }),

        assignTask: (tripId, id, memberId) =>
          withTrip(tripId, (t) => {
            const k = t.tasks.find((x) => x.id === id);
            if (k) k.assignee = memberId;
          }),

        addDoc: (tripId, d) =>
          withTrip(tripId, (t) => {
            t.docs.unshift({ ...d, id: uid('d-'), addedAt: Date.now(), addedBy: me() });
          }),

        deleteDoc: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.docs = t.docs.filter((x) => x.id !== id);
          }),

        sendMessage: (tripId, msg) =>
          withTrip(tripId, (t) => {
            t.messages.push({ ...msg, id: uid('c-'), ts: msg.ts ?? Date.now() });
            if (t.messages.length > 400) t.messages.splice(0, t.messages.length - 400);
          }),

        clearChat: (tripId) =>
          withTrip(tripId, (t) => {
            t.messages = [];
          }),

        addPhoto: (tripId, p) =>
          withTrip(tripId, (t) => {
            t.photos.unshift({ ...p, id: uid('ph-'), ts: Date.now(), likes: [], by: me() });
          }),

        toggleLikePhoto: (tripId, id) =>
          withTrip(tripId, (t) => {
            const p = t.photos.find((x) => x.id === id);
            if (!p) return;
            const user = me();
            p.likes = p.likes.includes(user) ? p.likes.filter((x) => x !== user) : [...p.likes, user];
          }),

        deletePhoto: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.photos = t.photos.filter((x) => x.id !== id);
          }),

        togglePacked: (tripId, id) =>
          withTrip(tripId, (t) => {
            const p = t.packing.find((x) => x.id === id);
            if (p) p.packed = !p.packed;
          }),

        assignPacking: (tripId, id, memberId) =>
          withTrip(tripId, (t) => {
            const p = t.packing.find((x) => x.id === id);
            if (p) p.broughtBy = memberId;
          }),

        addPackingItems: (tripId, items) =>
          withTrip(tripId, (t) => {
            const have = new Set(t.packing.map((p) => p.text.toLowerCase()));
            items.forEach((i) => {
              const key = i.text.toLowerCase();
              if (have.has(key)) return;
              have.add(key); // also skips duplicates inside this same batch
              t.packing.push({ ...i, id: uid('p-'), packed: false });
            });
          }),

        deletePackingItem: (tripId, id) =>
          withTrip(tripId, (t) => {
            t.packing = t.packing.filter((x) => x.id !== id);
          }),

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
        setRestyled: (v) => set({ restyled: v }),
        setToured: (v) =>
          set((s) => {
            s.personal.toured = v;
          }),
        updatePersonal: (patch) =>
          set((s) => {
            Object.assign(s.personal, patch);
          }),

        markReminderFired: (key) =>
          set((s) => {
            s.firedReminders[key] = Date.now();
          }),

        resetEverything: () =>
          set(() => ({ ...initialState, hydrated: true, hasOnboarded: true })),
      };
    }),
    {
      name: 'togetherwego-v1',
      version: 2,
      // v2: "Amalfi Squad" replaced the Tokyo trip as the main demo — re-seed the demo trips once, keep the user's own.
      migrate: (persisted, version) => {
        const old = persisted as Partial<State>;
        if (version >= 2) return old as AppStore;
        const demoIds = ['trip-tokyo', 'trip-bali', 'trip-bcn', 'trip-amalfi'];
        return { ...old, seeded: false, activeTripId: null, trips: (old.trips ?? []).filter((t) => !demoIds.includes(t.id)) } as AppStore;
      },
      // New settings added in later versions fall back to their defaults instead of vanishing.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
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

// ---------- Selectors & derived data (the "view-model" helpers) ----------

export function useCurrentUser(): Account | undefined {
  return useAppStore((s) => s.accounts.find((a) => a.id === s.session?.userId));
}

export function useActiveTrip(): Trip | undefined {
  return useAppStore((s) => {
    const uidNow = s.session?.userId;
    const t = s.trips.find((x) => x.id === s.activeTripId);
    if (t && (!uidNow || t.members.some((m) => m.id === uidNow))) return t;
    return undefined;
  });
}

export function useMyTrips(): Trip[] {
  const userId = useAppStore((s) => s.session?.userId);
  const trips = useAppStore((s) => s.trips);
  return trips.filter((t) => t.members.some((m) => m.id === userId));
}

export function tripStatus(t: Trip): TripStatus {
  if (t.completed) return 'completed';
  const dest = destinationById(t.destinationId);
  const today = todayInTz(dest?.tz ?? 'UTC');
  if (daysBetween(today, t.startDate) > 0) return 'planning';
  if (daysBetween(t.endDate, today) > 0) return 'completed';
  return 'active';
}

export function memberById(t: Trip | undefined, id: string): Member | undefined {
  return t?.members.find((m) => m.id === id);
}

export { balances, settlePlan, totalSpent } from '@/utils/money';
