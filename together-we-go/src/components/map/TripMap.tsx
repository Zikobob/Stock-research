/** Native map (Apple Maps on iOS, Google Maps on Android) via react-native-maps. */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { colors } from '@/theme';

import { PinBadge } from './PinBadge';
import type { TripMapProps } from './types';

export function TripMap({ center, points, radiusKm, selectedId, onSelect, showsUser }: TripMapProps) {
  const ref = useRef<MapView>(null);
  const delta = Math.max(0.04, (radiusKm / 111) * 2.6);

  // A custom marker is drawn once into a picture, so it must be allowed to redraw while it is new or has just been picked.
  const sig = `${points.map((p) => p.id).join(',')}|${selectedId ?? ''}`;
  const [settled, setSettled] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSettled(sig), 700);
    return () => clearTimeout(id);
  }, [sig]);

  useEffect(() => {
    ref.current?.animateToRegion({ latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta }, 400);
  }, [center.lat, center.lng, delta]);

  useEffect(() => {
    const p = points.find((x) => x.id === selectedId);
    if (p) ref.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
  }, [selectedId, points]);

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta }}
      showsUserLocation={showsUser}
      showsCompass
      toolbarEnabled={false}>
      <Circle center={{ latitude: center.lat, longitude: center.lng }} radius={radiusKm * 1000} strokeColor={`${colors.ink}99`} fillColor={`${colors.accent}22`} strokeWidth={2} />
      {points.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          title={p.title}
          description={p.subtitle}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onSelect(p.id)}
          zIndex={p.id === selectedId ? 2 : p.kind === 'activity' ? 1 : 0}
          tracksViewChanges={settled !== sig}>
          <PinBadge p={p} selected={p.id === selectedId} />
        </Marker>
      ))}
    </MapView>
  );
}
