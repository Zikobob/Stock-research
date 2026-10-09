/**
 * Input validation used across forms. Each validator returns an error message
 * (string) or null when the value is valid. Checks are both syntactic
 * (format) and semantic (does the value make sense for a trip?).
 */
import { airportByIata } from '@/data/airports';
import { HHMM_RE, daysBetween, isValidYMD } from './time';

export type Validator = (value: string) => string | null;

export const required =
  (label: string): Validator =>
  (v) =>
    v.trim() ? null : `Enter ${label}`;

export const maxLen =
  (n: number, label = 'This'): Validator =>
  (v) =>
    v.trim().length > n ? `${label} must be ${n} characters or fewer` : null;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(v: string): string | null {
  if (!v.trim()) return 'Enter your email address';
  if (!EMAIL_RE.test(v.trim())) return 'That email doesn’t look right (e.g. name@mail.com)';
  return null;
}

export function validatePassword(v: string): string | null {
  if (!v) return 'Enter a password';
  if (v.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number';
  return null;
}

export function passwordStrength(v: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
  const labels = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

export function validateName(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Enter a name';
  if (t.length < 2) return 'Name is too short';
  if (t.length > 40) return 'Keep names under 40 characters';
  if (!/^[\p{L}\p{M}' .-]+$/u.test(t)) return 'Names can only contain letters, spaces, hyphens and apostrophes';
  return null;
}

/**
 * Parses a money amount. Accepts "12", "12.50", "1,200" — rejects negatives,
 * letters and absurd values.
 */
export function parseAmount(v: string): number | null {
  const cleaned = v.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function validateAmount(v: string, { min = 0.01, max = 1_000_000, label = 'an amount' } = {}): string | null {
  if (!v.trim()) return `Enter ${label}`;
  const n = parseAmount(v);
  if (n === null) return 'Use numbers only, e.g. 25 or 25.50';
  if (n < min) return min > 0 ? `Amount must be more than 0` : 'Amount can’t be negative';
  if (n > max) return `That’s more than ${max.toLocaleString()} — double-check the amount`;
  return null;
}

export function validateTime(v: string): string | null {
  return HHMM_RE.test(v) ? null : 'Use 24-hour time, e.g. 09:30';
}

export function validateTripDates(start: string, end: string): { start?: string; end?: string } {
  const errs: { start?: string; end?: string } = {};
  if (!isValidYMD(start)) errs.start = 'Pick a valid start date';
  if (!isValidYMD(end)) errs.end = 'Pick a valid end date';
  if (!errs.start && !errs.end) {
    const len = daysBetween(start, end);
    if (len < 0) errs.end = 'End date must be on or after the start date';
    else if (len > 60) errs.end = 'Trips can be at most 60 days long';
  }
  return errs;
}

export const INVITE_RE = /^[A-Z]{3}-\d{4}$/;

export function normalizeInvite(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}`;
}

export function validateInvite(v: string): string | null {
  if (!v.trim()) return 'Enter the code your friend shared';
  if (!INVITE_RE.test(v)) return 'Codes look like ABC-1234';
  return null;
}

export const FLIGHT_RE = /^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/;

export function validateFlightNumber(v: string): string | null {
  const t = v.trim().toUpperCase();
  if (!t) return 'Enter the flight number';
  if (!FLIGHT_RE.test(t)) return 'Flight numbers look like NH 175 or UA837';
  return null;
}

export function validateIata(v: string, label: string): string | null {
  const t = v.trim().toUpperCase();
  if (!t) return `Enter the ${label} airport code`;
  if (!/^[A-Z]{3}$/.test(t)) return 'Airport codes are 3 letters, e.g. JFK';
  if (!airportByIata(t)) return `We don’t recognise “${t}” — try a major airport code`;
  return null;
}

/** Runs validators in order and returns the first error. */
export function firstError(value: string, ...validators: Validator[]): string | null {
  for (const v of validators) {
    const e = v(value);
    if (e) return e;
  }
  return null;
}
