import type { IconName } from '@/components/ui/bits';
import type { PlaceCategory } from '@/data/places';
import type { ActivityStatus, ActivityType, ExpenseCategory } from '@/store/types';
import { colors } from '@/theme';

/**
 * What kind of thing an activity is. Each kind has one line icon; the colours are the same ink on paper for every kind
 * (the app does not colour-code kinds: colour is kept for states).
 */
export const activityTypes: { key: ActivityType; label: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'transport', label: 'Transport', icon: 'train-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'stay', label: 'Stay', icon: 'bed-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'food', label: 'Food', icon: 'restaurant-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'sightseeing', label: 'Sightseeing', icon: 'camera-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'culture', label: 'Culture', icon: 'business-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'adventure', label: 'Adventure', icon: 'bonfire-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'nightlife', label: 'Nightlife', icon: 'musical-notes-outline', color: colors.ink, bg: colors.bgAlt },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', color: colors.ink, bg: colors.bgAlt },
];

export const typeMeta = (t: ActivityType) => activityTypes.find((x) => x.key === t) ?? activityTypes[3];

export const statusMeta: Record<ActivityStatus, { tone: 'green' | 'orange' | 'blue'; key: string; dot: string }> = {
  confirmed: { tone: 'green', key: 'itin.confirmed', dot: colors.positive },
  voting: { tone: 'orange', key: 'itin.voting', dot: colors.orange },
  pending: { tone: 'blue', key: 'itin.pending', dot: colors.blue },
};

export { placeToActivityType } from '@/data/places';

export const placeCategoryIcon: Record<PlaceCategory, IconName> = {
  food: 'restaurant-outline',
  sightseeing: 'camera-outline',
  adventure: 'bonfire-outline',
  culture: 'business-outline',
  nightlife: 'musical-notes-outline',
  shopping: 'bag-handle-outline',
  relax: 'leaf-outline',
};

export const expenseCategories: { key: ExpenseCategory; icon: IconName }[] = [
  { key: 'Food', icon: 'restaurant-outline' },
  { key: 'Activities', icon: 'ticket-outline' },
  { key: 'Transport', icon: 'train-outline' },
  { key: 'Stays', icon: 'bed-outline' },
  { key: 'Flights', icon: 'airplane-outline' },
  { key: 'Shopping', icon: 'bag-handle-outline' },
  { key: 'Other', icon: 'ellipsis-horizontal' },
];

/** Filter chips for itinerary/nearby (the brief's "adventures, sightseeing, etc."). */
export const activityFilters: { key: 'all' | ActivityType; labelKey: string }[] = [
  { key: 'all', labelKey: 'cat.all' },
  { key: 'adventure', labelKey: 'cat.adventure' },
  { key: 'sightseeing', labelKey: 'cat.sightseeing' },
  { key: 'food', labelKey: 'cat.food' },
  { key: 'culture', labelKey: 'cat.culture' },
  { key: 'nightlife', labelKey: 'cat.nightlife' },
  { key: 'shopping', labelKey: 'cat.shopping' },
];

/** The line icon of an activity kind (use this, not emoji). */
export const typeIcon = (t: ActivityType): IconName => typeMeta(t).icon;
