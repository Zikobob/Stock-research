/** Web preview: OpenStreetMap embed (react-native-maps is native-only). */
import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TripMapProps } from './types';

export function TripMap({ center, points, radiusKm, selectedId }: TripMapProps) {
  const focus = points.find((p) => p.id === selectedId) ?? center;
  const d = Math.max(0.02, (radiusKm / 111) * 1.3);
  const bbox = [focus.lng - d, focus.lat - d * 0.7, focus.lng + d, focus.lat + d * 0.7].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${focus.lat},${focus.lng}`;
  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('iframe', { src, title: 'Trip map', style: { border: 0, width: '100%', height: '100%' }, loading: 'lazy' })}
    </View>
  );
}
