import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { RecapPoster } from '@/components/play/RecapPoster';
import { placesVisited, votesCast, yesVotes } from '@/components/play/recapLogic';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Divider, SectionHeader, type IconName } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { shareView } from '@/services/share';
import { settlePlan, totalSpent, tripStatus, useActiveTrip, useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, line, radius } from '@/theme';
import { money } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween, rangeLabel } from '@/utils/time';

const STATUS = {
  completed: { label: 'Trip complete', tone: 'accent' },
  active: { label: 'In progress', tone: 'positive' },
  planning: { label: 'Coming up', tone: 'ink' },
} as const;

/** End-of-trip summary: the "memories" stage of the planning, travelling, memories journey. A passport page you can share, then the numbers behind it. */
export default function Recap() {
  const trip = useActiveTrip();
  const { width } = useWindowDimensions();
  const fired = useAppStore((s) => s.firedReminders);
  const markFired = useAppStore((s) => s.markReminderFired);
  const [share, setShare] = useState(false);
  const [rating, setRating] = useState(0);
  const card = useRef<View>(null);

  const tripId = trip?.id;
  const done = !!trip && tripStatus(trip) === 'completed';
  const seen = !!tripId && `recap:${tripId}` in fired;
  // The end of the trip is the peak: a small celebration the first time the finished recap is opened (and never again).
  useEffect(() => {
    if (!done || seen || !tripId) return;
    const id = setTimeout(() => {
      markFired(`recap:${tripId}`);
      celebrate('Trip complete');
    }, 900);
    return () => clearTimeout(id);
  }, [done, seen, tripId, markFired]);

  if (!trip) return <NoTrip />;

  const dest = destinationById(trip.destinationId)!;
  const status = tripStatus(trip);
  const days = daysBetween(trip.startDate, trip.endDate) + 1;
  const spent = totalSpent(trip);
  const stops = trip.activities.filter((a) => a.lat && a.lng).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const km = stops.reduce((sum, a, i) => (i ? sum + distanceKm(stops[i - 1] as { lat: number; lng: number }, a as { lat: number; lng: number }) : 0), 0);
  const topPhoto = trip.photos.slice().sort((a, b) => b.likes.length - a.likes.length)[0];
  const topActivity = trip.activities.filter((a) => a.type !== 'transport' && a.type !== 'stay').sort((a, b) => yesVotes(b) - yesVotes(a))[0];
  const byCat: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (byCat[e.category] = (byCat[e.category] ?? 0) + e.amount));
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const photographer = trip.members.map((m) => ({ m, n: trip.photos.filter((p) => p.by === m.id).length })).sort((a, b) => b.n - a.n)[0];
  const owed = settlePlan(trip);
  const places = placesVisited(trip.activities);
  const perPerson = spent / Math.max(1, trip.members.length);
  const posterW = Math.min(Math.min(width, MAX_WIDTH) - 40 - 4, 330);

  const ledger: [string, string][] = [
    [`${trip.members.length}`, 'travellers'],
    [`${trip.activities.length}`, 'activities'],
    [kmLabel(km), 'between stops'],
    [money(spent), 'spent together'],
    [`${trip.photos.length}`, 'photos'],
    [`${votesCast(trip)}`, 'votes cast'],
  ];

  const summary = `Our trip “${trip.name}”: ${days} days in ${dest.city} · ${trip.activities.length} activities · ${trip.photos.length} photos · ${kmLabel(km)} explored · ${money(perPerson)} each. Planned together on TogetherWeGo.`;

  return (
    <Screen header={<Header kicker={trip.name} title="Trip recap" subtitle={status === 'completed' ? 'Your memories, wrapped up' : 'A preview. The full recap is ready when the trip ends.'} />}>
      <RecapPoster
        cardRef={card}
        width={posterW}
        image={trip.cover}
        trip={trip}
        place={`${dest.city}, ${dest.country}`}
        dates={rangeLabel(trip.startDate, trip.endDate)}
        status={STATUS[status]}
        stats={[
          [`${days}`, days === 1 ? 'day' : 'days'],
          [`${places.length}`, places.length === 1 ? 'place' : 'places'],
          [money(perPerson), 'spent each'],
        ]}
        places={places.slice(0, 4)}
        summary={summary}
      />

      <View style={styles.actions}>
        {Platform.OS !== 'web' ? <Button label="Share picture" icon="image-outline" onPress={() => shareView(card, 'Share your trip recap', summary)} style={{ flex: 1 }} testID="share-picture" /> : null}
        <Button label={Platform.OS === 'web' ? 'Share story card' : 'Share text'} icon="share-social-outline" variant={Platform.OS === 'web' ? 'primary' : 'secondary'} onPress={() => setShare(true)} style={{ flex: 1 }} />
      </View>

      <View style={styles.block}>
        <SectionHeader title="The numbers" />
        <View style={styles.ledger}>
          {ledger.map(([value, label]) => (
            <View key={label} style={styles.cell} accessible accessibilityLabel={`${value} ${label}`}>
              <T variant="numeralSm" numberOfLines={1} importantForAccessibility="no">
                {value}
              </T>
              <T variant="kicker" color={colors.textSecondary} importantForAccessibility="no">
                {label}
              </T>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Highlights" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {topActivity ? <Highlight icon="trophy-outline" title="Group favourite" body={`${topActivity.title}: ${yesVotes(topActivity)} of ${trip.members.length} said “I’m in”`} /> : null}
          {topPhoto ? <Highlight icon="heart-outline" title="Most-liked photo" body={`“${topPhoto.caption || 'Untitled'}” · ${topPhoto.likes.length} likes`} /> : null}
          {photographer && photographer.n ? <Highlight icon="camera-outline" title="Chief photographer" body={`${photographer.m.name.split(' ')[0]} with ${photographer.n} photos`} /> : null}
          {topCat ? <Highlight icon="pie-chart-outline" title="Biggest spend" body={`${topCat[0]} · ${money(topCat[1])} (${Math.round((topCat[1] / Math.max(1, spent)) * 100)}%)`} /> : null}
          <Highlight icon="people-outline" title="The crew" body={trip.members.map((m) => `${m.name.split(' ')[0]} (${m.role})`).join(', ')} last />
        </Card>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Final balances" action="Settle up" onAction={() => router.navigate('/(tabs)/budget')} />
        {owed.length ? (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {owed.slice(0, 4).map((p, i) => {
              const a = trip.members.find((m) => m.id === p.from);
              const b = trip.members.find((m) => m.id === p.to);
              return (
                <View key={`${p.from}${p.to}`}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.owe}>
                    <Avatar name={a?.name ?? '?'} src={a?.avatar} size={32} />
                    <T variant="bodySm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                      {a?.name.split(' ')[0]} pays {b?.name.split(' ')[0]}
                    </T>
                    <T variant="numeralSm">{money(p.amount)}</T>
                  </View>
                </View>
              );
            })}
          </Card>
        ) : (
          <View style={styles.settled}>
            <Stamp label="All settled" tone="positive" icon="checkmark" rotate={-3} />
            <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              Nobody owes anybody.
            </T>
          </View>
        )}
      </View>

      <View style={styles.block}>
        <SectionHeader title="How was the trip?" />
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <Press
              key={n}
              onPress={() => {
                setRating(n);
                toast(n >= 4 ? 'Saved. Sounds like a great trip' : 'Thanks for the feedback');
              }}
              style={styles.star}
              accessibilityRole="radio"
              accessibilityState={{ checked: n === rating }}
              accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={colors.ink} />
            </Press>
          ))}
        </View>
      </View>

      <Button label="Open the photo dump" icon="images-outline" variant="secondary" onPress={() => router.push('/photos')} style={{ marginTop: 32 }} />
      <ShareSheet visible={share} onClose={() => setShare(false)} title="Share your trip recap" message={summary} preview={summary} />
    </Screen>
  );
}

function Highlight({ icon, title, body, last }: { icon: IconName; title: string; body: string; last?: boolean }) {
  return (
    <View style={[styles.hl, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.hlIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="kicker" color={colors.textSecondary}>
          {title}
        </T>
        <T variant="bodySm" weight="semibold">
          {body}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  block: { marginTop: 32 },
  ledger: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '50%', gap: 2, paddingRight: 8 },
  hl: { flexDirection: 'row', gap: 12, padding: 14 },
  hlIcon: { width: 38, height: 38, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  owe: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  settled: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stars: { flexDirection: 'row', gap: 4 },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
