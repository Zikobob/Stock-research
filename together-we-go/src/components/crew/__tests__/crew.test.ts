import type { Poll } from '@/store/types';

import { barcodeBars } from '../barcode';
import { pollView } from '../polls';

const poll = (votes: string[][], closed = false): Poll => ({
  id: 'p1',
  question: 'Where to eat?',
  createdBy: 'a',
  createdAt: 0,
  closed,
  options: votes.map((v, i) => ({ id: `o${i}`, text: `Option ${i}`, votes: v })),
});

describe('pollView', () => {
  it('counts votes and rounds the percentages', () => {
    const v = pollView(poll([['a', 'b'], ['c'], []]), 'c');
    expect(v.total).toBe(3);
    expect(v.rows.map((r) => r.pct)).toEqual([67, 33, 0]);
    expect(v.rows.map((r) => r.mine)).toEqual([false, true, false]);
  });

  it('has no percentages and no winner before anyone votes', () => {
    const v = pollView(poll([[], []]), 'a');
    expect(v.rows.map((r) => r.pct)).toEqual([0, 0]);
    expect(v.winnerId).toBeNull();
    expect(v.tie).toBe(false);
  });

  it('names the winner only when one option is clearly ahead', () => {
    expect(pollView(poll([['a', 'b'], ['c']]), 'a').winnerId).toBe('o0');
    const level = pollView(poll([['a'], ['b']]), 'a');
    expect(level.winnerId).toBeNull();
    expect(level.tie).toBe(true);
  });

  it('says OPEN while voting, LOCKED IN with a winner and CLOSED without one', () => {
    expect(pollView(poll([['a'], []]), 'a').stamp).toBe('open');
    expect(pollView(poll([['a'], []], true), 'a').stamp).toBe('locked');
    expect(pollView(poll([['a'], ['b']], true), 'a').stamp).toBe('closed');
    expect(pollView(poll([[], []], true), 'a').stamp).toBe('closed');
  });

  it('lists voters in the order of the trip members', () => {
    const v = pollView(poll([['c', 'a', 'b']]), 'a', ['a', 'b', 'c']);
    expect(v.rows[0].voters).toEqual(['a', 'b', 'c']);
  });
});

describe('barcodeBars', () => {
  it('is the same strip for the same code and a different one for another code', () => {
    expect(barcodeBars('AML-2026')).toEqual(barcodeBars('AML-2026'));
    expect(barcodeBars('AML-2026')).not.toEqual(barcodeBars('SEO-5521'));
  });

  it('starts and ends on a bar (an odd number of parts) with weights from 1 to 4', () => {
    for (const n of [40, 41]) {
      const bars = barcodeBars('AML-2026', n);
      expect(bars.length % 2).toBe(1);
      expect(Math.min(...bars)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...bars)).toBeLessThanOrEqual(4);
    }
  });

  it('has thin guard bars at both ends', () => {
    const bars = barcodeBars('XYZ-0000');
    expect(bars.slice(0, 3)).toEqual([1, 1, 1]);
    expect(bars.slice(-3)).toEqual([1, 1, 1]);
  });
});
