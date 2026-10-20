import type { Activity, Trip, WeatherSnapshot } from '@/store/types';
import { todayInTz, zonedToUtc } from '@/utils/time';

import {
  FORECAST_HORIZON_DAYS,
  answerState,
  blockHasContent,
  budgetView,
  celebrateKey,
  countdownView,
  crewCounts,
  crewCue,
  mapsUrl,
  nextPlanned,
  nextToVote,
  ordinal,
  oweLine,
  podiumView,
  shouldCelebrateOneDay,
  startsIn,
  timeLine,
  todaysChecklist,
  typicalDay,
  typicalIcon,
  voteTally,
  votingCount,
  weatherView,
} from '../logic';

const act = (over: Partial<Activity>): Activity => ({
  id: 'a',
  date: '2026-10-23',
  time: '10:00',
  title: 'Thing',
  location: 'Somewhere',
  type: 'food',
  durationMin: 60,
  costPerPerson: 0,
  status: 'confirmed',
  assigned: [],
  votes: {},
  reminder: false,
  createdBy: 'u1',
  ...over,
});

describe('the big headline', () => {
  it('counts the days to go, in the singular for one', () => {
    expect(countdownView('planning', 3, 0, 6)).toMatchObject({ kind: 'days', number: 3, words: ['Days', 'to go'], sentence: '3 days to go' });
    expect(countdownView('planning', 1, 0, 6)).toMatchObject({ number: 1, words: ['Day', 'to go'], sentence: '1 day to go' });
  });

  it('says TODAY on the first day of the trip', () => {
    expect(countdownView('active', 0, 1, 6)).toMatchObject({ kind: 'today', words: ['Today'] });
    expect(countdownView('planning', 0, 0, 6).kind).toBe('today');
  });

  it('says DAY 2 OF 5 while the trip is on', () => {
    expect(countdownView('active', -1, 2, 5)).toMatchObject({ kind: 'day', number: 2, prefix: 'Day', words: ['of 5'], sentence: 'Day 2 of 5' });
  });

  it('says TRIP COMPLETE when it is over and WHERE TO NEXT? with no trip', () => {
    expect(countdownView('completed', -9, 6, 6).words).toEqual(['Trip complete']);
    expect(countdownView(null, 0, 0, 0).words).toEqual(['Where to next?']);
  });
});

describe('celebrating "1 day to go" once', () => {
  it('fires on the last day before the trip, then not again', () => {
    expect(shouldCelebrateOneDay('planning', 1, {}, 't1', '2026-10-22')).toBe(true);
    const fired = { [celebrateKey('t1', '2026-10-22')]: Date.now() };
    expect(shouldCelebrateOneDay('planning', 1, fired, 't1', '2026-10-22')).toBe(false);
    expect(shouldCelebrateOneDay('planning', 1, fired, 't2', '2026-10-22')).toBe(true);
  });

  it('is quiet on every other day', () => {
    for (const days of [0, 2, 3, 30]) expect(shouldCelebrateOneDay('planning', days, {}, 't1', 'd')).toBe(false);
    expect(shouldCelebrateOneDay('active', 1, {}, 't1', 'd')).toBe(false);
    expect(shouldCelebrateOneDay(null, 1, {}, 't1', 'd')).toBe(false);
  });
});

describe('which blocks show', () => {
  const ctx = { hasTrip: true, status: 'planning' as const, hasPicks: true, hasDestination: true };
  it('hides the trip blocks when there is no trip, but keeps play and discover', () => {
    const none = { ...ctx, hasTrip: false, status: null };
    for (const k of ['upnext', 'weather', 'budget', 'crew', 'nearby'] as const) expect(blockHasContent(k, none)).toBe(false);
    expect(blockHasContent('play', none)).toBe(true);
    expect(blockHasContent('discover', none)).toBe(true);
  });

  it('drops up next and weather once the trip is over, keeps the budget and the crew', () => {
    const done = { ...ctx, status: 'completed' as const };
    expect(blockHasContent('upnext', done)).toBe(false);
    expect(blockHasContent('weather', done)).toBe(false);
    expect(blockHasContent('budget', done)).toBe(true);
    expect(blockHasContent('crew', done)).toBe(true);
  });

  it('shows Picked for you only when there are picks', () => {
    expect(blockHasContent('forYou', ctx)).toBe(true);
    expect(blockHasContent('forYou', { ...ctx, hasPicks: false })).toBe(false);
  });
});

