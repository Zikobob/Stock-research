import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { destinationById, type Destination } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, radius, shadow } from '@/theme';
import { money } from '@/utils/format';

import { Chip, ListRow } from './ui/bits';
import { toast } from './ui/feedback';
import { Press, tap } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

export function FavStar({ id, size = 30 }: { id: string; size?: number }) {
  const fav = useAppStore((s) => s.favorites.includes(id));
  const toggle = useAppStore((s) => s.toggleFavorite);
  return (
    <Press
      onPress={() => {
        toggle(id);
        tap();
        toast(fav ? 'Removed from favourites' : 'Saved to favourites ⭐', { icon: fav ? 'star-outline' : 'star' });
      }}
      hitSlop={6}
      accessibilityLabel={fav ? 'Remove favourite' : 'Save as favourite'}
      style={[styles.star, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={fav ? 'star' : 'star-outline'} size={size * 0.5} color={fav ? colors.star : colors.white} />
    </Press>
  );
}

export function PlaceCard({ d, style, height = 190 }: { d: Destination; style?: StyleProp<ViewStyle>; height?: number }) {
  return (
    <Press onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} style={[styles.place, { height }, style]} accessibilityLabel={`${d.city}, ${d.country}, rated ${d.rating}`}>
      <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: 10, right: 10 }}>
        <FavStar id={d.id} />
      </View>
      <View style={styles.placeText}>
        <T variant="title" weight="bold" color={colors.white} numberOfLines={1}>
          {d.city}
        </T>
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.85)" />
          <T variant="micro" color="rgba(255,255,255,0.85)" numberOfLines={1} style={{ flex: 1 }}>
            {d.country}
          </T>
          <Ionicons name="star" size={10} color={colors.star} />
          <T variant="micro" weight="bold" color={colors.white}>
            {d.rating.toFixed(1)}
          </T>
        </View>
      </View>
    </Press>
  );
}

export function AddToTripSheet({ destinationId, onClose }: { destinationId: string | null; onClose: () => void }) {
  const trip = useActiveTrip();
  const updateTrip = useAppStore((s) => s.updateTrip);
  const addBucket = useAppStore((s) => s.addBucket);
  const d = destinationId ? destinationById(destinationId) : undefined;
  if (!d) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const already = trip && (trip.destinationId === d.id || trip.extraDestinationIds.includes(d.id));
  return (
    <Sheet visible={!!destinationId} onClose={onClose} title={`Add ${d.city}`} subtitle={`${d.country} · ★ ${d.rating} · ~${money(d.dailyCost)}/day per person`}>
      {trip ? (
        <ListRow
          icon="add-circle-outline"
          label={already ? `Already part of ${trip.name}` : `Add as a stop on “${trip.name}”`}
          sub={already ? 'Its places show up in Nearby and the assistant' : 'Its places appear in Nearby, the map and assistant suggestions'}
          onPress={() => {
            if (!already) {
              updateTrip(trip.id, { extraDestinationIds: [...trip.extraDestinationIds, d.id] });
              toast(`${d.city} added to ${trip.name}`);
            }
            onClose();
          }}
        />
      ) : null}
      <ListRow
        icon="airplane-outline"
        label="Start a new group trip here"
        sub="Pick dates, set a budget and invite friends"
        onPress={() => {
          onClose();
          setTimeout(() => router.push({ pathname: '/new-trip', params: { destination: d.id } }), 180);
        }}
      />
      <ListRow
        icon="flag-outline"
        label="Save to bucket list"
        onPress={() => {
          addBucket(`Visit ${d.city}, ${d.country}`, d.id);
          toast('Saved to your bucket list');
          onClose();
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {d.highlights.slice(0, 4).map((h) => (
          <Chip key={h} small tone="soft" label={h} />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  star: { backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  place: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bgAlt },
  placeText: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  featured: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow },
  featBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  shareBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
