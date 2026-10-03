import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/trip/ActivityCard';
import { AddActivitySheet } from '@/components/trip/AddActivitySheet';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { activityFilters } from '@/components/trip/meta';
import { NoTrip } from '@/components/trip/NoTrip';
import { TripMenuSheet } from '@/components/trip/TripMenuSheet';
import { Avatar, AvatarStack, Chip, EmptyState, IconButton, ListRow } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useWeather } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { totalSpent, useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityType } from '@/store/types';
import { destinationById } from '@/data/destinations';
import { MAX_WIDTH, colors, radius, shadow, shadowStrong } from '@/theme';
import { LENGTH_FILTERS, matchesLength, money, type LengthFilter } from '@/utils/format';
import { dayLabel, deviceTimeZone, formatInTz, rangeLabel, todayInTz, tripDays, tzAbbrev, utcOffsetLabel, weekdayShort } from '@/utils/time';

export default function Itinerary() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <ItineraryInner key={trip.id} />;
}

function ItineraryInner() {
  const t = useT();
  const trip = useActiveTrip()!;
  const insets = useSafeAreaInsets();
  const dest = destinationById(trip.destinationId);
  const tz = dest?.tz ?? 'UTC';
  const weather = useWeather(trip.destinationId);
  const showTripTime = useAppStore((s) => s.settings.showTripTime);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleAssign = useAppStore((s) => s.toggleAssign);
  const days = useMemo(() => tripDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const today = todayInTz(tz);
  const [picked, setSelected] = useState(days.includes(today) ? today : days[0]);
  const selected = days.includes(picked) ? picked : days[0];
  const [cat, setCat] = useState<'all' | ActivityType>('all');
  const [len, setLen] = useState<LengthFilter>('any');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [assigning, setAssigning] = useState<Activity | null>(null);
  const [menu, setMenu] = useState(false);

  const left = trip.budget - totalSpent(trip);
  const dayActs = trip.activities.filter((a) => a.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const shown = dayActs.filter((a) => (cat === 'all' || a.type === cat) && matchesLength(a.durationMin, len));
  const votingDays = new Set(trip.activities.filter((a) => a.status === 'voting').map((a) => a.date));
  const dayIndex = days.indexOf(selected);
  const assigningLive = assigning ? trip.activities.find((a) => a.id === assigning.id) ?? null : null;

  const displayTz = showTripTime ? tz : deviceTimeZone();
  const byMember = trip.members.map((m) => ({
    m,
    arr: trip.flights.find((f) => f.memberId === m.id && f.direction === 'arrival'),
    dep: trip.flights.find((f) => f.memberId === m.id && f.direction === 'departure'),
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton icon="chevron-back" label="Back to Explore" onPress={() => router.navigate('/(tabs)/explore')} />
            <Press style={{ flex: 1 }} onPress={() => router.push('/trips')} accessibilityLabel="Switch trip">
              <T variant="h3" numberOfLines={1}>
                {trip.name}
              </T>
              <View style={styles.inline}>
                <View style={styles.greenDot} />
                <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {dest?.country} · {rangeLabel(trip.startDate, trip.endDate)}
                </T>
              </View>
            </Press>
            <IconButton icon="ellipsis-horizontal" label="Trip options" onPress={() => setMenu(true)} />
          </View>
          <View style={styles.metaRow}>
            <AvatarStack people={trip.members} max={3} size={26} />
            <T variant="caption" color={colors.textSecondary}>
              {t('itin.members', { n: trip.members.length })}
            </T>
            <View style={[styles.metaChip, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="wallet-outline" size={12} color={colors.primary} />
              <T variant="caption" weight="semibold" color={colors.primary}>
                {left >= 0 ? `${money(left)} left` : `${money(-left)} over`}
              </T>
            </View>
            {weather ? (
              <Press onPress={() => router.push('/weather')} style={[styles.metaChip, { backgroundColor: colors.yellowSoft }]} accessibilityLabel="Open weather">
                <Ionicons name="sunny" size={12} color="#B7791F" />
                <T variant="caption" weight="semibold" color="#94660A">
                  {weather.current.temp}°C
                </T>
              </Press>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {days.map((d) => {
              const on = d === selected;
              return (
                <Press key={d} onPress={() => setSelected(d)} style={[styles.datePill, on && styles.datePillOn]} accessibilityLabel={`${weekdayShort(d)} ${dayLabel(d)}`} accessibilityState={{ selected: on }}>
                  <T variant="micro" color={on ? 'rgba(255,255,255,0.75)' : colors.textMuted}>
                    {weekdayShort(d)}
                  </T>
                  <T variant="small" weight="bold" color={on ? colors.white : colors.text}>
                    {dayLabel(d)}
                  </T>
                  {votingDays.has(d) ? <View style={[styles.voteDot, on && { backgroundColor: '#FFC48C' }]} /> : null}
                  {d === today ? <View style={[styles.todayBar, on && { backgroundColor: colors.white }]} /> : null}
                </Press>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingTop: 12 }} style={{ marginHorizontal: -20 }}>
            {activityFilters.map((f) => (
              <Chip key={f.key} small label={t(f.labelKey)} active={cat === f.key} onPress={() => setCat(f.key)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }} style={{ marginHorizontal: -20 }}>
            {LENGTH_FILTERS.map((f) => (
              <Chip key={f.key} small tone="soft" label={t(f.labelKey)} active={len === f.key} onPress={() => setLen(f.key)} />
            ))}
          </ScrollView>

          <View style={styles.dayHead}>
            <T variant="title">
              Day {dayIndex + 1} · {weekdayShort(selected)} {dayLabel(selected)}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {dayActs.length} planned · {tzAbbrev(tz)}
            </T>
          </View>

          {shown.length ? (
            shown.map((a, i) => (
              <ActivityCard
                key={a.id}
                trip={trip}
                activity={a}
                last={i === shown.length - 1}
                onEdit={(x) => {
                  setEditing(x);
                  setAddOpen(true);
                }}
                onAssign={setAssigning}
              />
            ))
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={dayActs.length ? t('itin.noMatch') : t('itin.noActivities')}
              body={dayActs.length ? 'Try a different category or length filter.' : t('itin.noActivitiesSub')}
            />
          )}

          <View style={styles.flights}>
            <View style={styles.flightsHead}>
              <T variant="h3">{t('itin.flights')}</T>
              <Press onPress={() => router.push('/flights')} hitSlop={8}>
                <T variant="small" weight="semibold" color={colors.textSecondary}>
                  {t('explore.seeAll')}
                </T>
              </Press>
            </View>
            <Press onPress={() => updateSettings({ showTripTime: !showTripTime })} style={styles.tzToggle} accessibilityLabel="Switch time zone">
              <Ionicons name="globe-outline" size={14} color={colors.primary} />
              <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
                {showTripTime
                  ? `Times shown in ${dest?.city} time (${tzAbbrev(tz)}, ${utcOffsetLabel(tz)}). Tap for your time zone.`
                  : `Times shown in your time zone (${tzAbbrev(displayTz)}, ${utcOffsetLabel(displayTz)}). Tap for trip time.`}
              </T>
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
            </Press>
            {byMember.map(({ m, arr, dep }) => (
              <Press key={m.id} onPress={() => router.push('/flights')} style={styles.flightRow} scaleTo={0.99}>
                <Avatar name={m.name} src={m.avatar} size={34} />
                <View style={{ flex: 1 }}>
                  <T variant="small" weight="semibold">
                    {m.name.split(' ')[0]} {arr ? `· ${arr.flightNo}` : ''}
                  </T>
                  <T variant="caption" color={colors.textSecondary} numberOfLines={2}>
                    {arr || dep
                      ? `${arr ? `Arrives ${formatInTz(arr.arriveUtc, displayTz)}` : ''}${arr && dep ? ' · ' : ''}${dep ? `Departs ${formatInTz(dep.departUtc, displayTz)}` : ''}`
                      : 'No flight added yet — tap to add'}
                  </T>
                </View>
                <Ionicons name={arr ? 'airplane' : 'add-circle-outline'} size={18} color={arr ? colors.primary : colors.textMuted} />
              </Press>
            ))}
          </View>

          <View style={{ marginTop: 18 }}>
            <ListRow icon="map-outline" label="Trip map" sub="See every stop, nearby places and the nearest airport" onPress={() => router.push('/map')} />
            <ListRow icon="print-outline" label="Printable planner" sub="Print or save a PDF of the whole itinerary" onPress={() => setMenu(true)} />
          </View>
        </ScrollView>

        <Press
          onPress={() => {
            setEditing(null);
            setAddOpen(true);
          }}
          style={[styles.fab, { bottom: 18 }]}
          accessibilityLabel={t('itin.addActivity')}
          testID="add-activity">
          <Ionicons name="add" size={20} color={colors.white} />
          <T variant="small" weight="semibold" color={colors.white}>
            {t('itin.addActivity')}
          </T>
        </Press>
      </View>

      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} trip={trip} date={selected} editing={editing} />
      <MemberPickerSheet
        visible={!!assigning}
        onClose={() => setAssigning(null)}
        members={trip.members}
        selected={assigningLive?.assigned ?? []}
        onToggle={(id) => assigning && toggleAssign(trip.id, assigning.id, id)}
      />
      <TripMenuSheet visible={menu} onClose={() => setMenu(false)} trip={trip} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  header: { backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3FA34D' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  datePill: { width: 64, height: 58, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  datePillOn: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow },
  voteDot: { position: 'absolute', top: 9, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  todayBar: { position: 'absolute', bottom: 6, width: 14, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  flights: { marginTop: 8, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6, ...shadow },
  flightsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tzToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySofter, padding: 10, borderRadius: radius.sm, marginBottom: 4 },
  flightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  fab: {
    position: 'absolute',
    right: 20,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadowStrong,
  },
});
