/**
 * The small decisions the Plan screen makes, with no React in them so they can be tested: how a day's list is grouped,
 * what the clock on the rail says, how a vote stands, which items just locked in, and the duration steps of Add activity.
 */
import type { Activity, ActivityStatus } from '@/store/types';
import { time12 } from '@/utils/time';

/** "3:40" and "PM": the big mono clock on the rail and the small caps under it. */
export function clockParts(hhmm: string): { clock: string; suffix: string } {
  const [clock, suffix] = time12(hhmm).split(' ');
  return { clock, suffix };
}

export const byTime = (a: Activity, b: Activity) => (a.date + a.time).localeCompare(b.date + b.time);

export interface DayGroup {
  date: string;
  /** 1 for the first day of the trip; 0 when the date is outside the trip's days (the trip dates were edited). */
  dayNo: number;
  items: Activity[];
}

/** Activities in time order, grouped by day. Days with nothing on them are left out. */
export function groupByDay(activities: Activity[], days: string[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const a of [...activities].sort(byTime)) {
    const last = groups[groups.length - 1];
    if (last && last.date === a.date) last.items.push(a);
    else groups.push({ date: a.date, dayNo: days.indexOf(a.date) + 1, items: [a] });
  }
  return groups;
}

export interface Tally {
  yes: number;
  no: number;
  total: number;
  /** Yes votes that make a majority (more than half the crew). */
  needed: number;
  /** How far the bar is filled: yes votes toward the majority, 0 to 1. */
  progress: number;
}

/** How a vote stands. The store confirms an item once more than half the crew says yes, so `needed` is that number. */
export function voteTally(votes: Activity['votes'], memberCount: number): Tally {
  const values = Object.values(votes);
  const yes = values.filter((v) => v === 1).length;
  const no = values.filter((v) => v === -1).length;
  const needed = Math.floor(memberCount / 2) + 1;
  return { yes, no, total: memberCount, needed, progress: Math.min(1, yes / needed) };
}

/** id to status, to compare one render with the next. */
export function statusMap(activities: Activity[]): Record<string, ActivityStatus> {
  const out: Record<string, ActivityStatus> = {};
  for (const a of activities) out[a.id] = a.status;
  return out;
}

export const sameStatuses = (a: Record<string, ActivityStatus>, b: Record<string, ActivityStatus>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/**
 * The activities that were up for a vote and are now confirmed: the moment to stamp LOCKED IN and celebrate.
 * Anything new (not in `before`) never counts, so nothing celebrates on first render or when an item is added.
 */
export function newlyLocked(before: Record<string, ActivityStatus>, activities: Activity[]): Activity[] {
  return activities.filter((a) => before[a.id] === 'voting' && a.status === 'confirmed');
}

/** The lengths Add activity offers, in minutes. */
export const DURATIONS = [30, 60, 90, 120, 180, 300, 480] as const;

/** "30m", "1h", "1h 30m", "Half day", "Full day": the length of an activity as the plan and the duration stepper show it. */
export function durationText(min: number): string {
  if (min === 300) return 'Half day';
  if (min === 480) return 'Full day';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** One step up or down the list of lengths from `min` (which may be an odd value of an edited activity). Stays at the ends. */
export function stepDuration(min: number, dir: 1 | -1): number {
  if (dir === 1) return DURATIONS.find((d) => d > min) ?? DURATIONS[DURATIONS.length - 1];
  return [...DURATIONS].reverse().find((d) => d < min) ?? DURATIONS[0];
}
