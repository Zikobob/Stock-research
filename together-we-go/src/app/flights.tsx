import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet, TimePickerSheet } from '@/components/pickers';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, Pill, ToggleRow } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { airportByIata } from '@/data/airports';
import { destinationById } from '@/data/destinations';
import { FileTooLargeError, pickDocument, pickImage } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Flight } from '@/store/types';
import { colors, radius } from '@/theme';
import { durationLabel } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { addDays, dayLabel, deviceTimeZone, formatInTz, partsInTz, time12, tzAbbrev, utcOffsetLabel, zonedToUtc } from '@/utils/time';
import { maxLen, validateFlightNumber, validateIata } from '@/utils/validation';

export default function Flights() {
  const trip = useActiveTrip();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const showTripTime = useAppStore((s) => s.settings.showTripTime);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const deleteFlight = useAppStore((s) => s.deleteFlight);
  const [adding, setAdding] = useState(false);
  if (!trip) return <NoTrip />;
  const dest = destinationById(trip.destinationId)!;
  const tz = showTripTime ? dest.tz : deviceTimeZone();
  const sorted = trip.flights.slice().sort((a, b) => (a.direction === 'arrival' ? a.arriveUtc : a.departUtc) - (b.direction === 'arrival' ? b.arriveUtc : b.departUtc));
  const arrivals = sorted.filter((f) => f.direction === 'arrival');
  const departures = sorted.filter((f) => f.direction === 'departure');
  const missing = trip.members.filter((m) => !trip.flights.some((f) => f.memberId === m.id));
  const firstLand = arrivals[0];
  const lastLand = arrivals[arrivals.length - 1];

  const card = (f: Flight) => {
    const m = trip.members.find((x) => x.id === f.memberId);
    const from = airportByIata(f.from);
    const to = airportByIata(f.to);
    const canDelete = f.memberId === userId || trip.ownerId === userId;
    return (
      <Card key={f.id} style={{ gap: 10 }}>
        <View style={styles.row}>
          <Avatar name={m?.name ?? '?'} src={m?.avatar} size={34} />
          <View style={{ flex: 1 }}>
            <T variant="small" weight="semibold">
              {m?.name ?? 'Former member'}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {f.airline} · {f.flightNo}
            </T>
          </View>
          <Pill label={f.direction === 'arrival' ? 'Arrival' : 'Departure'} tone={f.direction === 'arrival' ? 'green' : 'blue'} icon={f.direction === 'arrival' ? 'airplane' : 'airplane-outline'} />
        </View>
        <View style={styles.route}>
          <View style={{ flex: 1 }}>
            <T variant="h2">{f.from}</T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {from?.city}
            </T>
            <T variant="small" weight="semibold">
              {formatInTz(f.departUtc, tz)}
            </T>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="airplane" size={18} color={colors.primary} />
            <T variant="micro" color={colors.textMuted}>
              {durationLabel(Math.round((f.arriveUtc - f.departUtc) / 60000))}
            </T>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <T variant="h2">{f.to}</T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {to?.city}
            </T>
            <T variant="small" weight="semibold">
              {formatInTz(f.arriveUtc, tz)}
            </T>
          </View>
        </View>
        <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
          {f.seat ? <Pill label={`Seat ${f.seat}`} tone="gray" /> : null}
          {f.confirmation ? <Pill label={`Conf. ${f.confirmation}`} tone="gray" /> : null}
          {from && to ? <Pill label={`Local: ${time12(partsInTz(f.departUtc, from.tz).hhmm)} → ${time12(partsInTz(f.arriveUtc, to.tz).hhmm)}`} tone="yellow" icon="time-outline" /> : null}
        </View>
        <View style={[styles.row, { gap: 8 }]}>
          {f.ticketUri ? (
            <Press onPress={() => Linking.openURL(f.ticketUri!).catch(() => toast('Ticket saved offline in Documents'))} style={styles.ticket}>
              {/\.(png|jpe?g|webp|heic)$/i.test(f.ticketName ?? '') || f.ticketUri.startsWith('data:image') ? (
                <Image source={{ uri: f.ticketUri }} style={{ width: 28, height: 28, borderRadius: 6 }} />
              ) : (
                <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
              )}
              <T variant="caption" weight="semibold" color={colors.primary} numberOfLines={1}>
                {f.ticketName ?? 'Ticket'}
              </T>
            </Press>
          ) : (
            <T variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
              No ticket attached
            </T>
          )}
          {canDelete ? (
            <Press
              onPress={() => confirmAction('Remove flight?', `${f.flightNo} will be removed from the trip.`, () => deleteFlight(trip.id, f.id), { destructive: true, confirmLabel: 'Remove' })}
              hitSlop={8}
              accessibilityLabel="Remove flight">
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Press>
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <Screen header={<Header title="Flights & arrivals" subtitle={`${trip.flights.length} flights · ${trip.name}`} />}>
      <Press onPress={() => updateSettings({ showTripTime: !showTripTime })} style={styles.tz} accessibilityLabel="Switch time zone">
        <Ionicons name="globe-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <T variant="small" weight="semibold">
            Showing {showTripTime ? `${dest.city} time` : 'your time'} · {tzAbbrev(tz)} ({utcOffsetLabel(tz)})
          </T>
          <T variant="caption" color={colors.textSecondary}>
            Tap to switch to {showTripTime ? 'your phone’s time zone' : `${dest.city} local time`}
          </T>
        </View>
        <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
      </Press>

      {firstLand && lastLand ? (
        <Card style={{ marginTop: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <T variant="caption" style={{ flex: 1 }}>
            First arrival {formatInTz(firstLand.arriveUtc, tz)}, last {formatInTz(lastLand.arriveUtc, tz)} — the group is complete{' '}
            {durationLabel(Math.round((lastLand.arriveUtc - firstLand.arriveUtc) / 60000))} after the first landing.
          </T>
        </Card>
      ) : null}

      <Button label="Add my flight / upload ticket" icon="add" onPress={() => setAdding(true)} style={{ marginTop: 14 }} testID="add-flight" />

      {missing.length ? (
        <Card style={{ marginTop: 12, backgroundColor: colors.orangeSoft, borderColor: colors.orangeSoft }}>
          <T variant="small" weight="semibold">
            Still missing flights
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {missing.map((m) => m.name.split(' ')[0]).join(', ')} {missing.length === 1 ? 'hasn’t' : 'haven’t'} added flight details yet.
          </T>
        </Card>
      ) : null}

      <T variant="h3" style={{ marginTop: 20, marginBottom: 10 }}>
        Arrivals
      </T>
      <View style={{ gap: 10 }}>{arrivals.length ? arrivals.map(card) : <T variant="small" color={colors.textMuted}>No arrivals yet.</T>}</View>
      <T variant="h3" style={{ marginTop: 20, marginBottom: 10 }}>
        Departures
      </T>
      <View style={{ gap: 10 }}>{departures.length ? departures.map(card) : <T variant="small" color={colors.textMuted}>No departures yet.</T>}</View>

      <AddFlightSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddFlightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tz: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySofter, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryLine },
  route: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardMuted, padding: 12, borderRadius: radius.md },
  ticket: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: radius.sm, backgroundColor: colors.primarySofter },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
