/** Pieces the timeline row and the vote card share: the actions on an activity and the one-line facts under its title. */
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { StyleSheet } from 'react-native';

import type { IconName } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { convert, useRates } from '@/services/currency';
import type { Activity, Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';

import { durationText } from './plan';

/** "1h 30m · €55 pp": how long and how much, in plain mono text (the kicker voice uppercases it). */
export function useMetaLine(trip: Trip, a: Activity): string {
  const rates = useRates();
  const currency = destinationById(trip.destinationId)?.currency ?? 'USD';
  const cost = a.costPerPerson > 0 ? `${money(convert(a.costPerPerson, 'USD', currency, rates), currency)} pp` : 'Free';
  return `${durationText(a.durationMin)} · ${cost}`;
}

/** What you can do to one activity: open it in maps, ask before deleting. */
export function useActivityOps(trip: Trip, a: Activity) {
  const remove = useAppStore((s) => s.deleteActivity);
  const directions = () => {
    const q = a.lat && a.lng ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.title} ${a.location}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => toast('Couldn’t open maps', { tone: 'warn' }));
  };
  const askDelete = () =>
    confirmAction(
      'Delete activity?',
      `“${a.title}” will be removed for everyone.`,
      () => {
        remove(trip.id, a.id);
        toast('Activity deleted');
      },
      { confirmLabel: 'Delete', destructive: true },
    );
  return { directions, askDelete };
}

/** One quiet action: a line icon and a word, 48 points tall. */
export function ActionRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={styles.action} scaleTo={0.98}>
      <Ionicons name={icon} size={19} color={colors.ink} />
      <T variant="bodySm" weight="semibold">
        {label}
      </T>
    </Press>
  );
}

/** Delete: red words with a bin, at the bottom of the details and far from the buttons you press by habit. */
export function DeleteRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={`Delete ${title}`} style={styles.action} scaleTo={0.98}>
      <Ionicons name="trash-outline" size={19} color={colors.red} />
      <T variant="bodySm" weight="semibold" color={colors.red}>
        Delete
      </T>
    </Press>
  );
}

export const actionStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 },
});

const styles = StyleSheet.create({
  action: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, flexBasis: '46%', flexGrow: 1 },
});
