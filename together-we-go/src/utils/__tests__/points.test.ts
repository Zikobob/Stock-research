import { crewStandings } from '../points';
import type { Trip } from '@/store/types';

const trip = {
  members: [
    { id: 'a', name: 'Ana', role: 'Member' },
    { id: 'b', name: 'Ben', role: 'Member' },
    { id: 'c', name: 'Cy', role: 'Member' },
  ],
  activities: [{ createdBy: 'a', votes: { a: 1, b: 1, c: -1 } }],
  tasks: [{ done: true, assignee: 'b' }, { done: false, assignee: 'c' }],
  photos: [{ by: 'b' }, { by: 'b' }],
  expenses: [{ paidBy: 'c' }, { paidBy: 'c', settlement: true }],
  messages: [{ authorId: 'a' }, { authorId: 'a', ai: true }, { authorId: 'c', kind: 'system' }],
} as unknown as Trip;

describe('crew points', () => {
  it('adds up what each person really did', () => {
    const s = Object.fromEntries(crewStandings(trip).map((x) => [x.memberId, x.points]));
    expect(s.a).toBe(3 + 1 + 1); // added an item, voted, one chat message (the AI and system lines do not count)
    expect(s.b).toBe(1 + 3 + 2 * 2); // voted, finished a job, two photos
    expect(s.c).toBe(1 + 2); // voted, logged one expense (the settlement does not count)
  });

  it('puts the person with the most points first, ties by name', () => {
    expect(crewStandings(trip).map((x) => x.name)).toEqual(['Ben', 'Ana', 'Cy']);
  });
});
