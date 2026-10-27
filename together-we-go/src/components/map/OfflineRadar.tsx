/**
 * Offline map: plots every stop around the trip centre using real distances
 * and bearings — no map tiles or internet needed. Handy on a plane or when
 * roaming data is off.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors, hair } from '@/theme';
import { projectKm } from '@/utils/geo';

import { PinBadge } from './PinBadge';
import type { MapPoint } from './types';

/** Every marker sits in a 44 point square, so it is an easy target even when it is drawn small. */
const HIT = 44;

export function OfflineRadar({ center, points, radiusKm, selectedId, onSelect }: { center: { lat: number; lng: number }; points: MapPoint[]; radiusKm: number; selectedId?: string | null; onSelect: (id: string) => void }) {
  const [size, setSize] = useState(300);
  const half = size / 2;
  const scale = half / radiusKm;
  const rings = [0.25, 0.5, 1].map((f) => Math.max(0.5, Math.round(radiusKm * f * 10) / 10));
  // the picked marker is drawn last, so it is never hidden under a neighbour
  const ordered = [...points].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId));

  return (
    <View style={styles.wrap} onLayout={(e) => setSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}>
      <View style={{ width: size, height: size }}>
        {rings.map((r) => (
          <View key={r} style={[styles.ring, { width: r * scale * 2, height: r * scale * 2, borderRadius: r * scale, left: half - r * scale, top: half - r * scale }]}>
            <T variant="kicker" color={colors.textSecondary} style={{ position: 'absolute', top: -8, alignSelf: 'center', backgroundColor: colors.bgAlt, paddingHorizontal: 4, fontSize: 10 }}>
              {r} km
            </T>
          </View>
        ))}
        <View style={[styles.axis, { left: half, top: 0, width: hair, height: size }]} />
        <View style={[styles.axis, { top: half, left: 0, height: hair, width: size }]} />
        <T variant="kicker" color={colors.ink} style={{ position: 'absolute', top: 22, left: half + 6 }}>
          N
        </T>
        {ordered.map((p) => {
          const { x, y } = projectKm(center, p);
          if (Math.hypot(x, y) > radiusKm * 1.02) return null;
          const sel = p.id === selectedId;
          return (
            <Press key={p.id} onPress={() => onSelect(p.id)} accessibilityLabel={`${p.title}, ${p.subtitle}`} accessibilityState={{ selected: sel }} scaleTo={0.9} style={[styles.hit, { left: half + x * scale - HIT / 2, top: half - y * scale - HIT / 2 }]}>
              <PinBadge p={p} selected={sel} />
            </Press>
          );
        })}
        <View pointerEvents="none" style={[styles.center, { left: half - 8, top: half - 8 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5, borderColor: colors.textMuted, borderStyle: 'dashed' },
  axis: { position: 'absolute', backgroundColor: colors.borderStrong },
  hit: { position: 'absolute', width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  // the middle of the search: a small ink cross-hair square
  center: { position: 'absolute', width: 16, height: 16, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.bgAlt, transform: [{ rotate: '45deg' }] },
});
