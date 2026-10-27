import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFlightSheet } from '@/components/flights/AddFlightSheet';
import { FlightTicket, zoneNoteFor } from '@/components/flights/FlightTicket';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, EmptyState } from '@/components/ui/bits';
import { Fab } from '@/components/ui/Fab';
import { confirmAction } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Flight, Member } from '@/store/types';
import { colors, line } from '@/theme';
import { durationLabel } from '@/utils/format';
import { dayLabel, deviceTimeZone, partsInTz, time12, tzAbbrev, utcOffsetLabel } from '@/utils/time';

type Person = { id: string; name: string; member?: Member; flights: Flight[] };

/** Flights: everyone's flights as boarding passes, grouped by person, and how long it takes the whole group to land. */
export default function Flights() {
  const trip = useActiveTrip();
  const insets = useSafeAreaInsets();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const showTripTime = useAppStore((s) => s.settings.showTripTime);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const deleteFlight = useAppStore((s) => s.deleteFlight);
  const [adding, setAdding] = useState(false);
  if (!trip) return <NoTrip />;
  const dest = destinationById(trip.destinationId)!;
  const tz = showTripTime ? dest.tz : deviceTimeZone();
  const zoneName = showTripTime ? `${dest.city} time` : 'your time';
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
    return `${time12(p.hhmm)}, ${dayLabel(p.ymd)}`;
  };
  const empty = sorted.length === 0;
  const firstId = people.find((p) => p.flights.length)?.flights[0]?.id;

  return (
    <Screen
      header={<Header title="Flights" subtitle={empty ? 'Who lands when, and where' : `${sorted.length} flight${sorted.length === 1 ? '' : 's'} · ${trip.members.length} travellers`} />}
      fab={empty ? undefined : <Fab icon="add" label="Add flight" testID="add-flight" onPress={() => setAdding(true)} />}
      fabBottom={insets.bottom + 16}>
      {empty ? (
        <EmptyState icon="airplane-outline" title="No flights yet" body="Add your flights so everyone can see who lands when, and plan the first day around it.">
          <Button label="Add a flight" icon="add" testID="add-flight" onPress={() => setAdding(true)} />
        </EmptyState>
      ) : (
        <>
          <Segmented
            value={showTripTime ? 'trip' : 'mine'}
            onChange={(k) => updateSettings({ showTripTime: k === 'trip' })}
            options={[
              { key: 'trip', label: `${dest.city} time` },
              { key: 'mine', label: 'My time' },
            ]}
          />
          <T variant="kicker" color={colors.textSecondary} style={styles.zone}>
            Airport clocks on the passes / group times in {tzAbbrev(tz)} ({utcOffsetLabel(tz)})
          </T>

          {firstLand && lastLand ? (
            <Card style={styles.landing}>
              <Ionicons name="people-outline" size={22} color={colors.ink} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="kicker" color={colors.textSecondary}>
                  Group landing
                </T>
                <T variant="bodySm" weight="semibold">
                  First in {when(firstLand.arriveUtc)}, last in {when(lastLand.arriveUtc)}.
                  {lastLand !== firstLand ? ` The group is complete ${durationLabel(Math.round((lastLand.arriveUtc - firstLand.arriveUtc) / 60000))} after the first landing.` : ''}
                </T>
              </View>
            </Card>
          ) : null}

          {people.map((p) => (
            <View key={p.id} style={styles.person}>
              <View style={styles.who}>
                <Avatar name={p.member?.name ?? p.name} src={p.member?.avatar} size={36} />
                <T variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                  {p.name}
                </T>
              </View>
              {p.flights.length ? (
                <View style={{ gap: 20 }}>
                  {p.flights.map((f) => (
                    <FlightTicket
                      key={f.id}
                      flight={f}
                      passenger={p.name === 'You' ? 'You' : p.name.split(' ')[0]}
                      plated={f.id === firstId}
                      zoneNote={zoneNoteFor(f, tz, zoneName)}
                      canDelete={f.memberId === userId || trip.ownerId === userId}
                      onDelete={() => confirmAction('Remove flight?', `${f.flightNo} will be removed from the trip.`, () => deleteFlight(trip.id, f.id), { destructive: true, confirmLabel: 'Remove' })}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.none}>
                  <T variant="small" color={colors.textSecondary}>
                    No flight added yet
                  </T>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <AddFlightSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  zone: { marginTop: 10 },
  landing: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, backgroundColor: colors.accentSoft },
  person: { marginTop: 32, gap: 14 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  none: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: line, borderStyle: 'dashed', borderColor: colors.textSecondary },
});
