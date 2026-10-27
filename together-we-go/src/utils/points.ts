import type { Trip } from '@/store/types';

export interface Standing {
  memberId: string;
  name: string;
  avatar?: string;
  points: number;
}

/**
 * "Crew points": a friendly scoreboard built from what people really did on the trip, so it is always true and
 * needs no extra syncing. A vote is 1 point, a finished checklist job 3, a photo 2, an expense logged 2, a plan
 * item added 3, a chat message 1.
 */
export function crewStandings(trip: Trip): Standing[] {
  const points: Record<string, number> = Object.fromEntries(trip.members.map((m) => [m.id, 0]));
  const add = (id: string | undefined, n: number) => {
    if (id && id in points) points[id] += n;
  };
  for (const a of trip.activities) {
    add(a.createdBy, 3);
    for (const voter of Object.keys(a.votes)) add(voter, 1);
  }
  for (const t of trip.tasks) if (t.done) add(t.assignee, 3);
  for (const p of trip.photos) add(p.by, 2);
  for (const e of trip.expenses) if (!e.settlement) add(e.paidBy, 2);
  for (const m of trip.messages) if (!m.ai && m.kind !== 'system') add(m.authorId, 1);
  return trip.members
    .map((m) => ({ memberId: m.id, name: m.name, avatar: m.avatar, points: points[m.id] }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
