import { surveyQuestions } from '@/data/reference';
import { destinations } from '@/data/destinations';
import { photos } from '@/data/images';

import { optionArt, recommend, sameAnswer } from '../recommend';

describe('recommend', () => {
  it('returns five different destinations with a match from 70 to 99, best first', () => {
    const r = recommend([['beach', 'romantic'], ['food'], ['$3'], ['beach'], ['romantic']]);
    expect(r).toHaveLength(5);
    expect(new Set(r.map((x) => x.id)).size).toBe(5);
    for (const x of r) {
      expect(x.match).toBeGreaterThanOrEqual(70);
      expect(x.match).toBeLessThanOrEqual(99);
      expect(destinations.some((d) => d.id === x.id)).toBe(true);
    }
    expect(r[0].match).toBeGreaterThanOrEqual(r[4].match);
  });

  it('works with no answers at all', () => {
    expect(recommend([])).toHaveLength(5);
  });
});

describe('option art', () => {
  it('gives every answer in the survey its own art', () => {
    for (const q of surveyQuestions) for (const o of q.options) expect(optionArt(q, o.label)).not.toEqual({ icon: 'compass-outline' });
  });
  it('only uses photos the app ships', () => {
    for (const q of surveyQuestions) for (const o of q.options) {
      const a = optionArt(q, o.label);
      if ('photo' in a) expect(Object.keys(photos)).toContain(a.photo);
    }
  });
  it('falls back to a compass', () => {
    expect(optionArt({ id: 'nope' }, 'nothing')).toEqual({ icon: 'compass-outline' });
  });
});

describe('sameAnswer', () => {
  it('matches the same tags in the same order', () => {
    expect(sameAnswer(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameAnswer(['a'], ['a', 'b'])).toBe(false);
    expect(sameAnswer(undefined, ['a'])).toBe(false);
  });
});
