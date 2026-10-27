import type { IconName } from '@/components/ui/bits';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  /** The marker's colour for the phone's own map pins (ink for the plan, quieter for places, blue for airports). */
  color: string;
  kind: 'activity' | 'place' | 'airport' | 'me';
  /** The stop number of a planned activity, so the plan reads 1, 2, 3 on the map. */
  label?: string;
  /** A line icon for the kind (airports). */
  icon?: IconName;
}

export interface TripMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  radiusKm: number;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  showsUser?: boolean;
}
