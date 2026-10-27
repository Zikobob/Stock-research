import { StyleSheet, View } from 'react-native';

import { placeCategoryIcon } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/bits';
import { Sheet } from '@/components/ui/Sheet';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import type { PlaceCategory } from '@/data/places';
import { useT } from '@/i18n';
import { colors } from '@/theme';
import { LENGTH_FILTERS, money, type LengthFilter } from '@/utils/format';

export const CATS: ('all' | PlaceCategory)[] = ['all', 'food', 'sightseeing', 'adventure', 'culture', 'nightlife', 'shopping', 'relax'];

export interface NearbyFilterState {
  radiusKm: number;
  cat: 'all' | PlaceCategory;
  len: LengthFilter;
  maxCost: number;
  /** True when the search starts from the phone's own location rather than the middle of the city. */
  fromMe: boolean;
}

/** A small caps label on the left and its current value in mono on the right, over a control. */
function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.between}>
        <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
          {label}
        </T>
        {value ? <T variant="numeralSm">{value}</T> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Everything that narrows Nearby, behind the one Filter button: radius, where to start from, the most you will pay, the kind of place and
 * how long a visit takes. The button at the bottom says how many places are left, so it is also the way to close the sheet.
 */
export function NearbyFilters({ visible, onClose, state, onChange, cityName, locating, onLocate, onCentre, onReset, count }: { visible: boolean; onClose: () => void; state: NearbyFilterState; onChange: (patch: Partial<NearbyFilterState>) => void; cityName: string; locating: boolean; onLocate: () => void; onCentre: () => void; onReset: () => void; count: number }) {
  const t = useT();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={{ gap: 8 }}>
          <Button label={`Show ${count} ${count === 1 ? 'place' : 'places'}`} onPress={onClose} />
          <Button label="Reset filters" variant="ghost" size="md" onPress={onReset} />
        </View>
      }>
      <Row label="Search radius" value={`${state.radiusKm} km`}>
        <Slider value={state.radiusKm} min={1} max={25} onChange={(v) => onChange({ radiusKm: v })} label="Search radius" formatValue={(v) => `${v} km`} />
      </Row>
      <Row label="Start from">
        <View style={styles.wrap}>
          <Chip icon="business-outline" label={`${cityName} centre`} active={!state.fromMe} onPress={onCentre} />
          <Chip icon="locate-outline" label={locating ? 'Locating…' : 'My location'} active={state.fromMe} onPress={onLocate} />
        </View>
      </Row>
      <Row label="Max price per person" value={state.maxCost >= 100 ? 'Any' : state.maxCost === 0 ? 'Free only' : money(state.maxCost)}>
        <Slider value={state.maxCost} min={0} max={100} step={5} onChange={(v) => onChange({ maxCost: v })} label="Maximum price per person" formatValue={(v) => (v >= 100 ? 'Any' : `$${v}`)} />
      </Row>
      <Row label="Kind of place">
        <View style={styles.wrap}>
          {CATS.map((c) => (
            <Chip key={c} icon={c === 'all' ? undefined : placeCategoryIcon[c]} label={t(`cat.${c}`)} active={state.cat === c} onPress={() => onChange({ cat: c })} />
          ))}
        </View>
      </Row>
      <Row label="Visit length">
        <View style={styles.wrap}>
          {LENGTH_FILTERS.map((f) => (
            <Chip key={f.key} label={t(f.labelKey)} active={state.len === f.key} onPress={() => onChange({ len: f.key })} />
          ))}
        </View>
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
