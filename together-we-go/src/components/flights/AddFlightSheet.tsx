import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet, TimePickerSheet } from '@/components/pickers';
import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { airportByIata } from '@/data/airports';
import { destinationById } from '@/data/destinations';
import { FileTooLargeError, pickDocument, pickImage } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { distanceKm, kmLabel } from '@/utils/geo';
import { addDays, dayLabel, time12, zonedToUtc } from '@/utils/time';
import { maxLen, validateFlightNumber, validateIata } from '@/utils/validation';

/** Adds a flight (a friend's, or yours): who, which way, airports, times, seat and an optional ticket file. */
export function AddFlightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const trip = useActiveTrip()!;
  const dest = destinationById(trip.destinationId)!;
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addFlight = useAppStore((s) => s.addFlight);
  const addDoc = useAppStore((s) => s.addDoc);
  const [memberId, setMemberId] = useState(userId);
  const [direction, setDirection] = useState<'arrival' | 'departure'>('arrival');
  const [airline, setAirline] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(dest.airport);
  const [depDate, setDepDate] = useState(addDays(trip.startDate, -1));
  const [depTime, setDepTime] = useState('11:00');
  const [arrDate, setArrDate] = useState(trip.startDate);
  const [arrTime, setArrTime] = useState('14:30');
  const [seat, setSeat] = useState('');
  const [conf, setConf] = useState('');
  const [ticket, setTicket] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [saveDoc, setSaveDoc] = useState(true);
  const [picker, setPicker] = useState<null | 'depDate' | 'depTime' | 'arrDate' | 'arrTime'>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const setDir = (d: 'arrival' | 'departure') => {
    setDirection(d);
    if (d === 'arrival') {
      setTo(to || 'HND');
      setDepDate(addDays(trip.startDate, -1));
      setArrDate(trip.startDate);
    } else {
      setFrom(from || 'HND');
      setDepDate(trip.endDate);
      setArrDate(trip.endDate);
    }
  };

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
    const A = airportByIata(from);
    const B = airportByIata(to);
    const e: Record<string, string | null> = {
      airline: airline.trim() ? maxLen(30, 'Airline')(airline) : 'Enter the airline',
      flightNo: validateFlightNumber(flightNo),
      from: validateIata(from, 'departure'),
      to: validateIata(to, 'arrival') ?? (from.trim().toUpperCase() === to.trim().toUpperCase() ? 'Departure and arrival airports must differ' : null),
      seat: seat && !/^\d{1,3}[A-K]$/i.test(seat.trim()) ? 'Seats look like 32A' : null,
    };
    let departUtc = 0;
    let arriveUtc = 0;
    if (A && B && !e.from && !e.to) {
      departUtc = zonedToUtc(depDate, depTime, A.tz);
      arriveUtc = zonedToUtc(arrDate, arrTime, B.tz);
      const hrs = (arriveUtc - departUtc) / 3600000;
      if (hrs <= 0) e.arr = 'Arrival must be after departure (times are local to each airport)';
      else if (hrs > 22) e.arr = `That’s a ${Math.round(hrs)}h flight — double-check the dates`;
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) return tap('warning');
    const name = trip.members.find((m) => m.id === memberId)?.name.split(' ')[0] ?? '';
    addFlight(trip.id, {
      memberId,
      airline: airline.trim(),
      flightNo: flightNo.trim().toUpperCase().replace(/^([A-Z0-9]{2})\s?/, '$1 '),
      from: from.trim().toUpperCase(),
      to: to.trim().toUpperCase(),
      departUtc,
      arriveUtc,
      direction,
      seat: seat.trim().toUpperCase() || undefined,
      confirmation: conf.trim().toUpperCase() || undefined,
      ticketUri: ticket?.uri,
      ticketName: ticket?.name,
    });
    if (ticket && saveDoc) {
      addDoc(trip.id, { name: `${name}’s ticket · ${flightNo.toUpperCase()}`, kind: /\.pdf$/i.test(ticket.name) ? 'pdf' : 'image', uri: ticket.uri, size: ticket.size, offline: true });
    }
    const near = B ? distanceKm(B, dest) : 0;
    tap('success');
    toast(direction === 'arrival' && near > 150 ? `Flight saved — note ${to.toUpperCase()} is ${kmLabel(near)} from ${dest.city}` : 'Flight saved ✈️ The group can see it now');
    onClose();
  };

  const A = airportByIata(from);
  const B = airportByIata(to);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a flight"
      subtitle="Times are local to each airport — we convert them for everyone"
      footer={<Button label="Save flight" icon="airplane" onPress={submit} />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Arriving" icon="airplane" active={direction === 'arrival'} onPress={() => setDir('arrival')} />
        <Chip label="Departing" icon="airplane-outline" active={direction === 'departure'} onPress={() => setDir('departure')} />
      </View>
      <View style={{ gap: 6 }}>
        <T variant="small" weight="semibold">
          Traveller
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {trip.members.map((m) => (
            <Chip key={m.id} small label={m.name.split(' ')[0]} image={m.avatar} active={memberId === m.id} onPress={() => setMemberId(m.id)} />
          ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input label="Airline" placeholder="ANA" value={airline} onChangeText={setAirline} error={errors.airline} containerStyle={{ flex: 1 }} />
        <Input label="Flight no." placeholder="NH 175" value={flightNo} onChangeText={setFlightNo} autoCapitalize="characters" error={errors.flightNo} containerStyle={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input label="From" placeholder="JFK" value={from} onChangeText={(v) => setFrom(v.toUpperCase().slice(0, 3))} autoCapitalize="characters" error={errors.from} hint={A ? A.city : undefined} containerStyle={{ flex: 1 }} />
        <Input label="To" placeholder={dest.airport} value={to} onChangeText={(v) => setTo(v.toUpperCase().slice(0, 3))} autoCapitalize="characters" error={errors.to} hint={B ? B.city : undefined} containerStyle={{ flex: 1 }} />
      </View>
      <T variant="small" weight="semibold">
        Departs {A ? `(${A.city} time)` : ''}
      </T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input value={`${dayLabel(depDate)}, ${depDate.slice(0, 4)}`} icon="calendar-outline" onPressField={() => setPicker('depDate')} containerStyle={{ flex: 1.3 }} />
        <Input value={time12(depTime)} icon="time-outline" onPressField={() => setPicker('depTime')} containerStyle={{ flex: 1 }} />
      </View>
      <T variant="small" weight="semibold">
        Arrives {B ? `(${B.city} time)` : ''}
      </T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input value={`${dayLabel(arrDate)}, ${arrDate.slice(0, 4)}`} icon="calendar-outline" onPressField={() => setPicker('arrDate')} containerStyle={{ flex: 1.3 }} />
        <Input value={time12(arrTime)} icon="time-outline" onPressField={() => setPicker('arrTime')} containerStyle={{ flex: 1 }} />
      </View>
      {errors.arr ? (
        <T variant="caption" color={colors.red}>
          {errors.arr}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input label="Seat (optional)" placeholder="32A" value={seat} onChangeText={setSeat} autoCapitalize="characters" error={errors.seat} containerStyle={{ flex: 1 }} />
        <Input label="Confirmation (optional)" placeholder="ABC123" value={conf} onChangeText={setConf} autoCapitalize="characters" maxLength={10} containerStyle={{ flex: 1 }} />
      </View>
      <View style={{ gap: 8 }}>
        <T variant="small" weight="semibold">
          Ticket / boarding pass
        </T>
        {ticket ? (
          <View style={styles.attached}>
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <T variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {ticket.name}
            </T>
            <Press onPress={() => setTicket(null)} accessibilityLabel="Remove attachment">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Press>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Photo" icon="image-outline" variant="secondary" size="md" onPress={() => attach('photo')} style={{ flex: 1 }} />
            <Button label="PDF / file" icon="document-outline" variant="secondary" size="md" onPress={() => attach('file')} style={{ flex: 1 }} />
          </View>
        )}
        {ticket ? <ToggleRow icon="cloud-done-outline" label="Also save to offline documents" value={saveDoc} onChange={setSaveDoc} /> : null}
      </View>

      <DatePickerSheet visible={picker === 'depDate'} value={depDate} onClose={() => setPicker(null)} onChange={setDepDate} title="Departure date" />
      <DatePickerSheet visible={picker === 'arrDate'} value={arrDate} onClose={() => setPicker(null)} onChange={setArrDate} title="Arrival date" />
      <TimePickerSheet visible={picker === 'depTime'} value={depTime} onClose={() => setPicker(null)} onChange={setDepTime} />
      <TimePickerSheet visible={picker === 'arrTime'} value={arrTime} onClose={() => setPicker(null)} onChange={setArrTime} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  attached: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
