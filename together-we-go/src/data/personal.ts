import { photos } from '@/data/images';

import type { DestinationTag } from './destinations';

/** Travel interests offered in "Make it yours" — each maps to a destination tag. */
export const INTERESTS: {
  key: DestinationTag;
  label: string;
  emoji: string;
  image: keyof typeof photos;
}[] = [
  { key: 'food', label: 'Food & street eats', emoji: '🍜', image: 'ramen' },
  { key: 'adventure', label: 'Adventure', emoji: '🧗', image: 'banff' },
  { key: 'beach', label: 'Beaches', emoji: '🏖️', image: 'maldives' },
  { key: 'culture', label: 'Culture & history', emoji: '🏯', image: 'kyoto' },
  { key: 'nature', label: 'Nature escapes', emoji: '🌿', image: 'iceland' },
  { key: 'nightlife', label: 'Nightlife', emoji: '🌃', image: 'shibuya' },
  { key: 'best', label: 'Iconic sights', emoji: '📸', image: 'santorini' },
];
