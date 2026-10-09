import type { IconName } from '@/components/ui/bits';
import type { PlaceCategory } from '@/data/places';
import type { ActivityStatus, ActivityType, ExpenseCategory } from '@/store/types';
import { colors } from '@/theme';

export const activityTypes: { key: ActivityType; label: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'transport', label: 'Transport', icon: 'train-outline', color: '#2B5FB0', bg: colors.blueSoft },
  { key: 'stay', label: 'Stay', icon: 'bed-outline', color: colors.purple, bg: colors.purpleSoft },
  { key: 'food', label: 'Food', icon: 'restaurant-outline', color: '#C2410C', bg: colors.orangeSoft },
  { key: 'sightseeing', label: 'Sightseeing', icon: 'camera-outline', color: colors.teal, bg: colors.tealSoft },
  { key: 'culture', label: 'Culture', icon: 'business-outline', color: '#8B5E0F', bg: colors.yellowSoft },
  { key: 'adventure', label: 'Adventure', icon: 'bonfire-outline', color: colors.primary, bg: colors.primarySoft },
  { key: 'nightlife', label: 'Nightlife', icon: 'musical-notes-outline', color: '#B4235A', bg: '#FCE4EE' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', color: '#5B4AB8', bg: colors.purpleSoft },
];

export const typeMeta = (t: ActivityType) => activityTypes.find((x) => x.key === t) ?? activityTypes[3];

export const statusMeta: Record<ActivityStatus, { tone: 'green' | 'orange' | 'blue'; key: string; dot: string }> = {
  confirmed: { tone: 'green', key: 'itin.confirmed', dot: colors.primary },
  voting: { tone: 'orange', key: 'itin.voting', dot: colors.orange },
  pending: { tone: 'blue', key: 'itin.pending', dot: colors.blue },
};

/** Map place categories (Nearby) onto itinerary activity types. */
export const placeToActivityType: Record<PlaceCategory, ActivityType> = {
  food: 'food',
  sightseeing: 'sightseeing',
  adventure: 'adventure',
  culture: 'culture',
  nightlife: 'nightlife',
  shopping: 'shopping',
  relax: 'sightseeing',
};

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
