import type { IconName } from '@/components/ui/bits';
import { photos } from '@/data/images';

import type { DestinationTag } from './destinations';

/** The eight interests offered in "Make it yours" (a photo tile each). The key is a destination tag, so "Picked for you" works for every one. */
export const INTERESTS: {
  key: DestinationTag;
  label: string;
  /** One short line under the label (for a screen reader, and where there is room). */
  sub: string;
  /** The line icon drawn next to the label. */
  icon: IconName;
  image: keyof typeof photos;
}[] = [
  { key: 'food', label: 'Food', sub: 'Street eats and long dinners', icon: 'restaurant-outline', image: 'ramen' },
  { key: 'nightlife', label: 'Nightlife', sub: 'Bars, music and late nights', icon: 'musical-notes-outline', image: 'shibuya' },
  { key: 'nature', label: 'Nature', sub: 'Mountains, lakes and quiet trails', icon: 'leaf-outline', image: 'iceland' },
  { key: 'culture', label: 'Culture', sub: 'Museums and history', icon: 'library-outline', image: 'rome' },
  { key: 'beach', label: 'Beaches', sub: 'Sand, sea and sunsets', icon: 'sunny-outline', image: 'maldives' },
  { key: 'adventure', label: 'Adventure', sub: 'Hikes, boats and big views', icon: 'compass-outline', image: 'banff' },
  { key: 'shopping', label: 'Shopping', sub: 'Markets and boutiques', icon: 'bag-handle-outline', image: 'marrakech' },
  { key: 'chill', label: 'Chill', sub: 'Slow mornings, no rush', icon: 'cafe-outline', image: 'santorini' },
];

/** "Pick 3 or more": the goal that makes "Picked for you" good. Picking fewer (or none) is fine. */
export const INTEREST_GOAL = 3;

/** The line under the interest tiles: says how far along the person is, never blocks them. */
export function interestHint(count: number): string {
  if (count <= 0) return `Pick ${INTEREST_GOAL} or more`;
  if (count < INTEREST_GOAL) return `${count} picked · ${INTEREST_GOAL - count} more is perfect`;
  return `${count} picked · nice`;
}

/** The names of what the person picked, for a summary line ("Food, Beaches, Chill"). Nothing picked means everything is shown. */
export function interestNames(keys: string[]): string {
  const names = INTERESTS.filter((i) => keys.includes(i.key)).map((i) => i.label);
  return names.length ? names.join(', ') : 'A bit of everything';
}

/** The daily trivia nudge: a local notification at this time every day, if the person switched it on. */
export const TRIVIA_REMINDER = {
  id: 'trivia-daily',
  hour: 18,
  minute: 0,
  title: 'Today’s trivia is waiting',
  body: 'One question, one minute. Keep your streak going.',
  /** Shown under the switch. */
  timeLabel: '6 pm',
} as const;
