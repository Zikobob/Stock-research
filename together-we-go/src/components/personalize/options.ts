import type { IconName } from '@/components/ui/bits';
import type { Effects, HomeSection } from '@/store/types';
import type { ModePref } from '@/theme/palettes';

/** Faces to pick from next to the nickname. */
export const EMOJIS = ['✈️', '🌴', '🏔️', '🍜', '📸', '🎒', '🌸', '🏄', '🚂', '🗺️', '🌙', '🦋'];

/** The numbered steps. The page after them is the summary with the build button. */
export const STEPS = ['Welcome', 'Look', 'Interests', 'Layout', 'Vibe'] as const;
export const STEP = { welcome: 0, look: 1, interests: 2, layout: 3, vibe: 4, summary: STEPS.length } as const;

export const MODES: { key: ModePref; label: string; icon: IconName }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export const EFFECT_OPTIONS: { key: Effects; label: string; emoji: string; sub: string }[] = [
  { key: 'chill', label: 'Chill', emoji: '😌', sub: 'No confetti, just a calm tick' },
  { key: 'lively', label: 'Lively', emoji: '🎉', sub: 'A little confetti when it counts' },
  { key: 'max', label: 'Max', emoji: '🪩', sub: 'Full party. Confetti everywhere' },
];

export const EFFECT_LABEL: Record<Effects, string> = { chill: 'Chill', lively: 'Lively', max: 'Max' };

/** What the little Home drawings say (the real names are in HOME_BLOCKS). */
export const BLOCK_SHORT: Record<HomeSection, string> = {
  upnext: 'Up next',
  weather: 'Weather',
  budget: 'Budget',
  crew: 'Crew',
  play: 'Play',
  forYou: 'For you',
  nearby: 'Nearby',
  discover: 'Discover',
};

/** The lines of the "Building your trip HQ" moment, in order. */
export const BUILD_LINES = ['Picking your colours', 'Arranging Home', 'Tuning the confetti'] as const;

export const BUDGET_OPTIONS: { key: 'saver' | 'mid' | 'treat'; label: string }[] = [
  { key: 'saver', label: 'Saver' },
  { key: 'mid', label: 'Mid-range' },
  { key: 'treat', label: 'Treat yo self' },
];
