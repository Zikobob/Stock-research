import { createHash } from 'crypto';
import { useAppStore } from '../useAppStore';

const reset = () => useAppStore.getState().resetEverything();

describe('accounts and sign-in', () => {
  beforeEach(reset);

  it('signs up, signs out and signs back in with the same password', async () => {
    const s = useAppStore.getState();
    expect(await s.signUp('Sam Okafor', 'sam@example.com', 'Passw0rd!x')).toEqual({ ok: true });
    const account = useAppStore.getState().accounts[0];
    expect(account.passwordHash).toMatch(/^pbkdf2-sha256\$/);
    expect(JSON.stringify(useAppStore.getState())).not.toContain('Passw0rd!x');

    useAppStore.getState().signOut();
    expect(useAppStore.getState().session).toBeNull();
    expect((await useAppStore.getState().signIn('SAM@example.com ', 'wrong-pass1', true)).ok).toBe(false);
    expect(await useAppStore.getState().signIn('SAM@example.com ', 'Passw0rd!x', true)).toEqual({ ok: true });
    expect(useAppStore.getState().session?.userId).toBe(account.id);
  });

  it('refuses a second account with the same email and a malformed email', async () => {
    await useAppStore.getState().signUp('A', 'a@example.com', 'Passw0rd!x');
    expect((await useAppStore.getState().signUp('B', 'A@example.com', 'Passw0rd!y')).ok).toBe(false);
    expect((await useAppStore.getState().signUp('B', 'not-an-email', 'Passw0rd!y')).ok).toBe(false);
    expect(useAppStore.getState().accounts).toHaveLength(1);
  });

  it('upgrades an old single-round SHA-256 account the first time it signs in', async () => {
    const salt = 'legacy-salt';
    const passwordHash = createHash('sha256').update(`${salt}:Passw0rd!x`).digest('hex');
    useAppStore.setState({ accounts: [{ id: 'u-old', name: 'Old User', email: 'old@example.com', passwordHash, salt, provider: 'password' }] });
    expect((await useAppStore.getState().signIn('old@example.com', 'bad-pass-1', false)).ok).toBe(false);
    expect(useAppStore.getState().accounts[0].passwordHash).toBe(passwordHash); // a failed sign-in changes nothing
    expect((await useAppStore.getState().signIn('old@example.com', 'Passw0rd!x', false)).ok).toBe(true);
    expect(useAppStore.getState().accounts[0].passwordHash).toMatch(/^pbkdf2-sha256\$/);
    useAppStore.getState().signOut();
    expect((await useAppStore.getState().signIn('old@example.com', 'Passw0rd!x', false)).ok).toBe(true);
  });

  it('resets a forgotten password', async () => {
    await useAppStore.getState().signUp('A', 'a@example.com', 'Passw0rd!x');
    useAppStore.getState().signOut();
    expect((await useAppStore.getState().resetPassword('nobody@example.com', 'Newpass1!x')).ok).toBe(false);
    expect((await useAppStore.getState().resetPassword('a@example.com', 'Newpass1!x')).ok).toBe(true);
    expect((await useAppStore.getState().signIn('a@example.com', 'Passw0rd!x', true)).ok).toBe(false);
    expect((await useAppStore.getState().signIn('a@example.com', 'Newpass1!x', true)).ok).toBe(true);
  });

  it('seeds the demo account and lets it sign in', async () => {
    await useAppStore.getState().ensureSeed();
    const s = useAppStore.getState();
    expect(s.trips.map((t) => t.name)).toContain('Amalfi Squad');
    expect(await s.signIn('maya.chen@togetherwego.app', 'TravelTogether2026!', true)).toEqual({ ok: true });
  });
});
