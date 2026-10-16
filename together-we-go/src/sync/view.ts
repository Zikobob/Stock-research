/**
 * Puts a shared trip together with the parts that only live on this phone, so screens see one ordinary Trip.
 *
 * Phone-only parts: the private Scout AI chat, member emails, and the files behind photos, documents, receipts and
 * tickets (other phones cannot open a path that points into this phone's storage).
 */
import type { Trip } from '@/store/types';

import { deepEqual } from './crdt';


/** Fields that stay on this phone, per list, and what other phones show when they do not have them. */
const LOCAL_FIELDS: Record<string, { fields: string[]; fallback?: Record<string, unknown> }> = {
  members: { fields: ['email'] },
  photos: { fields: ['uri'], fallback: { uri: '' } },
  docs: { fields: ['uri'] },
  expenses: { fields: ['receipt'] },
  flights: { fields: ['ticketUri', 'ticketName'] },
};

export function mergeLocalOnly(shared: Trip, current: Trip | undefined): Trip {
  const out: any = { ...shared };
  for (const [list, { fields, fallback }] of Object.entries(LOCAL_FIELDS)) {
    const mine = new Map<string, any>(((current as any)?.[list] ?? []).map((x: any) => [x.id, x]));
    out[list] = (shared as any)[list].map((item: any) => {
      const own = mine.get(item.id);
      let next = item;
      for (const f of fields) {
        const value = own?.[f] ?? fallback?.[f];
        if (value !== undefined && next[f] !== value) next = { ...next, [f]: value };
      }
      return next;
    });
  }
  const privateMessages = (current?.messages ?? []).filter((m) => m.channel === 'ai').sort((a, b) => a.ts - b.ts);
  if (privateMessages.length) out.messages = placePrivate(shared.messages, privateMessages);
  return out as Trip;
}

/** Slots the private messages in by time without reordering the shared ones (their order is the order they were sent). */
function placePrivate(shared: Trip['messages'], mine: Trip['messages']): Trip['messages'] {
  const out = [...shared];
  for (const m of mine) {
    let i = out.length;
    while (i > 0 && out[i - 1].ts > m.ts) i--;
    out.splice(i, 0, m);
  }
  return out;
}

/**
 * Keeps the old object for every part that did not change, so React only re-renders what is new.
 * Returns `prev` itself when nothing changed at all.
 */
export function reuseUnchanged(prev: Trip | undefined, next: Trip): Trip {
  if (!prev) return next;
  const out: any = { ...next };
  let same = true;
  for (const key of Object.keys(next) as (keyof Trip)[]) {
    const a: any = prev[key];
    const b: any = next[key];
    if (Array.isArray(b) && Array.isArray(a) && b.length && typeof b[0] === 'object') {
      const old = new Map<string, any>(a.map((x: any) => [x.id, x]));
      const items = b.map((item: any) => {
        const o = old.get(item.id);
        return o && deepEqual(o, item) ? o : item;
      });
      out[key] = items.length === a.length && items.every((x: any, i: number) => x === a[i]) ? a : items;
    } else if (deepEqual(a, b)) {
      out[key] = a;
    }
    if (out[key] !== a) same = false;
  }
  return same ? prev : (out as Trip);
}

/** What the store should hold for a shared trip after the registers changed. */
export function toViewTrip(shared: Trip, current: Trip | undefined): Trip {
  return reuseUnchanged(current, mergeLocalOnly(shared, current));
}
