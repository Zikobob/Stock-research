import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DatePickerSheet, TimePickerSheet } from '@/components/pickers';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, ToggleRow } from '@/components/ui/bits';
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
import type { Flight, Member } from '@/store/types';
import { colors, radius } from '@/theme';
import { durationLabel } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { addDays, dayLabel, deviceTimeZone, formatInTz, partsInTz, time12, tzAbbrev, utcOffsetLabel, zonedToUtc } from '@/utils/time';
import { maxLen, validateFlightNumber, validateIata } from '@/utils/validation';

const AVATAR_COLORS = ['#F2553D', '#1E88E5', '#2FBF5B', '#E5A100', '#8E5CD6', '#D94F86'];

type Person = { id: string; name: string; member?: Member; flights: Flight[] };

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
  const firstLand = arrivals[0];
  const lastLand = arrivals[arrivals.length - 1];

  const everyone: Person[] = trip.members.map((m) => ({ id: m.id, name: m.id === userId ? 'You' : m.name, member: m, flights: sorted.filter((f) => f.memberId === m.id) }));
  const former = sorted.filter((f) => !trip.members.some((m) => m.id === f.memberId));
  if (former.length) everyone.push({ id: 'former', name: 'Former member', flights: former });
  const people = [...everyone.filter((p) => p.flights.length), ...everyone.filter((p) => !p.flights.length)];

  const when = (utc: number) => {
    const p = partsInTz(utc, tz);
    return `${time12(p.hhmm)} local · ${dayLabel(p.ymd)}`;
  };

  const detail = (f: Flight) => {
    const from = airportByIata(f.from);
    const to = airportByIata(f.to);
    const canDelete = f.memberId === userId || trip.ownerId === userId;
    const extra = [f.seat ? `Seat ${f.seat}` : null, f.confirmation ? `Conf. ${f.confirmation}` : null, from && to ? `Airport time ${time12(partsInTz(f.departUtc, from.tz).hhmm)} → ${time12(partsInTz(f.arriveUtc, to.tz).hhmm)}` : null]
      .filter(Boolean)
      .join(' · ');
    return (
      <View key={f.id} style={styles.detail}>
        <Ionicons name={f.direction === 'arrival' ? 'airplane' : 'airplane-outline'} size={14} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <T variant="caption" weight="semibold">
            {f.direction === 'arrival' ? 'Arrival' : 'Departure'} · {f.flightNo} · {f.from} → {f.to}
            <T variant="caption" color={colors.textSecondary}>
              {` · ${durationLabel(Math.round((f.arriveUtc - f.departUtc) / 60000))}`}
            </T>
          </T>
          {extra ? (
            <T variant="caption" color={colors.textMuted}>
              {extra}
            </T>
          ) : null}
        </View>
        {f.ticketUri ? (
          <Press onPress={() => Linking.openURL(f.ticketUri!).catch(() => toast('Ticket saved offline in Documents'))} style={styles.ticket} accessibilityLabel={`Open ticket ${f.ticketName ?? ''}`}>
            {/\.(png|jpe?g|webp|heic)$/i.test(f.ticketName ?? '') || f.ticketUri.startsWith('data:image') ? (
              <Image source={{ uri: f.ticketUri }} style={{ width: 22, height: 22, borderRadius: 6 }} />
            ) : (
              <Ionicons name="document-attach-outline" size={15} color={colors.text} />
            )}
            <T variant="caption" weight="semibold" numberOfLines={1} style={{ maxWidth: 80 }}>
              {f.ticketName ?? 'Ticket'}
            </T>
          </Press>
        ) : null}
        {canDelete ? (
          <Press
            onPress={() => confirmAction('Remove flight?', `${f.flightNo} will be removed from the trip.`, () => deleteFlight(trip.id, f.id), { destructive: true, confirmLabel: 'Remove' })}
            hitSlop={8}
            accessibilityLabel={`Remove flight ${f.flightNo}`}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </Press>
        ) : null}
      </View>
    );
  };

  const personCard = (p: Person) => {
    const arr = p.flights.filter((f) => f.direction === 'arrival');
    const dep = p.flights.filter((f) => f.direction === 'departure');
    const labels = [...new Set([arr[0], dep[0]].filter((f): f is Flight => !!f).map((f) => `${f.airline} ${f.flightNo}`))];
    const bg = AVATAR_COLORS[(p.name.charCodeAt(0) + p.name.length) % AVATAR_COLORS.length];
    return (
      <Card key={p.id} style={styles.person}>
        <View style={styles.row}>
          {p.member?.avatar ? (
            <Avatar name={p.name} src={p.member.avatar} size={34} />
          ) : (
            <View style={[styles.dot, { backgroundColor: bg }]} accessibilityLabel={p.name}>
              <T variant="small" weight="bold" color={colors.white}>
                {p.name.trim().charAt(0).toUpperCase()}
              </T>
            </View>
          )}
          <T variant="title" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
            {p.name}
          </T>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {labels.map((l) => (
              <View key={l} style={styles.flightPill}>
                <T variant="micro" weight="bold" numberOfLines={1}>
                  {l}
                </T>
              </View>
            ))}
          </View>
        </View>
        {p.flights.length ? (
          <>
            {Array.from({ length: Math.max(arr.length, dep.length) }, (_, i) => (
              <View key={i} style={styles.leg}>
                <View style={{ flex: 1 }}>
                  <T variant="kicker" color={colors.textMuted} style={styles.legLabel}>
                    Arrives
                  </T>
                  <T variant="small" weight="bold" color={arr[i] ? colors.text : colors.textMuted}>
                    {arr[i] ? when(arr[i].arriveUtc) : '—'}
                  </T>
                </View>
                <Ionicons name="airplane" size={16} color={colors.textMuted} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <T variant="kicker" color={colors.textMuted} style={styles.legLabel}>
                    Departs
                  </T>
                  <T variant="small" weight="bold" color={dep[i] ? colors.text : colors.textMuted}>
                    {dep[i] ? when(dep[i].departUtc) : '—'}
                  </T>
                </View>
              </View>
            ))}
            <View style={{ gap: 2 }}>{[...arr, ...dep].map(detail)}</View>
          </>
        ) : (
          <T variant="small" color={colors.textMuted}>
            No flight added yet
          </T>
        )}
      </Card>
    );
  };

  return (
    <Screen
      header={
        <Header
          title="Flights"
          subtitle={`Times shown in ${tz}`}
          right={<Button label="Mine" icon="cloud-upload-outline" size="sm" full={false} onPress={() => setAdding(true)} accessibilityHint="Add your flight or upload a ticket" testID="add-flight" />}
        />
      }>
      <Press onPress={() => updateSettings({ showTripTime: !showTripTime })} style={styles.tz} accessibilityLabel={`Showing ${showTripTime ? `${dest.city} time` : 'your time'}. Tap to switch time zone`}>
        <Ionicons name="globe-outline" size={15} color={colors.blue} />
        <T variant="caption" weight="semibold" color={colors.blue}>
          {showTripTime ? `${dest.city} time` : 'Your time'} · {tzAbbrev(tz)} ({utcOffsetLabel(tz)}) · tap to switch
        </T>
        <Ionicons name="swap-horizontal" size={15} color={colors.blue} />
      </Press>

      <View style={{ gap: 12 }}>{people.map(personCard)}</View>

      {firstLand && lastLand ? (
        <Card style={styles.summary}>
          <Ionicons name="people-outline" size={20} color={colors.text} />
          <T variant="caption" style={{ flex: 1 }}>
            First arrival {formatInTz(firstLand.arriveUtc, tz)}, last {formatInTz(lastLand.arriveUtc, tz)} — the group is complete{' '}
            {durationLabel(Math.round((lastLand.arriveUtc - firstLand.arriveUtc) / 60000))} after the first landing.
          </T>
        </Card>
      ) : null}

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
  tz: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginBottom: 14, paddingVertical: 4 },
  person: { gap: 12, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flightPill: { backgroundColor: colors.bgAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 170 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legLabel: { fontSize: 9.5, lineHeight: 12, letterSpacing: 1 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: colors.border },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.bgAlt },
  summary: { marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: radius.xl },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
