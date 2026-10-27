/** Splits notifications into "Today" and "Earlier" (by the phone's own calendar day), newest first. Empty groups are left out. */
export interface DayGroup<T> {
  label: 'Today' | 'Earlier';
  items: T[];
}

export function groupByDay<T extends { ts: number }>(items: T[], now = Date.now()): DayGroup<T>[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const newestFirst = [...items].sort((a, b) => b.ts - a.ts);
  const today = newestFirst.filter((n) => n.ts >= startOfToday.getTime());
  const earlier = newestFirst.filter((n) => n.ts < startOfToday.getTime());
  const out: DayGroup<T>[] = [];
  if (today.length) out.push({ label: 'Today', items: today });
  if (earlier.length) out.push({ label: 'Earlier', items: earlier });
  return out;
}
