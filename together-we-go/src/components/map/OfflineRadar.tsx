/**
 * Offline map: plots every stop around the trip centre using real distances
 * and bearings — no map tiles or internet needed. Handy on a plane or when
 * roaming data is off.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';
import { projectKm } from '@/utils/geo';

import type { MapPoint } from './types';

export function OfflineRadar({ center, points, radiusKm, selectedId, onSelect }: { center: { lat: number; lng: number }; points: MapPoint[]; radiusKm: number; selectedId?: string | null; onSelect: (id: string) => void }) {
  const [size, setSize] = useState(300);
  const half = size / 2;
  const scale = half / radiusKm;
  const rings = [0.25, 0.5, 1].map((f) => Math.max(0.5, Math.round(radiusKm * f * 10) / 10));

  return (
    <View style={styles.wrap} onLayout={(e) => setSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}>
      <View style={{ width: size, height: size }}>
        {rings.map((r) => (
          <View
            key={r}
            style={[styles.ring, { width: r * scale * 2, height: r * scale * 2, borderRadius: r * scale, left: half - r * scale, top: half - r * scale }]}>
            <T variant="micro" color={colors.textMuted} style={{ position: 'absolute', top: -2, alignSelf: 'center', backgroundColor: colors.bgAlt, paddingHorizontal: 3 }}>
              {r} km
            </T>
          </View>
        ))}
        <View style={[styles.axis, { left: half, top: 0, width: 1, height: size }]} />
        <View style={[styles.axis, { top: half, left: 0, height: 1, width: size }]} />
        <T variant="micro" weight="bold" color={colors.textSecondary} style={{ position: 'absolute', top: 4, left: half + 4 }}>
          N
        </T>
        {points.map((p) => {
          const { x, y } = projectKm(center, p);
          if (Math.hypot(x, y) > radiusKm * 1.02) return null;
          const sel = p.id === selectedId;
          return (
            <Press
              key={p.id}
              onPress={() => onSelect(p.id)}
              hitSlop={8}
              accessibilityLabel={`${p.title}, ${p.subtitle}`}
              style={[
                styles.dot,
                { left: half + x * scale - (sel ? 9 : 6), top: half - y * scale - (sel ? 9 : 6), backgroundColor: p.color, width: sel ? 18 : 12, height: sel ? 18 : 12, borderRadius: 9 },
              ]}
            />
          );
        })}
        <View style={[styles.center, { left: half - 7, top: half - 7 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed' },
  axis: { position: 'absolute', backgroundColor: colors.border },
  dot: { position: 'absolute', borderWidth: 2, borderColor: colors.white },
  center: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.white },
});
