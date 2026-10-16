/**
 * Password hashing. Stored as `pbkdf2-sha256$<rounds>$<hex>`; the salt lives next to it on the account.
 *
 * Why not a bigger number of rounds? This runs in the phone's JavaScript engine, which is far slower than a
 * server, and the async version below yields to the UI so the screen never freezes. The round count is stored
 * in the hash, so it can be raised later and old hashes are upgraded on the next successful sign-in.
 * shortcut: a real service should hash on the server with Argon2id or bcrypt; this protects the on-device copy.
 */
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export const PBKDF2_ROUNDS = 10_000;
const PREFIX = 'pbkdf2-sha256';
const MAX_ROUNDS = 1_000_000; // refuse absurd values so a corrupted record cannot hang the app

/** Version 1 of the app stored a single round of SHA-256 over `salt:password` (64 hex characters). */
export const isLegacyHash = (stored: string) => /^[0-9a-f]{64}$/.test(stored);

export async function hashPassword(password: string, salt: string, rounds = PBKDF2_ROUNDS): Promise<string> {
  const key = await pbkdf2Async(sha256, password.normalize('NFKC'), salt, { c: rounds, dkLen: 32, asyncTick: 8 });
  return `${PREFIX}$${rounds}$${bytesToHex(key)}`;
}

/** Compares two strings in time that does not depend on where they first differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks a password against a stored hash. When it is right but the stored hash is old or weak, `upgrade`
 * holds the new hash the caller should save.
 */
export async function verifyPassword(password: string, account: { passwordHash: string; salt: string }): Promise<{ ok: boolean; upgrade?: string }> {
  const { passwordHash, salt } = account;
  if (isLegacyHash(passwordHash)) {
    const legacy = bytesToHex(sha256(utf8ToBytes(`${salt}:${password}`)));
    return safeEqual(legacy, passwordHash) ? { ok: true, upgrade: await hashPassword(password, salt) } : { ok: false };
  }
  const [prefix, roundsText] = passwordHash.split('$');
  const rounds = Number(roundsText);
  if (prefix !== PREFIX || !Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) return { ok: false };
  const actual = await hashPassword(password, salt, rounds);
  if (!safeEqual(actual, passwordHash)) return { ok: false };
  return rounds < PBKDF2_ROUNDS ? { ok: true, upgrade: await hashPassword(password, salt) } : { ok: true };
}
