import { destinations } from '@/data/destinations';
import { layoutAnswers } from '@/data/layouts';
import type { Personal } from '@/store/types';

import { pickedForYou } from '../picks';

const personal = (over: Partial<Personal>): Personal => ({
  done: true,
  nickname: '',
  emoji: '✈️',
  interests: [],
  travelStyle: 'balanced',
  budgetStyle: 'mid',
  ...layoutAnswers('planner'),
  effects: 'lively',
  triviaReminder: false,
  motion: true,
  ...over,
});

describe('picked for you', () => {
  it('shows nothing until an interest is chosen', () => {
    expect(pickedForYou(personal({ interests: [] }))).toEqual([]);
  });

  it('only suggests places that match a chosen interest, best match first', () => {
    const picks = pickedForYou(personal({ interests: ['beach'] }));
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.length).toBeLessThanOrEqual(8);
    for (const { d } of picks) expect(d.tags).toContain('beach');
    const scores = picks.map((p) => p.match);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const { match } of picks) {
      expect(match).toBeGreaterThanOrEqual(0);
      expect(match).toBeLessThanOrEqual(99);
    }
  });

  it('matching more of the chosen interests scores higher', () => {
    const [top] = pickedForYou(personal({ interests: ['beach', 'food', 'adventure'] }));
    const hits = (tags: string[]) => ['beach', 'food', 'adventure'].filter((i) => tags.includes(i)).length;
    const bestPossible = Math.max(...destinations.map((d) => hits(d.tags)));
    expect(hits(top.d.tags)).toBe(bestPossible);
  });

  it('prefers cheaper places for savers and pricier ones for treats', () => {
    const avgPrice = (style: Personal['budgetStyle']) => {
      const picks = pickedForYou(personal({ interests: ['food', 'beach', 'culture'], budgetStyle: style })).slice(0, 4);
      return picks.reduce((n, p) => n + p.d.priceLevel, 0) / picks.length;
    };
    expect(avgPrice('saver')).toBeLessThanOrEqual(avgPrice('treat'));
  });

  it('explains each pick with the interest emoji and the country', () => {
    const [first] = pickedForYou(personal({ interests: ['food'] }));
    expect(first.why).toContain('🍜');
    expect(first.why).toContain(first.d.country);
  });
});
