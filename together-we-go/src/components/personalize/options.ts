import type { IconName } from '@/components/ui/bits';
import type { Effects, HomeSection } from '@/store/types';
import type { ModePref } from '@/theme/palettes';

/** Faces to pick from for the person's own avatar (the one place emoji are allowed: they are the person's choice, not decoration). */
export const EMOJIS = ['✈️', '🌴', '🏔️', '🍜', '📸', '🎒', '🌸', '🏄', '🚂', '🗺️', '🌙', '🦋'];

/** The numbered steps. The page after them is the summary with the build button. */
export const STEPS = ['Welcome', 'Look', 'Interests', 'Layout', 'Vibe'] as const;
export const STEP = { welcome: 0, look: 1, interests: 2, layout: 3, vibe: 4, summary: STEPS.length } as const;

export const MODES: { key: ModePref; label: string; icon: IconName }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/** The three Effects settings. `bars` is how many of the three intensity bars are lit. */
export const EFFECT_OPTIONS: { key: Effects; label: string; sub: string; bars: 1 | 2 | 3 }[] = [
  { key: 'chill', label: 'Chill', sub: 'No confetti, just a calm tick', bars: 1 },
  { key: 'lively', label: 'Lively', sub: 'A little confetti when it counts', bars: 2 },
  { key: 'max', label: 'Max', sub: 'Full party. Confetti everywhere', bars: 3 },
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
