/** Pure helpers for the Home blocks list in Settings. No React Native in here, so tests can check it. */
import { ALL_SECTIONS, HOME_BLOCKS, layoutOf, moveSection } from '@/data/layouts';
import type { HomeLayout, HomeSection } from '@/store/types';

export interface BlockAnswers {
  order: HomeSection[];
  sections: Record<HomeSection, boolean>;
}

/** Every Home block in the saved order: unknown names are dropped, and a block a later version added is put at the end. */
export function allBlocks(order: string[]): HomeSection[] {
  const known = order.filter((k): k is HomeSection => k in HOME_BLOCKS);
  return [...known, ...ALL_SECTIONS.filter((k) => !known.includes(k))];
}

/** The answers after moving one block up (-1) or down (1). The layout becomes 'custom' unless that happens to match a ready-made one. */
export function movedBlock(a: BlockAnswers, key: HomeSection, by: -1 | 1): BlockAnswers & { layout: HomeLayout } {
  const order = moveSection(allBlocks(a.order), key, by);
  return { order, sections: a.sections, layout: layoutOf({ order, sections: a.sections }) };
}

/** The answers after switching one block on or off. */
export function switchedBlock(a: BlockAnswers, key: HomeSection, on: boolean): BlockAnswers & { layout: HomeLayout } {
  const order = allBlocks(a.order);
  const sections = { ...a.sections, [key]: on };
  return { order, sections, layout: layoutOf({ order, sections }) };
}

/** How many blocks Home is showing. */
export function shownCount(a: BlockAnswers): number {
  return allBlocks(a.order).filter((k) => a.sections[k]).length;
}
