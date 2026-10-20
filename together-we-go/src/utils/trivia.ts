import { quizQuestions, type QuizQuestion } from '@/data/reference';

import { addDays } from './time';

/** Today's question: the same one for everyone on a given day, a different one tomorrow. */
export function dailyQuestion(day: string, pool: QuizQuestion[] = quizQuestions): QuizQuestion {
  const n = day.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000003, 7);
  return pool[n % pool.length];
}

/** The streak after answering on `day`: it grows when yesterday was also answered right, restarts at 1 otherwise, and a wrong answer ends it. */
export function nextStreak(streak: number, lastCorrectDay: string | null, day: string, correct: boolean): number {
  if (!correct) return 0;
  return lastCorrectDay === addDays(day, -1) ? streak + 1 : 1;
}
