import type { ChatMessage } from '@/store/types';

import { clock, continues, dayHeading, endsRun, localYmd, startsDay, systemLine } from '../logic';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const msg = (authorId: string, ts: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id: `${authorId}${ts}`, authorId, text: 'hi', ts, ...extra });

describe('chat times', () => {
  it('reads the clock in 12 hour form', () => {
    expect(clock(at(27, 15, 42))).toBe('3:42 PM');
    expect(clock(at(27, 0, 5))).toBe('12:05 AM');
    expect(clock(at(27, 12, 0))).toBe('12:00 PM');
  });

  it('names today and yesterday, otherwise the weekday and date', () => {
    const now = at(27, 18);
    expect(dayHeading(at(27, 9), now)).toBe('Today');
    expect(dayHeading(at(26, 23, 59), now)).toBe('Yesterday');
    expect(dayHeading(at(20, 9), now)).toBe('Tue Oct 20');
  });

  it('uses the local calendar date', () => {
    expect(localYmd(at(5, 23, 59))).toBe('2026-10-05');
  });
});

describe('chat runs', () => {
  it('starts a new day heading on the first message and when the date changes', () => {
    expect(startsDay(msg('a', at(26, 20)), undefined)).toBe(true);
    expect(startsDay(msg('a', at(27, 8)), msg('a', at(26, 20)))).toBe(true);
    expect(startsDay(msg('a', at(26, 21)), msg('a', at(26, 20)))).toBe(false);
  });

  it('groups one person within five minutes, not across people, long gaps, days or system lines', () => {
    const a = msg('a', at(27, 10, 0));
    expect(continues(msg('a', at(27, 10, 4)), a)).toBe(true);
    expect(continues(msg('a', at(27, 10, 6)), a)).toBe(false);
    expect(continues(msg('b', at(27, 10, 1)), a)).toBe(false);
    expect(continues(msg('a', at(27, 10, 1), { kind: 'system' }), a)).toBe(false);
    expect(continues(msg('a', at(28, 0, 1)), msg('a', at(27, 23, 59)))).toBe(false);
  });

  it('puts the clock time on the last bubble of a run', () => {
    const a = msg('a', at(27, 10, 0));
    const a2 = msg('a', at(27, 10, 2));
    expect(endsRun(a, a2)).toBe(false);
    expect(endsRun(a2, undefined)).toBe(true);
    expect(endsRun(a2, msg('b', at(27, 10, 3)))).toBe(true);
  });
});

describe('systemLine', () => {
  it('drops emoji the app itself wrote and tidies the spaces', () => {
    expect(systemLine('Sam joined the trip 👋')).toBe('Sam joined the trip');
    expect(systemLine('New poll: Where to eat? 🍝')).toBe('New poll: Where to eat?');
    expect(systemLine('Plain line')).toBe('Plain line');
  });
});
