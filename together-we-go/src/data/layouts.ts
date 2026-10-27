import type { IconName } from '@/components/ui/bits';
import type { HomeLayout, HomeSection, Personal } from '@/store/types';

/** Every Home block, with what it shows (used by the layout editor in Settings and the "Make it yours" flow). */
export const HOME_BLOCKS: Record<HomeSection, { label: string; sub: string; icon: IconName }> = {
  upnext: { label: 'Up next', sub: 'The next thing on the plan, and today’s checklist', icon: 'alarm-outline' },
  weather: { label: 'Weather', sub: 'The days of your trip, and the time there', icon: 'partly-sunny-outline' },
  budget: { label: 'Group budget', sub: 'Spent so far, and who owes whom', icon: 'wallet-outline' },
  crew: { label: 'Your crew', sub: 'Who is coming, and an invite button', icon: 'people-outline' },
  play: { label: 'Play', sub: 'Today’s trivia, the leaderboard, a bucket-list vote', icon: 'game-controller-outline' },
  forYou: { label: 'Picked for you', sub: 'Places that match your interests', icon: 'sparkles-outline' },
  nearby: { label: 'Nearby', sub: 'Places around your trip', icon: 'navigate-outline' },
  discover: { label: 'Discover', sub: 'Photo cards to dream about', icon: 'images-outline' },
};

export const ALL_SECTIONS = Object.keys(HOME_BLOCKS) as HomeSection[];

export type Preset = Exclude<HomeLayout, 'custom'>;

/** The three ready-made layouts. Each lists every block in order; `off` are the ones it starts switched off. */
export const LAYOUTS: Record<Preset, { name: string; emoji: string; blurb: string; order: HomeSection[]; off: HomeSection[] }> = {
  planner: {
    name: 'Planner',
    emoji: '🗓️',
    blurb: 'The plan first: what is next, the weather, who is coming',
    order: ['upnext', 'weather', 'crew', 'budget', 'play', 'forYou', 'discover', 'nearby'],
    off: ['nearby'],
  },
  money: {
    name: 'Money',
    emoji: '💸',
    blurb: 'The budget first: spent, left, and who owes whom',
    order: ['budget', 'upnext', 'crew', 'weather', 'play', 'forYou', 'discover', 'nearby'],
    off: ['nearby', 'discover'],
  },
  party: {
    name: 'Party',
    emoji: '🎉',
    blurb: 'The fun first: trivia, the crew, then the plan',
    order: ['play', 'crew', 'upnext', 'budget', 'weather', 'forYou', 'discover', 'nearby'],
    off: ['nearby'],
  },
};

/** The `order`, `sections` and `layout` answers for a ready-made layout. */
export function layoutAnswers(preset: Preset): Pick<Personal, 'order' | 'sections' | 'layout'> {
  const l = LAYOUTS[preset];
  return { order: [...l.order], sections: Object.fromEntries(ALL_SECTIONS.map((k) => [k, !l.off.includes(k)])) as Record<HomeSection, boolean>, layout: preset };
}

/** The Home blocks that are switched on, top to bottom. */
export function visibleSections(p: Pick<Personal, 'order' | 'sections'>): HomeSection[] {
  const known = p.order.filter((k) => k in HOME_BLOCKS);
  const missing = ALL_SECTIONS.filter((k) => !known.includes(k)); // a block added by a later version still shows up
  return [...known, ...missing].filter((k) => p.sections[k]);
}

/** Which ready-made layout the answers still match (they become 'custom' as soon as one is changed by hand). */
export function layoutOf(p: Pick<Personal, 'order' | 'sections'>): HomeLayout {
  for (const key of Object.keys(LAYOUTS) as Preset[]) {
    const a = layoutAnswers(key);
    if (a.order.join() === p.order.join() && ALL_SECTIONS.every((k) => a.sections[k] === p.sections[k])) return key;
  }
  return 'custom';
}

/** Moves one block up or down in the order. */
export function moveSection(order: HomeSection[], key: HomeSection, by: -1 | 1): HomeSection[] {
  const i = order.indexOf(key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
