import { buildInviteUrl, inviteText, parseInviteUrl } from '../invite';

describe('invite links', () => {
  it('survive the round trip for every kind of address the app can have', () => {
    for (const base of ['togetherwego://join', 'exp://192.168.1.20:8081/--/join', 'http://localhost:8081/join', 'https://example.org/app/join']) {
      const link = buildInviteUrl(base, 'AML-2026', 'http://192.168.1.20:8787');
      expect(link.startsWith(base)).toBe(true);
      expect(parseInviteUrl(link)).toEqual({ code: 'AML-2026', server: 'http://192.168.1.20:8787' });
    }
  });

  it('leaves the server out when there is none', () => {
    const link = buildInviteUrl('togetherwego://join', 'SEO-5521');
    expect(link).toBe('togetherwego://join?code=SEO-5521');
    expect(parseInviteUrl(link)).toEqual({ code: 'SEO-5521', server: null });
  });

  it('adds to an address that already has a query', () => {
    expect(buildInviteUrl('https://x.org/join?lang=en', 'AML-2026')).toBe('https://x.org/join?lang=en&code=AML-2026');
    expect(parseInviteUrl('https://x.org/join?lang=en&code=AML-2026').code).toBe('AML-2026');
  });

  it('tidies codes typed in lower case or without the dash', () => {
    expect(parseInviteUrl('togetherwego://join?code=aml2026').code).toBe('AML-2026');
    expect(parseInviteUrl('togetherwego://join?code=aml-2026#section').code).toBe('AML-2026');
  });

  it('ignores anything that is not an invite', () => {
    expect(parseInviteUrl('')).toEqual({ code: null, server: null });
    expect(parseInviteUrl('https://example.org/')).toEqual({ code: null, server: null });
    expect(parseInviteUrl('togetherwego://join?code=hello')).toEqual({ code: null, server: null });
    expect(parseInviteUrl('togetherwego://join?code=AML-2026&server=not%20an%20address%20at%20all').server).toBeNull();
    expect(parseInviteUrl('togetherwego://join?code=%E0%A4%A').code).toBeNull(); // broken percent-encoding does not crash
  });

  it('writes a message that works even when the link does not open the app', () => {
    const text = inviteText('Amalfi Squad', 'AML-2026', 'togetherwego://join?code=AML-2026');
    expect(text).toContain('Amalfi Squad');
    expect(text).toContain('AML-2026');
    expect(text).toContain('togetherwego://join?code=AML-2026');
    expect(text).toContain('Join a trip');
  });
});
