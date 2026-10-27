import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { destinationById, type Destination } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';
import { money } from '@/utils/format';

import { ListRow } from './ui/bits';
import { toast } from './ui/feedback';
import { PlatePress } from './ui/Plate';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { Stamp } from './ui/Stamp';
import { T } from './ui/T';

/**
 * The favourite button: an outlined square (accent when saved) that sits NEXT TO a card's own button, never inside it.
 * It is always at least 44 x 44.
 */
export function FavStar({ id, size = 44 }: { id: string; size?: number }) {
  const fav = useAppStore((s) => s.favorites.includes(id));
  const toggle = useAppStore((s) => s.toggleFavorite);
  const face = Math.max(size, 44);
  return (
    <PlatePress
      onPress={() => {
        toggle(id);
        toast(fav ? 'Removed from favourites' : 'Saved to favourites', { icon: fav ? 'star-outline' : 'star' });
      }}
      accessibilityLabel={fav ? 'Remove favourite' : 'Save as favourite'}
      accessibilityState={{ selected: fav }}
      offset={3}
      corner={radius.button}
      style={[styles.star, { width: face, height: face, backgroundColor: fav ? colors.accent : colors.card }]}>
      <Ionicons name={fav ? 'star' : 'star-outline'} size={Math.round(face * 0.46)} color={fav ? colors.onAccent : colors.ink} />
    </PlatePress>
  );
}

/** A photo of a place in an ink outline, with the name over a dark scrim. */
export function PlaceCard({ d, style, height = 190 }: { d: Destination; style?: StyleProp<ViewStyle>; height?: number }) {
  return (
    // The star sits next to the card button, not inside it: on the web a button inside a button is invalid HTML.
    <View style={[styles.place, { height }, style]}>
      <Press onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} scaleTo={0.985} style={StyleSheet.absoluteFill} accessibilityLabel={`${d.city}, ${d.country}, rated ${d.rating}`}>
        <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.placeText} pointerEvents="none">
          <T variant="h3" color={colors.white} numberOfLines={1}>
            {d.city}
          </T>
          <View style={styles.row}>
            <T variant="kicker" color={colors.white} numberOfLines={1} style={{ flex: 1, fontSize: 10 }}>
              {d.country}
            </T>
            <Ionicons name="star" size={11} color={colors.white} />
            <T variant="kicker" color={colors.white} style={{ fontSize: 11 }}>
              {d.rating.toFixed(1)}
            </T>
          </View>
        </View>
      </Press>
      <View style={styles.starSlot}>
        <FavStar id={d.id} />
      </View>
    </View>
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
    <Sheet visible={!!destinationId} onClose={onClose} title={`Add ${d.city}`} subtitle={`${d.country} · rated ${d.rating} · about ${money(d.dailyCost)} a day per person`}>
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {d.highlights.slice(0, 4).map((h) => (
          <Stamp key={h} label={h} tone="muted" rotate={0} />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  star: { borderWidth: line, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  starSlot: { position: 'absolute', top: 8, right: 11 },
  place: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.bgAlt, borderWidth: line, borderColor: colors.ink },
  placeText: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
