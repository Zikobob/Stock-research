import { createHash } from 'crypto';
import { PBKDF2_ROUNDS, hashPassword, isLegacyHash, safeEqual, verifyPassword } from '../password';

describe('hashPassword', () => {
  it('matches the official PBKDF2-HMAC-SHA256 test vector', async () => {
    // From RFC 7914 section 11: P = "passwd", S = "salt", c = 1 (first 32 bytes of the 64-byte result)
    expect(await hashPassword('passwd', 'salt', 1)).toBe('pbkdf2-sha256$1$55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc');
  });

  it('is repeatable, and the salt changes the result', async () => {
    const a = await hashPassword('TravelTogether2026!', 'salt-one');
    expect(await hashPassword('TravelTogether2026!', 'salt-one')).toBe(a);
    expect(await hashPassword('TravelTogether2026!', 'salt-two')).not.toBe(a);
    expect(a).toMatch(new RegExp(`^pbkdf2-sha256\\$${PBKDF2_ROUNDS}\\$[0-9a-f]{64}$`));
  });

  it('never contains the password', async () => {
    expect(await hashPassword('hunter2hunter2', 's')).not.toContain('hunter2');
  });
});

describe('verifyPassword', () => {
  it('accepts the right password and rejects the wrong one', async () => {
    const account = { salt: 'abc', passwordHash: await hashPassword('Correct-Horse-9', 'abc') };
    expect(await verifyPassword('Correct-Horse-9', account)).toEqual({ ok: true });
    expect((await verifyPassword('correct-horse-9', account)).ok).toBe(false);
    expect((await verifyPassword('', account)).ok).toBe(false);
  });

  it('upgrades a version-1 hash (single SHA-256) after a correct sign-in', async () => {
    const legacy = createHash('sha256').update('old-salt:Passw0rd!').digest('hex');
    expect(isLegacyHash(legacy)).toBe(true);
    const account = { salt: 'old-salt', passwordHash: legacy };
    expect((await verifyPassword('wrong', account)).ok).toBe(false);
    const ok = await verifyPassword('Passw0rd!', account);
    expect(ok.ok).toBe(true);
    expect(ok.upgrade).toMatch(/^pbkdf2-sha256\$/);
    expect(await verifyPassword('Passw0rd!', { salt: 'old-salt', passwordHash: ok.upgrade! })).toEqual({ ok: true });
  });

  it('upgrades a hash made with fewer rounds', async () => {
    const weak = await hashPassword('Passw0rd!', 's', 1000);
    const r = await verifyPassword('Passw0rd!', { salt: 's', passwordHash: weak });
    expect(r.ok).toBe(true);
    expect(r.upgrade).toContain(`$${PBKDF2_ROUNDS}$`);
  });

  it('rejects damaged or unknown hash formats instead of crashing', async () => {
    for (const bad of ['', 'nonsense', 'pbkdf2-sha256$abc$00', 'pbkdf2-sha256$99999999$00', 'md5$1$00']) {
      expect((await verifyPassword('x', { salt: 's', passwordHash: bad })).ok).toBe(false);
    }
  });

  it('supports passwords with accents and emoji', async () => {
    const account = { salt: 's', passwordHash: await hashPassword('Contraseña✈️2026', 's') };
    expect((await verifyPassword('Contraseña✈️2026', account)).ok).toBe(true);
  });
});

describe('safeEqual', () => {
  it('compares strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
