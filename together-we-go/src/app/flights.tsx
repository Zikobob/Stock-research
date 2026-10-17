import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddFlightSheet } from '@/components/flights/AddFlightSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { airportByIata } from '@/data/airports';
import { destinationById } from '@/data/destinations';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Flight, Member } from '@/store/types';
import { colors, radius } from '@/theme';
import { durationLabel } from '@/utils/format';
import { dayLabel, deviceTimeZone, formatInTz, partsInTz, time12, tzAbbrev, utcOffsetLabel } from '@/utils/time';

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
});
