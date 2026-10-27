import type { ImageSourcePropType } from 'react-native';

import { photos } from '@/data/images';

/**
 * The three first-run slides: one idea each. `lift` is how far (as a share of the screen height, 0 to 0.2) the photo is pulled up, so its
 * subject stays above the boarding pass that lies over the lower part of the screen.
 */
export interface Slide {
  key: 'plan' | 'split' | 'share';
  image: ImageSourcePropType;
  stamp: string;
  title: string;
  body: string;
  lift: number;
}

export const SLIDES: Slide[] = [
  { key: 'plan', image: photos['onboard-1'], stamp: 'Plan', title: 'Plan together', body: 'Add ideas, vote on them, and the winners go into one shared itinerary.', lift: 0.08 },
  { key: 'split', image: photos['onboard-2'], stamp: 'Split', title: 'Split the money', body: 'Log who paid for what. We work out who owes who, to the cent.', lift: 0.2 },
  { key: 'share', image: photos['onboard-3'], stamp: 'Share', title: 'Keep everyone in the loop', body: 'One chat, one checklist and one invite code for the whole crew.', lift: 0.1 },
];
