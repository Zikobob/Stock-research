import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/trip/ActivityCard';
import { AddActivitySheet } from '@/components/trip/AddActivitySheet';
import { DayTabs } from '@/components/trip/DayTabs';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { activityFilters, typeIcon } from '@/components/trip/meta';
import { NoTrip } from '@/components/trip/NoTrip';
import { byTime, groupByDay, newlyLocked, sameStatuses, statusMap } from '@/components/trip/plan';
import { Button } from '@/components/ui/Button';
import { Chip, EmptyState, IconButton } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { Fab } from '@/components/ui/Fab';
import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { printPlanner } from '@/services/print';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityType } from '@/store/types';
import { colors, space } from '@/theme';
import { LENGTH_FILTERS, matchesLength, type LengthFilter } from '@/utils/format';
import { dayLabel, rangeLabel, todayInTz, tripDays, tzAbbrev, utcOffsetLabel, weekdayShort } from '@/utils/time';

export default function Plan() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <PlanInner key={trip.id} />;
}

/** How long a just-locked item stays on the Vote tab with its stamp, so the moment is seen. */
const LINGER_MS = 3800;

function PlanInner() {
  const t = useT();
  const trip = useActiveTrip()!;
  const params = useLocalSearchParams<{ tab?: string }>();
  const focused = useIsFocused();
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

  // A vote tips an item over (or the organizer locks it in): notice the change, celebrate once and keep the card on the Vote tab for a moment.
  const [seen, setSeen] = useState(() => statusMap(trip.activities));
  const [fresh, setFresh] = useState<{ id: string; title: string }[]>([]);
  const nowStatus = statusMap(trip.activities);
  if (!sameStatuses(seen, nowStatus)) {
    setSeen(nowStatus);
    const flipped = newlyLocked(seen, trip.activities);
    // not while another tab is showing: the moment would be missed
    if (flipped.length && focused) setFresh((f) => [...f, ...flipped.map((a) => ({ id: a.id, title: a.title }))]);
  }
  useEffect(() => {
    if (!fresh.length) return;
    celebrate(`Locked in: ${fresh[fresh.length - 1].title}`);
    const timer = setTimeout(() => setFresh([]), LINGER_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  const selectedDay = day === 'all' || days.includes(day) ? day : 'all';
  const matches = (a: Activity) => (selectedDay === 'all' || a.date === selectedDay) && (cat === 'all' || a.type === cat) && matchesLength(a.durationMin, len);
  const voting = trip.activities.filter((a) => a.status === 'voting');
  const ballots = trip.activities.filter((a) => a.status === 'voting' || fresh.some((f) => f.id === a.id)).sort(byTime);
  const groups = groupByDay(trip.activities.filter((a) => a.status !== 'voting' && matches(a)), days);
  const anyPlanned = trip.activities.some((a) => a.status !== 'voting');
  // an empty day can still have ideas waiting for a vote, which are on the other tab
  const waiting = selectedDay === 'all' ? 0 : voting.filter((a) => a.date === selectedDay).length;
  const assigningLive = assigning ? trip.activities.find((a) => a.id === assigning.id) ?? null : null;

  const openAdd = () => {
    setEditing(null);
    setAddOpen(true);
  };
  const clearFilters = () => {
    setCat('all');
    setLen('any');
    setFiltersOpen(false);
  };
  const print = async () => {
    try {
      await printPlanner(trip);
    } catch {
      toast('Allow pop-ups to print the planner', { tone: 'warn' });
    }
  };

  const onVoteTab = tab === 'vote';
  const planEmpty = !onVoteTab && groups.length === 0;
  const voteEmpty = onVoteTab && ballots.length === 0;
  // an empty list brings its own Add button, so the floating one steps aside (one main action per screen)
  const showFab = !planEmpty && !voteEmpty;
  const dayNo = selectedDay === 'all' ? 0 : days.indexOf(selectedDay) + 1;

  // where each day's rows start in the whole list, so only the first few rows slide in
  const starts: number[] = [];
  groups.reduce((sum, g) => {
    starts.push(sum);
    return sum + g.items.length;
  }, 0);
  return (
    <Screen
      padded={false}
      bottomInset={30}
      fab={showFab ? <Fab icon="add" label="Add" accessibilityLabel="Add activity" testID="add-activity" onPress={openAdd} /> : undefined}>
      <Header
        back={false}
        kicker={dest ? `${dest.city}, ${dest.country}` : trip.name}
        title="The plan"
        subtitle={`${rangeLabel(trip.startDate, trip.endDate)} · ${days.length} ${days.length === 1 ? 'day' : 'days'}`}
        right={<IconButton icon="print-outline" label="Print planner" onPress={print} />}
      />

      <View style={styles.body}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'itinerary', label: 'Itinerary' },
            { key: 'vote', label: `Vote (${voting.length})` },
          ]}
        />

        {!onVoteTab ? (
          <>
            <View style={styles.tabs}>
              <DayTabs days={days} value={selectedDay} onChange={setDay} today={days.includes(today) ? today : undefined} withAll />
            </View>

            <View style={styles.tzRow}>
              <T variant="kicker" color={colors.textMuted} style={{ flex: 1 }}>
                Times in {dest?.city ?? 'local'} · {tzAbbrev(tz)} {utcOffsetLabel(tz)}
              </T>
              <Press
                onPress={() => (filtering ? clearFilters() : setFiltersOpen((o) => !o))}
                style={styles.filterBtn}
                accessibilityLabel={filtering ? 'Clear filters' : showFilters ? 'Hide filters' : 'Show filters'}
                accessibilityState={{ expanded: showFilters }}>
                <Ionicons name={filtering ? 'close' : 'options-outline'} size={18} color={colors.ink} />
                <T variant="kicker" color={colors.ink}>
                  {filtering ? 'Clear' : 'Filter'}
                </T>
              </Press>
            </View>

            {showFilters ? (
              <View style={styles.filters}>
                <ChipRow>
                  {activityFilters.map((f) => (
                    <Chip key={f.key} small icon={f.key === 'all' ? undefined : typeIcon(f.key)} label={t(f.labelKey)} active={cat === f.key} onPress={() => setCat(f.key)} style={styles.chip} />
                  ))}
                </ChipRow>
                <ChipRow>
                  {LENGTH_FILTERS.map((f) => (
                    <Chip key={f.key} small icon={f.key === 'any' ? undefined : 'timer-outline'} label={t(f.labelKey)} active={len === f.key} onPress={() => setLen(f.key)} style={styles.chip} />
                  ))}
                </ChipRow>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={{ marginTop: onVoteTab ? 24 : 20 }}>
          {onVoteTab ? (
            voteEmpty ? (
              <EmptyState icon="thumbs-up-outline" title="Nothing to vote on" body="Put an idea to the crew. More than half saying yes locks it in.">
                <Button label="Suggest something" icon="add" onPress={openAdd} />
              </EmptyState>
            ) : (
              ballots.map((a, i) => <ActivityCard key={a.id} trip={trip} activity={a} mode="vote" index={i} justLocked={a.status !== 'voting'} onEdit={onEdit(setEditing, setAddOpen)} onAssign={setAssigning} />)
            )
          ) : planEmpty ? (
            <EmptyState
              icon={filtering && anyPlanned ? 'funnel-outline' : 'calendar-outline'}
              title={filtering && anyPlanned ? t('itin.noMatch') : dayNo ? `Nothing planned for Day ${dayNo}` : 'Nothing planned yet'}
              body={filtering && anyPlanned ? 'Try a different kind or length.' : waiting ? `${waiting} ${waiting === 1 ? 'idea is' : 'ideas are'} waiting on the Vote tab.` : 'Add the first thing and the crew will see it here.'}>
              {filtering && anyPlanned ? <Button label="Show everything" variant="secondary" onPress={clearFilters} /> : <Button label="Add activity" icon="add" onPress={openAdd} />}
            </EmptyState>
          ) : (
            groups.map((g, gi) => (
              <View key={g.date} style={gi ? { marginTop: space.section } : undefined}>
                <View style={styles.dayHead}>
                  <View style={styles.dayTitle}>
                    <T variant="headline" accessibilityRole="header">
                      {g.dayNo ? `Day ${g.dayNo}` : dayLabel(g.date)}
                    </T>
                    {g.date === today ? <Stamp label="Today" tone="accent" /> : null}
                    <T variant="kicker" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
                      {weekdayShort(g.date)} {dayLabel(g.date)}
                    </T>
                  </View>
                  <Rule />
                </View>
                {g.items.map((a, i) => (
                  <ActivityCard key={a.id} trip={trip} activity={a} index={starts[gi] + i} last={i === g.items.length - 1} onEdit={onEdit(setEditing, setAddOpen)} onAssign={setAssigning} />
                ))}
              </View>
            ))
          )}
        </View>
      </View>

      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} trip={trip} date={selectedDay === 'all' ? days[0] : selectedDay} editing={editing} voting={onVoteTab} />
      <MemberPickerSheet visible={!!assigning} onClose={() => setAssigning(null)} members={trip.members} selected={assigningLive?.assigned ?? []} onToggle={(id) => assigning && toggleAssign(trip.id, assigning.id, id)} />
    </Screen>
  );
}

/** Opens Add activity filled in for one that exists (the sheet is the same for adding and editing). */
const onEdit = (setEditing: (a: Activity) => void, setOpen: (o: boolean) => void) => (a: Activity) => {
  setEditing(a);
  setOpen(true);
};

/** A row of chips that scrolls sideways and runs to the screen edge. */
function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20 },
  tabs: { marginTop: 16 },
  tzRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, minHeight: 44 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 12 },
  filters: { gap: 8, marginBottom: 4 },
  chipScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  // the shortest label ("All") would otherwise be narrower than a fingertip
  chip: { minWidth: 44, justifyContent: 'center' },
  dayHead: { gap: 8, marginBottom: 18 },
  dayTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
});
