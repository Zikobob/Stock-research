import { destinations } from '@/data/destinations';
import type { SurveyQuestion } from '@/data/reference';
import type { IconName } from '@/components/ui/bits';

export interface Match {
  id: string;
  match: number;
}

/** Scores every destination against the answers (tag matches + budget fit + rating) and returns the best five with a 70 to 99 match. */
export function recommend(answers: string[][]): Match[] {
  const tags = answers.flat();
  const budgetTag = tags.find((t) => t.startsWith('$'));
  const budget = budgetTag ? Number(budgetTag.slice(1)) : 2;
  const scored = destinations.map((d) => {
    let s = 0;
    for (const t of tags) if (!t.startsWith('$') && d.tags.includes(t as never)) s += 2;
    s -= Math.abs(d.priceLevel - budget) * 1.5;
    s += (d.rating - 4.5) * 4;
    return { id: d.id, s };
  });
  const max = Math.max(...scored.map((x) => x.s));
  const min = Math.min(...scored.map((x) => x.s));
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => ({ id: x.id, match: Math.round(70 + ((x.s - min) / Math.max(1, max - min)) * 29) }));
}

/** The picture on an answer tile: a bundled photo, a line icon, or a few characters in mono (the dollar signs of a budget). */
export type OptionArt = { photo: string } | { icon: IconName } | { glyph: string };

const ART: Record<string, OptionArt> = {
  'vibe:City lights': { photo: 'shibuya' },
  'vibe:Beach & sun': { photo: 'maldives' },
  'vibe:Mountains & trails': { photo: 'swiss-alps' },
  'vibe:History & culture': { photo: 'rome' },
  'food:It’s the whole point': { icon: 'restaurant-outline' },
  'food:Love a good meal': { icon: 'pizza-outline' },
  'food:Fuel for adventures': { icon: 'nutrition-outline' },
  'food:Not fussed': { icon: 'hand-left-outline' },
  'budget:Under $90': { glyph: '$' },
  'budget:$90 – $160': { glyph: '$$' },
  'budget:$160 – $230': { glyph: '$$$' },
  'budget:Treat ourselves': { glyph: '$$$$' },
  'pace:Packed schedule': { icon: 'flash-outline' },
  'pace:Balanced': { icon: 'scale-outline' },
  'pace:Slow & relaxed': { icon: 'leaf-outline' },
  'pace:Spontaneous': { icon: 'dice-outline' },
  'who:Friends': { icon: 'people-outline' },
  'who:Family with kids': { icon: 'home-outline' },
  'who:Partner': { icon: 'heart-outline' },
  'who:Classmates / club': { icon: 'school-outline' },
};

/** The art for one answer; an answer with no art of its own gets a plain compass. */
export function optionArt(q: Pick<SurveyQuestion, 'id'>, label: string): OptionArt {
  return ART[`${q.id}:${label}`] ?? { icon: 'compass-outline' };
}

/** True when `tags` is the answer already given for this step (so a tile can show it as chosen when you come back). */
export function sameAnswer(given: string[] | undefined, tags: string[]): boolean {
  return !!given && given.length === tags.length && given.every((t, i) => t === tags[i]);
}
