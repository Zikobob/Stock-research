/** The link and the message a friend gets when you invite them. Opening the link fills in the join screen. */
import { INVITE_RE, normalizeInvite } from '@/utils/validation';

import { normalizeServerUrl } from './transport';

/**
 * `base` is the app's own address for the join screen (togetherwego://join, or exp://…/--/join while developing).
 * The sync server is included when there is one, so a friend's phone does not need it typed in.
 */
export function buildInviteUrl(base: string, code: string, server?: string | null): string {
  const query = [`code=${encodeURIComponent(code)}`];
  if (server) query.push(`server=${encodeURIComponent(server)}`);
  return `${base}${base.includes('?') ? '&' : '?'}${query.join('&')}`;
}

const decode = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

/** What an invite link or a scanned QR code says: a valid invite code and (if it names one) a sync server. */
export function parseInviteUrl(url: string): { code: string | null; server: string | null } {
  const query = url.trim().split('#')[0].split('?')[1] ?? '';
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key) params.set(key, decode(value));
  }
  const code = normalizeInvite(params.get('code') ?? '');
  const server = normalizeServerUrl(params.get('server') ?? '');
  return { code: INVITE_RE.test(code) ? code : null, server };
}

/** A plain-words message for chat apps: the code, the link, and what to do if the link does not open the app. */
export function inviteText(tripName: string, code: string, link: string): string {
  return `Join my trip “${tripName}” on TogetherWeGo\nInvite code: ${code}\nOpen: ${link}\nOr open the app, tap Join a trip and type the code.`;
}
