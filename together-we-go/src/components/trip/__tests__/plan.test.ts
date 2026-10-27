import type { Activity } from '@/store/types';

import { DURATIONS, clockParts, durationText, groupByDay, newlyLocked, sameStatuses, statusMap, stepDuration, voteTally } from '../plan';

const act = (id: string, date: string, time: string, over: Partial<Activity> = {}): Activity => ({
  id,
  date,
  time,
  title: id,
  location: 'Somewhere',
  type: 'food',
  durationMin: 60,
  costPerPerson: 0,
  status: 'confirmed',
  assigned: [],
  votes: {},
  reminder: false,
  createdBy: 'm1',
  ...over,
});

describe('clockParts', () => {
  it('splits a 24 hour time into a clock and AM or PM', () => {
    expect(clockParts('15:40')).toEqual({ clock: '3:40', suffix: 'PM' });
    expect(clockParts('00:05')).toEqual({ clock: '12:05', suffix: 'AM' });
    expect(clockParts('12:30')).toEqual({ clock: '12:30', suffix: 'PM' });
  });
});

describe('groupByDay', () => {
  const days = ['2026-10-23', '2026-10-24', '2026-10-25'];
  it('puts each activity under its day, in time order, and skips empty days', () => {
    const groups = groupByDay([act('c', '2026-10-25', '09:00'), act('b', '2026-10-23', '19:00'), act('a', '2026-10-23', '08:30')], days);
    expect(groups.map((g) => [g.date, g.dayNo, g.items.map((i) => i.id)])).toEqual([
      ['2026-10-23', 1, ['a', 'b']],
      ['2026-10-25', 3, ['c']],
    ]);
  });
  it('gives day 0 to a date outside the trip', () => {
    expect(groupByDay([act('x', '2026-11-01', '10:00')], days)[0].dayNo).toBe(0);
  });
  it('returns nothing for nothing', () => {
    expect(groupByDay([], days)).toEqual([]);
  });
});

describe('voteTally', () => {
  it('needs more than half the crew', () => {
    expect(voteTally({}, 4).needed).toBe(3);
    expect(voteTally({}, 5).needed).toBe(3);
    expect(voteTally({}, 1).needed).toBe(1);
  });
  it('counts yes and no and fills the bar toward the majority', () => {
    const t = voteTally({ a: 1, b: 1, c: -1 }, 4);
    expect(t).toMatchObject({ yes: 2, no: 1, total: 4, needed: 3 });
    expect(t.progress).toBeCloseTo(2 / 3);
  });
  it('never fills past the full bar', () => {
    expect(voteTally({ a: 1, b: 1, c: 1, d: 1 }, 4).progress).toBe(1);
  });
});

describe('newlyLocked', () => {
  const before = statusMap([act('a', '2026-10-23', '10:00', { status: 'voting' }), act('b', '2026-10-23', '11:00', { status: 'voting' }), act('c', '2026-10-23', '12:00')]);
  it('finds the items that went from voting to confirmed', () => {
    const now = [act('a', '2026-10-23', '10:00'), act('b', '2026-10-23', '11:00', { status: 'voting' }), act('c', '2026-10-23', '12:00')];
    expect(newlyLocked(before, now).map((a) => a.id)).toEqual(['a']);
  });
  it('does not count items that were already confirmed, or that are new', () => {
    const now = [act('c', '2026-10-23', '12:00'), act('new', '2026-10-23', '13:00'), act('a', '2026-10-23', '10:00', { status: 'voting' })];
    expect(newlyLocked(before, now)).toEqual([]);
  });
  it('does not count a move to pending', () => {
    expect(newlyLocked(before, [act('a', '2026-10-23', '10:00', { status: 'pending' })])).toEqual([]);
  });
  it('compares whole status maps', () => {
    expect(sameStatuses(before, { ...before })).toBe(true);
    expect(sameStatuses(before, { ...before, a: 'confirmed' })).toBe(false);
    expect(sameStatuses(before, { ...before, z: 'voting' })).toBe(false);
  });
});

describe('duration steps', () => {
  it('names the lengths', () => {
    expect(durationText(30)).toBe('30m');
    expect(durationText(60)).toBe('1h');
    expect(durationText(90)).toBe('1h 30m');
    expect(durationText(300)).toBe('Half day');
    expect(durationText(480)).toBe('Full day');
    expect(durationText(75)).toBe('1h 15m');
  });
  it('steps up and down and stops at the ends', () => {
    expect(stepDuration(90, 1)).toBe(120);
    expect(stepDuration(90, -1)).toBe(60);
    expect(stepDuration(480, 1)).toBe(480);
    expect(stepDuration(30, -1)).toBe(30);
  });
  it('steps from an odd length to the next one in that direction', () => {
    expect(stepDuration(75, 1)).toBe(90);
    expect(stepDuration(75, -1)).toBe(60);
    expect(stepDuration(1000, -1)).toBe(480);
  });
  it('keeps the list sorted', () => {
    expect([...DURATIONS]).toEqual([...DURATIONS].sort((a, b) => a - b));
  });
});
