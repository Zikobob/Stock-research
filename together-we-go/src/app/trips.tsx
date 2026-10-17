import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AvatarStack, EmptyState, Pill } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { totalSpent, tripStatus, useAppStore, useMyTrips } from '@/store/useAppStore';
import type { Trip, TripStatus } from '@/store/types';
import { colors, radius, shadow } from '@/theme';
import { money } from '@/utils/format';
import { rangeLabel } from '@/utils/time';

const ORDER: { key: TripStatus; title: string }[] = [
  { key: 'active', title: 'In progress' },
  { key: 'planning', title: 'Upcoming' },
  { key: 'completed', title: 'Completed' },
];

export default function Trips() {
  const trips = useMyTrips();
  const activeId = useAppStore((s) => s.activeTripId);
  const setActive = useAppStore((s) => s.setActiveTrip);

  const open = (t: Trip) => {
    setActive(t.id);
    toast(`Switched to ${t.name}`);
    router.navigate('/(tabs)/itinerary');
  };

  return (
    <Screen header={<Header title="My trips" subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'} · plan, travel, remember`} />}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
        <Button label="New trip" icon="add" size="md" onPress={() => router.push('/new-trip')} style={{ flex: 1 }} />
        <Button label="Join with code" icon="people-outline" variant="secondary" size="md" onPress={() => router.push('/join')} style={{ flex: 1 }} />
      </View>
      {trips.length === 0 ? <EmptyState icon="airplane-outline" title="No trips yet" body="Create one or join a friend’s trip with their invite code." /> : null}
      {ORDER.map(({ key, title }) => {
        const list = trips.filter((t) => tripStatus(t) === key);
        if (!list.length) return null;
        return (
          <View key={key} style={{ marginBottom: 18, gap: 10 }}>
            <T variant="kicker" color={colors.textSecondary}>
              {title}
            </T>
            {list.map((t) => {
              const d = destinationById(t.destinationId);
              const isActive = t.id === activeId;
              return (
                <Press key={t.id} onPress={() => open(t)} style={[styles.card, isActive && styles.cardActive]} accessibilityLabel={`${t.name}${isActive ? ', current trip' : ''}`}>
                  <Image source={imageSource(t.cover)} style={styles.cover} contentFit="cover" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T variant="title" numberOfLines={1} style={{ flex: 1 }}>
                        {t.name}
                      </T>
                      {isActive ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
                    </View>
                    <T variant="caption" color={colors.textSecondary}>
                      {d?.city}, {d?.country}
                    </T>
                    <T variant="caption" color={colors.textSecondary}>
                      {rangeLabel(t.startDate, t.endDate)}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <AvatarStack people={t.members} max={4} size={22} />
                      <Pill label={`${money(totalSpent(t))} / ${money(t.budget)}`} tone="gray" />
                    </View>
                  </View>
                </Press>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardActive: { borderColor: colors.primary, borderWidth: 2 },
  cover: { width: 88, height: 96, borderRadius: radius.md },
});
