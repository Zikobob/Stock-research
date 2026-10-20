/**
 * Accounts and sign-in: who is using this phone.
 */
import * as Crypto from 'expo-crypto';
import { uid } from '@/utils/format';
import { EMAIL_RE } from '@/utils/validation';
import { hashPassword, verifyPassword } from '@/utils/password';

import type { Account } from '../types';
import type { Slice } from './types';

interface Session {
  userId: string;
  remember: boolean;
}

export type Result = { ok: true } | { ok: false; error: string };

export interface AuthSlice {
  session: Session | null;
  accounts: Account[];
  signIn: (email: string, password: string, remember: boolean) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  signInWithGoogle: (email: string, name: string) => Promise<Result>;
  signOut: () => void;
  accountExists: (email: string) => boolean;
  resetPassword: (email: string, newPassword: string) => Promise<Result>;
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'homeCity' | 'avatar'>>) => void;
}

/** Starting values, also used by "reset everything". */
export const initialAuth = {
  session: null,
  accounts: [],
};

export const createAuthSlice: Slice<AuthSlice> = (set, get) => {
  return {
    ...initialAuth,
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
  };
};
