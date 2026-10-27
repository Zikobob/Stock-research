import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { AvatarStack, Card, EmptyState, SectionHeader } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Fab } from '@/components/ui/Fab';
import { Stamp } from '@/components/ui/Stamp';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { totalSpent, tripStatus, useAppStore, useMyTrips } from '@/store/useAppStore';
import type { Trip, TripStatus } from '@/store/types';
import { colors, line, radius, space } from '@/theme';
import { money } from '@/utils/format';
import { rangeLabel } from '@/utils/time';

const ORDER: { key: TripStatus; title: string }[] = [
  { key: 'active', title: 'In progress' },
  { key: 'planning', title: 'Upcoming' },
  { key: 'completed', title: 'Completed' },
];

/** Every trip the person is on, grouped by where it is in time. The trip you are looking at is stamped CURRENT and is the one card that stands up. */
export default function Trips() {
  const trips = useMyTrips();
  const activeId = useAppStore((s) => s.activeTripId);
  const setActive = useAppStore((s) => s.setActiveTrip);
  const insets = useSafeAreaInsets();

  const open = (t: Trip) => {
    setActive(t.id);
    toast(`Switched to ${t.name}`);
    router.navigate('/(tabs)/itinerary');
  };

  return (
    <Screen
      header={<Header kicker="Passport" title="My trips" subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'}`} />}
      fab={trips.length ? <Fab icon="add" label="New trip" accessibilityLabel="New trip" onPress={() => router.push('/new-trip')} /> : undefined}
      fabBottom={insets.bottom + 16}>
      {trips.length === 0 ? (
        <EmptyState icon="airplane-outline" title="No trips yet" body="Create one or join a friend’s trip with their invite code.">
          <View style={{ gap: 12 }}>
            <Button label="New trip" icon="add" onPress={() => router.push('/new-trip')} />
            <Button label="Join with code" icon="enter-outline" variant="secondary" onPress={() => router.push('/join')} />
          </View>
        </EmptyState>
      ) : (
        <Button label="Join with code" icon="enter-outline" variant="secondary" size="md" onPress={() => router.push('/join')} />
      )}
      {ORDER.map(({ key, title }) => {
        const list = trips.filter((t) => tripStatus(t) === key);
        if (!list.length) return null;
        return (
          <View key={key} style={{ marginTop: space.section }}>
            <SectionHeader title={title} />
            <View style={{ gap: 16 }}>
              {list.map((t) => {
                const d = destinationById(t.destinationId);
                const isActive = t.id === activeId;
                return (
                  <Card key={t.id} plated={isActive} padded={false} onPress={() => open(t)} accessibilityLabel={`${t.name}${isActive ? ', current trip' : ''}`}>
                    <View style={styles.row}>
                      <Image source={imageSource(t.cover)} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors />
                      <View style={styles.text}>
                        {isActive ? <Stamp label="Current" tone="accent" icon="checkmark" rotate={0} /> : null}
                        <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
                          {d ? `${d.city}, ${d.country}` : 'Somewhere great'}
                        </T>
                        <T variant="h3" numberOfLines={2}>
                          {t.name}
                        </T>
                        <T variant="small" color={colors.textSecondary}>
                          {rangeLabel(t.startDate, t.endDate)}
                        </T>
                        <View style={styles.meta}>
                          <AvatarStack people={t.members} max={4} size={26} />
                          <T variant="kicker" color={colors.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {money(totalSpent(t))} / {money(t.budget)}
                          </T>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, padding: 12 },
  cover: { width: 92, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, alignSelf: 'stretch', minHeight: 112 },
  text: { flex: 1, gap: 3, justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
});
