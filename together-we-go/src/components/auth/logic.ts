/** Small pure helpers for the first-run and sign-in screens (no React Native in here, so jest can check them). */
import { normalizeInvite, passwordStrength, validateInvite } from '@/utils/validation';

/**
 * A greeting without the shouting: drops a trailing "!" (or "！") and Spanish "¡", so "Welcome back!" reads "Welcome back".
 * The translations keep their exclamation marks; the new look does not use them.
 */
export function calm(text: string): string {
  return text.replace(/^¡/, '').replace(/[!！]+$/, '').trim();
}

export type MeterTone = 'danger' | 'warn' | 'positive';

/** How the password strength bar is drawn: how many of the 4 segments are filled, in which state colour, with which words. */
export function meterView(password: string): { filled: number; tone: MeterTone; label: string; icon: 'alert-circle' | 'checkmark-circle' } | null {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const filled = Math.max(1, score);
  if (score <= 1) return { filled, tone: 'danger', label, icon: 'alert-circle' };
  if (score === 2) return { filled, tone: 'warn', label, icon: 'alert-circle' };
  return { filled, tone: 'positive', label, icon: 'checkmark-circle' };
}

/** An invite code typed or passed in a link, tidied to ABC-1234, or null when it is not one. */
export function inviteFrom(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const code = normalizeInvite(String(raw));
  return validateInvite(code) ? null : code;
}

/** Where to go once someone is signed in: the home tab, then (after a moment, so the tab is on screen) the invite they came with. */
export function afterSignIn(invite: string | null): { first: '/(tabs)/explore'; then: { pathname: '/join'; params: { code: string } } | null } {
  return { first: '/(tabs)/explore', then: invite ? { pathname: '/join', params: { code: invite } } : null };
}