describe('up next', () => {
  const tz = 'Europe/Rome';
  const noon = zonedToUtc('2026-10-23', '12:00', tz);

  it('picks the earliest planned activity that has not started', () => {
    const list = [act({ id: 'late', time: '19:00' }), act({ id: 'soon', time: '13:30' }), act({ id: 'past', time: '08:00' })];
    expect(nextPlanned(list, tz, noon)?.a.id).toBe('soon');
  });

  it('ignores things still being voted on and things already ticked off', () => {
    const list = [act({ id: 'vote', time: '12:30', status: 'voting' }), act({ id: 'done', time: '12:45', done: true }), act({ id: 'ok', time: '15:00' })];
    expect(nextPlanned(list, tz, noon)?.a.id).toBe('ok');
  });

  it('keeps something that began under half an hour ago, then moves on', () => {
    const list = [act({ id: 'now', time: '11:45' }), act({ id: 'next', time: '16:00' })];
    expect(nextPlanned(list, tz, noon)?.a.id).toBe('now');
    expect(nextPlanned(list, tz, zonedToUtc('2026-10-23', '12:30', tz))?.a.id).toBe('next');
  });

  it('returns null when nothing is planned', () => {
    expect(nextPlanned([], tz, noon)).toBeNull();
    expect(nextPlanned([act({ status: 'voting' })], tz, noon)).toBeNull();
  });

  it('words the countdown', () => {
    expect(startsIn(3 * 86400000 + 13 * 3600000)).toBe('in 3d 13h');
    expect(startsIn(95 * 60000)).toBe('in 1h 35m');
    expect(startsIn(20000)).toBe('in 1m');
    expect(startsIn(0)).toBe('Now');
    expect(startsIn(-5000)).toBe('Now');
  });

  it('links to the exact spot when it is known, otherwise searches for the name', () => {
    expect(mapsUrl({ lat: 40.6, lng: 14.4, title: 'X', location: 'Y' })).toBe('https://www.google.com/maps/search/?api=1&query=40.6,14.4');
    expect(mapsUrl({ title: 'Da Vincenzo', location: 'Viale Pasitea' })).toContain('query=Da%20Vincenzo%20Viale%20Pasitea');
  });

  it('builds today’s checklist in time order without voting items', () => {
    const list = [act({ id: 'b', time: '19:00' }), act({ id: 'a', time: '08:00' }), act({ id: 'v', time: '12:00', status: 'voting' }), act({ id: 'other', date: '2026-10-24' })];
    expect(todaysChecklist(list, '2026-10-23').map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('budget state', () => {
  it('is on track under 80%, close from 80% to 100%, over above 100%', () => {
    expect(budgetView(2086, 4000)).toMatchObject({ tone: 'ok', word: 'On track', pct: 52 });
    expect(budgetView(3199, 4000).tone).toBe('ok');
    expect(budgetView(3200, 4000)).toMatchObject({ tone: 'warn', word: 'Getting close' });
    expect(budgetView(4000, 4000).tone).toBe('warn');
    expect(budgetView(4001, 4000)).toMatchObject({ tone: 'over', word: 'Over budget' });
  });

  it('says it in words as well as colour', () => {
    expect(budgetView(2086, 4000).detail).toBe('52% used · $1,914 left');
    expect(budgetView(4250, 4000).detail).toBe('$250 over');
  });

  it('copes with no budget at all', () => {
    expect(budgetView(100, 0)).toMatchObject({ tone: 'ok', ratio: 0 });
  });
});

describe('who owes whom', () => {
  const members = [
    { id: 'me', name: 'Maya Chen', role: 'Member' },
    { id: 'p', name: 'Priya Patel', role: 'Member' },
    { id: 's', name: 'Sam Okafor', role: 'Member' },
  ] as Trip['members'];
  const exp = (paidBy: string, amount: number, extra: Partial<Trip['expenses'][number]> = {}) =>
    ({ id: `${paidBy}${amount}`, title: 'x', amount, category: 'Food', paidBy, splitBetween: ['me', 'p', 's'], date: '2026-10-01', ...extra }) as Trip['expenses'][number];

  it('says nothing to split before any spending', () => {
    expect(oweLine({ members, expenses: [] }, 'me')).toEqual({ tone: 'square', text: 'Nothing to split yet' });
  });

  it('names the person you owe', () => {
    expect(oweLine({ members, expenses: [exp('p', 300)] }, 'me')).toEqual({ tone: 'owe', text: 'You owe Priya $100' });
  });

  it('says who owes you, or how many people do', () => {
    expect(oweLine({ members, expenses: [exp('me', 300, { splitBetween: ['me', 'p'] })] }, 'me')).toEqual({ tone: 'owed', text: 'Priya owes you $150' });
    expect(oweLine({ members, expenses: [exp('me', 300)] }, 'me').text).toBe('You’re owed $200 by 2 people');
  });

  it('is square once settled', () => {
    const settled = [exp('p', 300), exp('me', 100, { settlement: true, splitBetween: ['p'] })];
    // Maya paid Priya back $100, so Maya is square; Sam still owes Priya
    expect(oweLine({ members, expenses: settled }, 'me').tone).not.toBe('owe');
    const all = [exp('p', 300), exp('me', 100, { settlement: true, splitBetween: ['p'] }), exp('s', 100, { settlement: true, splitBetween: ['p'] })];
    expect(oweLine({ members, expenses: all }, 'me')).toEqual({ tone: 'square', text: 'Everyone is square' });
  });
});

describe('crew cues', () => {
  it('marks a member added by name only as Invited, everyone else as Going', () => {
    expect(crewCue({ invited: true })).toBe('Invited');
    expect(crewCue({})).toBe('Going');
    expect(crewCounts([{}, {}, { invited: true }])).toEqual({ going: 2, invited: 1 });
  });
});

describe('ordinals', () => {
  it('writes 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 112th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 112].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '112th']);
  });
});

describe('the podium', () => {
  const s = (memberId: string, points: number) => ({ memberId, name: memberId.toUpperCase(), points });
  it('has nothing to show before anyone has points, or with one person', () => {
    expect(podiumView([s('a', 0), s('b', 0)], 'a')).toBeNull();
    expect(podiumView([s('a', 5)], 'a')).toBeNull();
  });

  it('lists the top three and no extra row when you are on the podium', () => {
    const v = podiumView([s('a', 9), s('b', 7), s('c', 3), s('d', 1)], 'b');
    expect(v?.top.map((x) => [x.memberId, x.rank])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    expect(v?.me).toBeNull();
  });

  it('adds your own row, with your rank, when you are outside the top three', () => {
    const v = podiumView([s('a', 9), s('b', 7), s('c', 3), s('d', 1)], 'd');
    expect(v?.me).toMatchObject({ memberId: 'd', rank: 4, points: 1 });
  });

  it('works with just two people', () => {
    expect(podiumView([s('a', 4), s('b', 1)], 'b')?.top).toHaveLength(2);
  });
});

describe('voting', () => {
  it('finds the first thing you have not voted on, earliest first', () => {
    const list = [
      act({ id: 'late', status: 'voting', date: '2026-10-26', time: '16:00' }),
      act({ id: 'voted', status: 'voting', date: '2026-10-26', time: '08:00', votes: { u1: 1 } }),
      act({ id: 'early', status: 'voting', date: '2026-10-26', time: '11:00' }),
      act({ id: 'plain' }),
    ];
    expect(nextToVote(list, 'u1')?.id).toBe('early');
    expect(nextToVote(list.filter((a) => a.id !== 'early' && a.id !== 'late'), 'u1')).toBeUndefined();
  });

  it('counts what is waiting for votes', () => {
    expect(votingCount([act({ status: 'voting' }), act({ status: 'voting' }), act({})])).toBe(2);
  });

  it('works out how many "in" votes lock it in (more than half)', () => {
    expect(voteTally({ votes: { a: 1, b: -1, c: 1 } }, 4)).toEqual({ ups: 2, downs: 1, needed: 3 });
    expect(voteTally({ votes: {} }, 5).needed).toBe(3);
  });
});

describe('trivia answers', () => {
  it('leaves every option open until an answer is picked', () => {
    expect([0, 1, 2, 3].map((i) => answerState(i, 2, null))).toEqual(['open', 'open', 'open', 'open']);
  });

  it('shows a right answer as right and dims the others', () => {
    expect([0, 1, 2, 3].map((i) => answerState(i, 2, 2))).toEqual(['dim', 'dim', 'right', 'dim']);
  });

  it('shows a wrong pick as wrong and reveals the right one', () => {
    expect([0, 1, 2, 3].map((i) => answerState(i, 2, 0))).toEqual(['wrong', 'dim', 'reveal', 'dim']);
  });
});

describe('weather', () => {
  const today = '2026-10-20';
  const snap = (live: boolean): WeatherSnapshot => ({
    destinationId: 'positano',
    fetchedAt: Date.now(),
    live,
    current: { temp: 20, code: 1, wind: 5, humidity: 50 },
    daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${20 + i}`, max: 22 + i, min: 14, code: 1, rain: 10 })),
  });

  it('shows the live forecast for the trip days it covers', () => {
    const v = weatherView({ startDate: '2026-10-23', endDate: '2026-10-28', today, lat: 40.6, snapshot: snap(true) });
    expect(v.kind).toBe('forecast');
    expect(v.title).toBe('Forecast');
    expect(v.days.map((d) => d.date)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
    expect(v.days[0]).toMatchObject({ max: 25, min: 14, code: 1 });
  });

  it('only shows days from today when the trip has begun', () => {
    const v = weatherView({ startDate: '2026-10-18', endDate: '2026-10-23', today, lat: 40.6, snapshot: snap(true) });
    expect(v.days.map((d) => d.date)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  });

  it(`says "Typical weather" when the trip is more than ${FORECAST_HORIZON_DAYS} days away`, () => {
    const v = weatherView({ startDate: '2026-11-15', endDate: '2026-11-20', today, lat: 40.6, snapshot: snap(true) });
    expect(v.kind).toBe('typical');
    expect(v.title).toBe('Typical weather');
    expect(v.note).toContain('November');
    expect(v.note).toContain(`${FORECAST_HORIZON_DAYS} days before`);
    expect(v.days).toHaveLength(6);
  });

  it('does not pass off an offline estimate as a forecast', () => {
    const v = weatherView({ startDate: '2026-10-23', endDate: '2026-10-28', today, lat: 40.6, snapshot: snap(false) });
    expect(v.kind).toBe('typical');
    expect(v.note).toContain('not available');
    expect(weatherView({ startDate: '2026-10-23', endDate: '2026-10-28', today, lat: 40.6, snapshot: undefined }).kind).toBe('typical');
  });

  it('shows at most seven days', () => {
    expect(weatherView({ startDate: '2027-03-01', endDate: '2027-03-20', today, lat: 10, snapshot: undefined }).days).toHaveLength(7);
  });

  it('has a sensible typical climate: warmer in summer, reversed in the south, warmer near the equator', () => {
    const jul = typicalDay(40.6, '2026-07-15');
    const jan = typicalDay(40.6, '2026-01-15');
    expect(jul.max).toBeGreaterThan(jan.max + 10);
    expect(jul.max).toBeGreaterThan(jul.min);
    expect(jul.max).toBeLessThan(35);
    expect(typicalDay(-33.9, '2026-01-15').max).toBeGreaterThan(typicalDay(-33.9, '2026-07-15').max);
    expect(typicalDay(-8.3, '2026-03-10').max).toBeGreaterThan(typicalDay(48.9, '2026-03-10').max);
    expect(Math.abs(typicalDay(-8.3, '2026-03-10').max - typicalDay(-8.3, '2026-09-10').max)).toBeLessThanOrEqual(4); // hardly any seasons near the equator
    expect(typicalDay(0, '2026-03-10').max).toBe(typicalDay(0, '2026-09-10').max);
  });

  it('picks an icon from the temperature', () => {
    expect([30, 20, 5].map(typicalIcon)).toEqual(['sunny', 'partly-sunny', 'cloud-outline']);
  });
});

describe('the clock line', () => {
  it('shows the time there and at home', () => {
    const at = Date.UTC(2026, 9, 20, 13, 41);
    expect(timeLine(at, 'Europe/Rome', 'America/New_York', 'Positano')).toBe('3:41 PM in Positano · 9:41 AM at home');
  });

  it('says so when it is the same time', () => {
    const at = Date.UTC(2026, 9, 20, 13, 41);
    expect(timeLine(at, 'Europe/Rome', 'Europe/Paris', 'Positano')).toContain('same as at home');
  });

  it('uses the destination’s own date for "today"', () => {
    expect(todayInTz('Europe/Rome')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
