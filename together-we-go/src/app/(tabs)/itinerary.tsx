import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/trip/ActivityCard';
import { AddActivitySheet } from '@/components/trip/AddActivitySheet';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { activityFilters, typeEmoji } from '@/components/trip/meta';
import { NoTrip } from '@/components/trip/NoTrip';
import { Chip, EmptyState, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { printPlanner } from '@/services/print';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityType } from '@/store/types';
import { colors } from '@/theme';
import { LENGTH_FILTERS, matchesLength, type LengthFilter } from '@/utils/format';
import { dayLabel, todayInTz, tripDays, tzAbbrev, utcOffsetLabel } from '@/utils/time';

export default function Plan() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <PlanInner key={trip.id} />;
}

function PlanInner() {
  const t = useT();
  const trip = useActiveTrip()!;
  const params = useLocalSearchParams<{ tab?: string }>();
  const toggleAssign = useAppStore((s) => s.toggleAssign);
  const dest = destinationById(trip.destinationId);
  const tz = dest?.tz ?? 'UTC';
  const days = tripDays(trip.startDate, trip.endDate);
  const today = todayInTz(tz);

  const [tab, setTab] = useState<'itinerary' | 'vote'>(params.tab === 'vote' ? 'vote' : 'itinerary');
  const [seenTab, setSeenTab] = useState(params.tab);
  // Home’s “Vote” tile navigates here with ?tab=vote while this screen is already mounted.
  if (params.tab !== seenTab) {
    setSeenTab(params.tab);
    if (params.tab) setTab(params.tab === 'vote' ? 'vote' : 'itinerary');
  }
  const [day, setDay] = useState<'all' | string>('all');
  const [cat, setCat] = useState<'all' | ActivityType>('all');
  const [len, setLen] = useState<LengthFilter>('any');
  // The kind and length filters stay folded away until asked for (or while one is on, so it is never a hidden reason for an empty list).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtering = cat !== 'all' || len !== 'any';
  const showFilters = filtersOpen || filtering;
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [assigning, setAssigning] = useState<Activity | null>(null);

  const selectedDay = day === 'all' || days.includes(day) ? day : 'all';
  const matches = (a: Activity) => (selectedDay === 'all' || a.date === selectedDay) && (cat === 'all' || a.type === cat) && matchesLength(a.durationMin, len);
  const byTime = (a: Activity, b: Activity) => (a.date + a.time).localeCompare(b.date + b.time);
  const voting = trip.activities.filter((a) => a.status === 'voting');
  const shown = trip.activities.filter((a) => (tab === 'vote' ? a.status === 'voting' : a.status !== 'voting') && matches(a)).sort(byTime);
  const assigningLive = assigning ? trip.activities.find((a) => a.id === assigning.id) ?? null : null;

  const print = async () => {
    try {
      await printPlanner(trip);
    } catch {
      toast('Allow pop-ups to print the planner', { tone: 'warn' });
    }
  };

  return (
    <Screen
      bottomInset={30}
      header={
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
              {dest ? `${dest.city}, ${dest.country}` : trip.name}
            </T>
            <T variant="display" accessibilityRole="header">
              The plan
            </T>
          </View>
          <IconButton icon="print-outline" label="Print planner" onPress={print} size={44} />
          <IconButton
            icon="add"
            label="Add activity"
            onPress={() => {
              setEditing(null);
              setAddOpen(true);
            }}
            size={44}
            bg={colors.primary}
            color={colors.onPrimary}
            bordered={false}
          />
        </View>
      }>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'itinerary', label: 'Itinerary' },
          { key: 'vote', label: `Vote (${voting.length})` },
        ]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        <Chip label="All days" active={selectedDay === 'all'} onPress={() => setDay('all')} />
        {days.map((d, i) => (
          <Chip key={d} label={`Day ${i + 1} · ${dayLabel(d)}`} active={selectedDay === d} onPress={() => setDay(d)} />
        ))}
      </ScrollView>
      {showFilters ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
            {activityFilters.map((f) => (
              <Chip key={f.key} small label={f.key === 'all' ? t(f.labelKey) : `${typeEmoji[f.key]} ${t(f.labelKey)}`} active={cat === f.key} onPress={() => setCat(f.key)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
            {LENGTH_FILTERS.map((f) => (
              <Chip key={f.key} small icon={f.key === 'any' ? undefined : 'timer-outline'} label={t(f.labelKey)} active={len === f.key} onPress={() => setLen(f.key)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.tzRow}>
        <Ionicons name="globe-outline" size={13} color={colors.textMuted} />
        <T variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
          Times are in {dest?.city ?? 'local'} time ({tzAbbrev(tz)}, {utcOffsetLabel(tz)}){days.includes(today) ? ' · today is on the trip' : ''}
        </T>
        <Press onPress={() => (filtering ? (setCat('all'), setLen('any'), setFiltersOpen(false)) : setFiltersOpen((o) => !o))} hitSlop={8} style={styles.filterBtn} accessibilityLabel={filtering ? 'Clear filters' : showFilters ? 'Hide filters' : 'Show filters'}>
          <Ionicons name={filtering ? 'close-circle' : 'options-outline'} size={14} color={colors.textSecondary} />
          <T variant="caption" weight="semibold" color={colors.textSecondary}>
            {filtering ? 'Clear' : 'Filter'}
          </T>
        </Press>
      </View>

      <View style={{ marginTop: 10 }}>
        {shown.length ? (
          shown.map((a) => (
            <ActivityCard
              key={a.id}
              trip={trip}
              activity={a}
              mode={tab === 'vote' ? 'vote' : 'plan'}
              onEdit={(x) => {
                setEditing(x);
                setAddOpen(true);
              }}
              onAssign={setAssigning}
            />
          ))
        ) : (
          <EmptyState
            icon={tab === 'vote' ? 'thumbs-up-outline' : 'calendar-outline'}
            title={tab === 'vote' ? 'Nothing to vote on' : (day !== 'all' || cat !== 'all' || len !== 'any') && trip.activities.length ? t('itin.noMatch') : t('itin.noActivities')}
            body={tab === 'vote' ? 'Add an activity and mark it “voting” — the crew decides together.' : (day !== 'all' || cat !== 'all' || len !== 'any') && trip.activities.length ? 'Try a different day, category or length.' : t('itin.noActivitiesSub')}
          />
        )}
      </View>

      <Press
        onPress={() => {
          setEditing(null);
          setAddOpen(true);
        }}
        style={styles.addRow}
        accessibilityLabel={t('itin.addActivity')}
        testID="add-activity">
        <Ionicons name="add-circle" size={20} color={colors.primary} />
        <T variant="small" weight="bold" color={colors.primary}>
          {t('itin.addActivity')}
        </T>
      </Press>

      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} trip={trip} date={selectedDay === 'all' ? days[0] : selectedDay} editing={editing} />
      <MemberPickerSheet visible={!!assigning} onClose={() => setAssigning(null)} members={trip.members} selected={assigningLive?.assigned ?? []} onToggle={(id) => assigning && toggleAssign(trip.id, assigning.id, id)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  chipScroll: { marginHorizontal: -20, marginTop: 12, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  tzRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
});
