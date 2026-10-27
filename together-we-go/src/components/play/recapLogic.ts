/** What the trip recap counts, with no React in it so it can be tested. */
import type { Activity, Trip } from '@/store/types';

/** The places the crew went to: planned activities that are not just getting there or sleeping, each name once, in the order of the trip. */
export function placesVisited(activities: Pick<Activity, 'title' | 'type' | 'date' | 'time'>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of activities.slice().sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time))) {
    if (a.type === 'transport' || a.type === 'stay') continue;
    const key = a.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(a.title.trim());
  }
  return out;
}

/** A name short enough for a stamp: cut at a word where it can be, with an ellipsis. */
export function shortName(name: string, max = 16): string {
  if (name.length <= max) return name;
  const cut = name.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The yes votes an activity has. */
export const yesVotes = (a: Pick<Activity, 'votes'>) => Object.values(a.votes).filter((v) => v === 1).length;

/** Every vote cast on the trip: on activities and in polls. */
export function votesCast(trip: Pick<Trip, 'activities' | 'polls'>): number {
  return trip.activities.reduce((n, a) => n + Object.keys(a.votes).length, 0) + trip.polls.reduce((n, p) => n + p.options.reduce((m, o) => m + o.votes.length, 0), 0);
}
