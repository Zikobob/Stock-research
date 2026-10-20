import * as Crypto from 'expo-crypto';

/**
 * A random number in [0, 1) from the phone's secure random generator. The ids that work like passwords (a trip's id on
 * the sync server, a file's id) come from this, not from Math.random, which is not meant to be unguessable.
 */
export function secureRandom(): number {
  const [a, b, c, d] = Crypto.getRandomBytes(4);
  return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0) / 4294967296;
}
