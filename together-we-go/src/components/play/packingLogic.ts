/** The small decisions the packing list makes, with no React in them so they can be tested. */
import type { PackingItem } from '@/store/types';

type Item = Pick<PackingItem, 'id' | 'packed' | 'broughtBy'>;

/** The things nobody is bringing yet (and that are not packed already). */
export function needsSomeone(items: Item[], memberIds: string[]): Item[] {
  return items.filter((p) => !p.packed && !(p.broughtBy && memberIds.includes(p.broughtBy)));
}

/** Hands each unassigned item to whoever is carrying the least so far. Returns who gets what; changes nothing itself. */
export function splitFairly(items: Item[], memberIds: string[]): { itemId: string; memberId: string }[] {
  if (!memberIds.length) return [];
  const load: Record<string, number> = {};
  memberIds.forEach((id) => (load[id] = items.filter((p) => p.broughtBy === id).length));
  return needsSomeone(items, memberIds).map((p) => {
    const next = memberIds.reduce((a, b) => (load[b] < load[a] ? b : a));
    load[next] += 1;
    return { itemId: p.id, memberId: next };
  });
}

/** True when ticking this one item packs the very last thing on a list that has more than one item. */
export function completesList(packed: number, total: number, wasPacked: boolean): boolean {
  return !wasPacked && total > 1 && packed + 1 === total;
}
