import { afterSignIn, calm, inviteFrom, meterView } from '../logic';

describe('calm', () => {
  it('drops exclamation marks and the Spanish opening mark', () => {
    expect(calm('Welcome back!')).toBe('Welcome back');
    expect(calm('¡Bienvenido de nuevo!')).toBe('Bienvenido de nuevo');
    expect(calm('おかえりなさい！')).toBe('おかえりなさい');
    expect(calm('Bon retour !')).toBe('Bon retour');
  });
  it('leaves plain text alone', () => {
    expect(calm('Sign in to continue.')).toBe('Sign in to continue.');
  });
});

describe('meterView', () => {
  it('shows nothing for an empty password', () => {
    expect(meterView('')).toBeNull();
  });
  it('is red and has at least one segment for a weak password', () => {
    expect(meterView('abc')).toMatchObject({ filled: 1, tone: 'danger', icon: 'alert-circle' });
  });
  it('is amber at "Okay" and green from "Strong"', () => {
    expect(meterView('Trip2027go')?.tone).toBe('warn');
    expect(meterView('Trip2027goNow!')?.tone).toBe('positive');
    expect(meterView('Trip2027goNow!')?.icon).toBe('checkmark-circle');
  });
});

describe('inviteFrom', () => {
  it('tidies a code', () => {
    expect(inviteFrom('seo5521')).toBe('SEO-5521');
    expect(inviteFrom(' AML-2026 ')).toBe('AML-2026');
  });
  it('rejects things that are not codes', () => {
    expect(inviteFrom('')).toBeNull();
    expect(inviteFrom(undefined)).toBeNull();
    expect(inviteFrom('hello')).toBeNull();
    expect(inviteFrom('AB-12')).toBeNull();
  });
});

describe('afterSignIn', () => {
  it('goes home when there is no invite', () => {
    expect(afterSignIn(null)).toEqual({ first: '/(tabs)/explore', then: null });
  });
  it('goes home and then to the invite', () => {
    expect(afterSignIn('SEO-5521')).toEqual({ first: '/(tabs)/explore', then: { pathname: '/join', params: { code: 'SEO-5521' } } });
  });
});
