import { quizQuestions } from '@/data/reference';

import { dailyQuestion, nextStreak } from '../trivia';

describe('daily trivia', () => {
  it('gives everyone the same question on the same day', () => {
    expect(dailyQuestion('2026-10-23')).toBe(dailyQuestion('2026-10-23'));
  });

  it('always picks a real question, and changes from day to day', () => {
    const days = Array.from({ length: 12 }, (_, i) => `2026-10-${String(10 + i).padStart(2, '0')}`);
    const picked = days.map((d) => dailyQuestion(d));
    for (const q of picked) expect(quizQuestions).toContain(q);
    expect(new Set(picked).size).toBeGreaterThan(3);
  });

  it('grows the streak on consecutive days and restarts it after a gap', () => {
    expect(nextStreak(0, null, '2026-10-23', true)).toBe(1);
    expect(nextStreak(1, '2026-10-23', '2026-10-24', true)).toBe(2);
    expect(nextStreak(5, '2026-10-20', '2026-10-24', true)).toBe(1);
  });

  it('ends the streak on a wrong answer', () => {
    expect(nextStreak(4, '2026-10-23', '2026-10-24', false)).toBe(0);
  });
});
