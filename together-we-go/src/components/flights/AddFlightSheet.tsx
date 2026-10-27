import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet, TimePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { airportByIata } from '@/data/airports';
import { destinationById } from '@/data/destinations';
import { useDraft } from '@/hooks/useDraft';
import { FileTooLargeError, pickDocument, pickImage } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';
import { distanceKm, kmLabel } from '@/utils/geo';
import { dayLabel, time12 } from '@/utils/time';

import { blankFlight, checkFlight, withAirports, withDirection, type FlightForm } from './flightForm';

type Picker = null | 'depDate' | 'depTime' | 'arrDate' | 'arrTime';

/**
 * Adds a flight (a friend's, or yours): who, which way, airports, times, seat and an optional ticket file. Once both airports are known the
 * app works out the times (you can change them), and a half-filled form is kept if the sheet is closed by accident.
 */
export function AddFlightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const trip = useActiveTrip()!;
  const dest = destinationById(trip.destinationId)!;
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addFlight = useAppStore((s) => s.addFlight);
  const addDoc = useAppStore((s) => s.addDoc);

  const [saved, setSaved, clearSaved] = useDraft<FlightForm | null>('add-flight', null);
  const form = saved && saved.tripId === trip.id ? saved : blankFlight(trip, dest.airport, userId);
  const set = (next: FlightForm) => setSaved(next);
  const patch = (p: Partial<FlightForm>) => set({ ...form, ...p });
  const [ticket, setTicket] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [saveDoc, setSaveDoc] = useState(true);
  const [picker, setPicker] = useState<Picker>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const clearError = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: null } : e));

  const attach = async (kind: 'photo' | 'file') => {
    try {
      const f = kind === 'photo' ? await pickImage() : await pickDocument();
      if (f) {
        setTicket(f);
        toast('Ticket attached');
      }
    } catch (e) {
      toast(e instanceof FileTooLargeError ? e.message : 'Couldn’t attach that file', { tone: 'warn' });
    }
  };

  const submit = () => {
    const c = checkFlight(form);
    setErrors(c.errors);
    if (!c.ok) return tap('warning');
    const name = trip.members.find((m) => m.id === form.memberId)?.name.split(' ')[0] ?? '';
    addFlight(trip.id, {
      memberId: form.memberId,
      airline: form.airline.trim(),
      flightNo: form.flightNo.trim().toUpperCase().replace(/^([A-Z0-9]{2})\s?/, '$1 '),
      from: form.from.trim().toUpperCase(),
      to: form.to.trim().toUpperCase(),
      departUtc: c.departUtc,
      arriveUtc: c.arriveUtc,
      direction: form.direction,
      seat: form.seat.trim().toUpperCase() || undefined,
      confirmation: form.conf.trim().toUpperCase() || undefined,
      ticketUri: ticket?.uri,
      ticketName: ticket?.name,
    });
    if (ticket && saveDoc) {
      addDoc(trip.id, { name: `${name}’s ticket · ${form.flightNo.toUpperCase()}`, kind: /\.pdf$/i.test(ticket.name) ? 'pdf' : 'image', uri: ticket.uri, size: ticket.size, offline: true });
    }
    const B = airportByIata(form.to);
    const near = B ? distanceKm(B, dest) : 0;
    tap('success');
    toast(form.direction === 'arrival' && near > 150 ? `Flight saved. Note ${form.to.toUpperCase()} is ${kmLabel(near)} from ${dest.city}` : 'Flight saved. The group can see it now');
    clearSaved();
    setTicket(null);
    setErrors({});
    onClose();
  };

  const A = airportByIata(form.from);
  const B = airportByIata(form.to);
  const touch = (p: Partial<FlightForm>) => patch({ ...p, timesTouched: true });
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a flight"
      subtitle="Times are local to each airport. We convert them for everyone."
      footer={<Button label="Save flight" icon="airplane" onPress={submit} />}>
      <Segmented
        value={form.direction}
        onChange={(d) => set(withDirection(form, trip, d))}
        options={[
          { key: 'arrival', label: 'Arriving' },
          { key: 'departure', label: 'Departing' },
        ]}
      />
      <View style={{ gap: 6 }}>
        <T variant="kicker">Traveller</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {trip.members.map((m) => (
            <Chip key={m.id} small label={m.name.split(' ')[0]} image={m.avatar} active={form.memberId === m.id} onPress={() => patch({ memberId: m.id })} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.pair}>
        <Input
          label="Airline"
          placeholder="ANA"
          value={form.airline}
          onChangeText={(v) => {
            patch({ airline: v });
            clearError('airline');
          }}
          error={errors.airline}
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="Flight no."
          placeholder="NH 175"
          value={form.flightNo}
          onChangeText={(v) => {
            patch({ flightNo: v });
            clearError('flightNo');
          }}
          autoCapitalize="characters"
          error={errors.flightNo}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <View style={styles.pair}>
        <Input
          label="From"
          placeholder="JFK"
          value={form.from}
          onChangeText={(v) => {
            set(withAirports(form, trip, { from: v.toUpperCase().slice(0, 3) }));
            clearError('from');
          }}
          autoCapitalize="characters"
          error={errors.from}
          hint={A ? A.city : undefined}
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="To"
          placeholder={dest.airport}
          value={form.to}
          onChangeText={(v) => {
            set(withAirports(form, trip, { to: v.toUpperCase().slice(0, 3) }));
            clearError('to');
          }}
          autoCapitalize="characters"
          error={errors.to}
          hint={B ? B.city : undefined}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <View style={{ gap: 6 }}>
        <T variant="kicker">Departs{A ? ` (${A.city} time)` : ''}</T>
        <View style={styles.pair}>
          <Input accessibilityLabel="Departure date" value={`${dayLabel(form.depDate)}, ${form.depDate.slice(0, 4)}`} icon="calendar-outline" onPressField={() => setPicker('depDate')} containerStyle={{ flex: 1.3 }} />
          <Input accessibilityLabel="Departure time" value={time12(form.depTime)} icon="time-outline" onPressField={() => setPicker('depTime')} containerStyle={{ flex: 1 }} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <T variant="kicker">Arrives{B ? ` (${B.city} time)` : ''}</T>
        <View style={styles.pair}>
          <Input accessibilityLabel="Arrival date" value={`${dayLabel(form.arrDate)}, ${form.arrDate.slice(0, 4)}`} icon="calendar-outline" onPressField={() => setPicker('arrDate')} containerStyle={{ flex: 1.3 }} />
          <Input accessibilityLabel="Arrival time" value={time12(form.arrTime)} icon="time-outline" onPressField={() => setPicker('arrTime')} containerStyle={{ flex: 1 }} />
        </View>
        {errors.arr ? (
          <T variant="caption" color={colors.red} accessibilityLiveRegion="polite">
            {errors.arr}
          </T>
        ) : A && B && !form.timesTouched ? (
          <T variant="caption" color={colors.textMuted}>
            Worked out from the distance. Change it if your ticket says otherwise.
          </T>
        ) : null}
      </View>
      <View style={styles.pair}>
        <Input
          label="Seat (optional)"
          placeholder="32A"
          value={form.seat}
          onChangeText={(v) => {
            patch({ seat: v });
            clearError('seat');
          }}
          autoCapitalize="characters"
          error={errors.seat}
          containerStyle={{ flex: 1 }}
        />
        <Input label="Confirmation (optional)" placeholder="ABC123" value={form.conf} onChangeText={(v) => patch({ conf: v })} autoCapitalize="characters" maxLength={10} containerStyle={{ flex: 1 }} />
      </View>
      <View style={{ gap: 8 }}>
        <T variant="kicker">Ticket / boarding pass (optional)</T>
        {ticket ? (
          <View style={styles.attached}>
            <Ionicons name="document-attach-outline" size={20} color={colors.ink} />
            <T variant="small" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
              {ticket.name}
            </T>
            <Press onPress={() => setTicket(null)} accessibilityLabel="Remove attachment" style={styles.detach}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Press>
          </View>
        ) : (
          <View style={styles.pair}>
            <Button label="Photo" icon="image-outline" variant="secondary" size="md" onPress={() => attach('photo')} style={{ flex: 1 }} />
            <Button label="PDF / file" icon="document-outline" variant="secondary" size="md" onPress={() => attach('file')} style={{ flex: 1 }} />
          </View>
        )}
        {ticket ? <ToggleRow icon="cloud-done-outline" label="Also save to offline documents" value={saveDoc} onChange={setSaveDoc} /> : null}
      </View>

      <DatePickerSheet visible={picker === 'depDate'} value={form.depDate} onClose={() => setPicker(null)} onChange={(v) => touch({ depDate: v })} title="Departure date" />
      <DatePickerSheet visible={picker === 'arrDate'} value={form.arrDate} onClose={() => setPicker(null)} onChange={(v) => touch({ arrDate: v })} title="Arrival date" />
      <TimePickerSheet visible={picker === 'depTime'} value={form.depTime} onClose={() => setPicker(null)} onChange={(v) => touch({ depTime: v })} />
      <TimePickerSheet visible={picker === 'arrTime'} value={form.arrTime} onClose={() => setPicker(null)} onChange={(v) => touch({ arrTime: v })} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, minHeight: 52, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
  detach: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
