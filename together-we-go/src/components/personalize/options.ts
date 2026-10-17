import type { IconName } from '@/components/ui/bits';
import type { HomeSection, Personal } from '@/store/types';

export const EMOJIS = ['✈️', '🌴', '🏔️', '🍜', '📸', '🎒', '🌸', '🏄', '🚂', '🗺️', '🌙', '🦋'];

export const SECTIONS: { key: HomeSection; label: string; sub: string; icon: IconName }[] = [
  { key: 'glance', label: 'Weather & local time', sub: 'Two quick tiles under the hero', icon: 'partly-sunny-outline' },
  { key: 'budget', label: 'Group budget', sub: 'Spent so far with a progress bar', icon: 'wallet-outline' },
  { key: 'upnext', label: 'Up next & today', sub: 'Countdown and today’s checklist', icon: 'alarm-outline' },
  { key: 'quick', label: 'Quick tiles', sub: 'Vote, flights, docs and photos', icon: 'grid-outline' },
  { key: 'forYou', label: 'Picked for you', sub: 'Destinations matching your interests', icon: 'sparkles-outline' },
  { key: 'nearby', label: 'Nearby radius', sub: 'Places around your trip', icon: 'navigate-outline' },
  { key: 'discover', label: 'Discover destinations', sub: 'Photo cards to dream about', icon: 'images-outline' },
];

export const PACE: {
  key: Personal['travelStyle'];
  label: string;
  emoji: string;
  sub: string;
}[] = [
  {
    key: 'chill',
    label: 'Chill',
    emoji: '🧘',
    sub: '2–3 things a day, long lunches',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    sub: 'A plan, with room to wander',
  },
  {
    key: 'packed',
    label: 'Packed',
    emoji: '⚡',
    sub: 'See everything, sleep later',
  },
];
export const BUDGET: {
  key: Personal['budgetStyle'];
  label: string;
  emoji: string;
  sub: string;
}[] = [
  { key: 'saver', label: 'Saver', emoji: '🪙', sub: 'Street food & hostels' },
  { key: 'mid', label: 'Mid-range', emoji: '💳', sub: 'Comfy, not crazy' },
  {
    key: 'treat',
    label: 'Treat yo self',
    emoji: '💎',
    sub: 'Splurge on the good stuff',
  },
];

export const STEPS = ['Hello', 'Vibe', 'Interests', 'Style', 'Home', 'You', 'Done'] as const;
