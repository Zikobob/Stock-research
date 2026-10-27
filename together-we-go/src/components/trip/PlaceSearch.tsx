import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Press } from '@/components/ui/Press';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useMyLocation, usePlaceSearch } from '@/hooks/usePlaceSearch';
import { normalizeQuery, type PlaceHit } from '@/services/placeSearch';
import type { Trip } from '@/store/types';
import { colors, hair, line, radius } from '@/theme';
import { distanceKm, kmLabel, type LatLng } from '@/utils/geo';

import { typeIcon } from './meta';

interface Props {
  trip: Trip;
  /** The sheet is open: this is when the phone is asked where it is. */
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  picked: PlaceHit | null;
  onPick: (hit: PlaceHit) => void;
  onClear: () => void;
  error?: string | null;
}

/** Type where you want to go; matching places appear below with how far each one is from you. */
export function PlaceSearch({ trip, visible, value, onChangeText, picked, onPick, onClear, error }: Props) {
  const dest = destinationById(trip.destinationId);
  const center: LatLng | null = dest ? { lat: dest.lat, lng: dest.lng } : null;
  const me = useMyLocation(center ?? { lat: 0, lng: 0 }, visible);
  const here = me.source === 'device';
  // At the trip: look around the phone. Planning from home: look around the trip.
  const onTrip = here && !!center && distanceKm(me, center) < 150;
  const [typed, setTyped] = useState(false);
  const [asTyped, setAsTyped] = useState(false);
  const open = typed && !picked && !asTyped && normalizeQuery(value).length >= 2;
  const { hits, loading, offline } = usePlaceSearch(value, {
    destinationIds: [trip.destinationId, ...trip.extraDestinationIds],
    around: onTrip ? me : center,
    enabled: visible && open,
  });

  // Distances start from the phone; without its location, from the middle of the trip's city.
  const from: LatLng | null = here ? me : center;
  const fromLabel = here ? 'from you' : dest ? `from ${dest.city}` : '';
  const away = (p: LatLng) => (from ? kmLabel(distanceKm(from, p)) : '');

  return (
    <View style={{ gap: 10 }}>
      <Input
        label="Where do you want to go?"
        placeholder="Search a place or type an idea"
        icon="search"
        value={value}
        onChangeText={(t) => {
          setTyped(true);
          setAsTyped(false);
          onChangeText(t);
        }}
        error={error}
        maxLength={70}
        autoCorrect={false}
        testID="activity-name"
        style={styles.typing}
        right={
          value ? (
            <Press
              onPress={() => {
                setTyped(false);
                setAsTyped(false);
                onClear();
              }}
              style={styles.clear}
              accessibilityLabel="Clear the place">
              <Ionicons name="close" size={20} color={colors.ink} />
            </Press>
          ) : null
        }
      />

      {picked ? (
        <View style={styles.picked}>
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={14} color={colors.onAccent} />
          </View>
          <T variant="small" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
            {[picked.detail, from ? `${away(picked)} ${fromLabel}` : ''].filter(Boolean).join(' · ')}
          </T>
        </View>
      ) : null}

      {!picked && !open && !value ? (
        <T variant="small" color={colors.textMuted}>
          Try “museum”, “pizza” or the name of a place.
        </T>
      ) : null}

      {open ? (
        <View style={styles.list} accessibilityLiveRegion="polite">
          {hits.map((h, i) => (
            <Press key={h.id} onPress={() => onPick(h)} style={[styles.row, i > 0 && styles.divider]} accessibilityLabel={[h.name, h.detail, from ? `${away(h)} ${fromLabel}` : ''].filter(Boolean).join(', ')}>
              <View style={styles.icon}>
                <Ionicons name={typeIcon(h.type)} size={20} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodySm" weight="semibold" numberOfLines={1}>
                  {h.name}
                </T>
                {h.detail ? (
                  <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {h.detail}
                  </T>
                ) : null}
              </View>
              {from ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="kicker" color={colors.ink} style={{ textTransform: 'none' }}>
                    {away(h)}
                  </T>
                  <T variant="micro" color={colors.textMuted}>
                    {fromLabel}
                  </T>
                </View>
              ) : null}
            </Press>
          ))}
          {loading ? (
            <View style={[styles.row, hits.length > 0 && styles.divider]} accessibilityLabel="Searching">
              <Skeleton width={40} height={40} corner={radius.button} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="62%" height={14} corner={radius.xs} />
                <Skeleton width="38%" height={11} corner={radius.xs} />
              </View>
            </View>
          ) : null}
          <Press onPress={() => setAsTyped(true)} style={[styles.row, (hits.length > 0 || loading) && styles.divider]} accessibilityLabel={`Use ${value.trim()} as typed`}>
            <View style={styles.icon}>
              <Ionicons name="create-outline" size={20} color={colors.ink} />
            </View>
            <T variant="bodySm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
              Use “{value.trim()}”
            </T>
          </Press>
          {offline ? (
            <T variant="caption" color={colors.textMuted} style={styles.note}>
              No connection, so only saved places are shown.
            </T>
          ) : !loading ? (
            <T variant="micro" color={colors.textMuted} style={styles.note}>
              Places from OpenStreetMap · search by Photon
            </T>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // the text box itself is as tall as a fingertip, not only the outlined field around it
  typing: { minHeight: 44 },
  clear: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 22, height: 22, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 12 },
  divider: { borderTopWidth: hair, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  note: { paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2 },
});
