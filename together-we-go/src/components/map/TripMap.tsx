/** Native map (Apple Maps on iOS, Google Maps on Android) via react-native-maps. */
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import type { TripMapProps } from './types';

export function TripMap({ center, points, radiusKm, selectedId, onSelect, showsUser }: TripMapProps) {
  const ref = useRef<MapView>(null);
  const delta = Math.max(0.04, (radiusKm / 111) * 2.6);

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
      <Circle center={{ latitude: center.lat, longitude: center.lng }} radius={radiusKm * 1000} strokeColor="rgba(31,77,37,0.6)" fillColor="rgba(31,77,37,0.08)" strokeWidth={1.5} />
      {points.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          title={p.title}
          description={p.subtitle}
          pinColor={p.color}
          onPress={() => onSelect(p.id)}
          tracksViewChanges={false}
        />
      ))}
    </MapView>
  );
}
