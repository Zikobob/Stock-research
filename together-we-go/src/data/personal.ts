import { photos } from '@/data/images';

import type { DestinationTag } from './destinations';

/** The eight interests offered in "Make it yours" (a photo tile each). The key is a destination tag, so "Picked for you" works for every one. */
export const INTERESTS: {
  key: DestinationTag;
  label: string;
  /** One short line under the label (for a screen reader, and where there is room). */
  sub: string;
  emoji: string;
  image: keyof typeof photos;
}[] = [
  { key: 'food', label: 'Food', sub: 'Street eats and long dinners', emoji: '🍜', image: 'ramen' },
  { key: 'nightlife', label: 'Nightlife', sub: 'Bars, music and late nights', emoji: '🌃', image: 'shibuya' },
  { key: 'nature', label: 'Nature', sub: 'Mountains, lakes and quiet trails', emoji: '🌿', image: 'iceland' },
  { key: 'culture', label: 'Culture', sub: 'Museums and history', emoji: '🏛️', image: 'rome' },
  { key: 'beach', label: 'Beaches', sub: 'Sand, sea and sunsets', emoji: '🏖️', image: 'maldives' },
  { key: 'adventure', label: 'Adventure', sub: 'Hikes, boats and big views', emoji: '🧗', image: 'banff' },
  { key: 'shopping', label: 'Shopping', sub: 'Markets and boutiques', emoji: '🛍️', image: 'marrakech' },
  { key: 'chill', label: 'Chill', sub: 'Slow mornings, no rush', emoji: '🧘', image: 'santorini' },
];

/** "Pick 3 or more": the goal that makes "Picked for you" good. Picking fewer (or none) is fine. */
export const INTEREST_GOAL = 3;

/** The line under the interest tiles: says how far along the person is, never blocks them. */
export function interestHint(count: number): string {
  if (count <= 0) return `Pick ${INTEREST_GOAL} or more`;
  if (count < INTEREST_GOAL) return `${count} picked · ${INTEREST_GOAL - count} more is perfect`;
  return `${count} picked · nice`;
}

/** The daily trivia nudge: a local notification at this time every day, if the person switched it on. */
export const TRIVIA_REMINDER = {
  id: 'trivia-daily',
  hour: 18,
  minute: 0,
  title: '🧠 Today’s trivia is waiting',
  body: 'One question, one minute. Keep your streak going.',
  /** Shown under the switch. */
  timeLabel: '6 pm',
} as const;
