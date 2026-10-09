export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  color: string;
  kind: 'activity' | 'place' | 'airport' | 'me';
}

export interface TripMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  radiusKm: number;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  showsUser?: boolean;
}
