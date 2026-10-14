import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/explore';
import { GuidedTour } from '@/components/GuidedTour';
import { SkylineHero } from '@/components/SkylineHero';
import { placeCategoryIcon, typeEmoji } from '@/components/trip/meta';
import { TripMenuSheet } from '@/components/trip/TripMenuSheet';
import { AvatarStack, Card, IconButton, ProgressBar, SectionHeader, type IconName } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { FadeIn, Pulse } from '@/components/ui/motion';
import { Press, tap } from '@/components/ui/Press';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinationById, destinations, type Destination } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { INTERESTS } from '@/data/personal';
import { placesFor } from '@/data/places';
import { useNow, useWeather } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { nextUpcoming } from '@/services/notifications';
import { weatherInfo } from '@/services/weather';
import type { Personal } from '@/store/types';
import { totalSpent, tripStatus, useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import { MAX_WIDTH, colors, radius, shadow } from '@/theme';
import { countdownLabel, lengthTag, money } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween, dayLabel, deviceTimeZone, greetingFor, partsInTz, time12, todayInTz, weekdayShort } from '@/utils/time';

/** Big hero headline that follows the trip’s stage. */
function headlineFor(status: 'planning' | 'active' | 'completed' | null, daysToGo: number) {
  if (status === 'active') return 'Living it.';
  if (status === 'completed') return 'That was epic.';
  if (status === 'planning') return daysToGo <= 1 ? 'Tomorrow.' : `${daysToGo} days to go.`;
  return 'Where to next?';
}

export default function Home() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useCurrentUser();
  const trip = useActiveTrip();
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const personal = useAppStore((s) => s.personal);
  const setToured = useAppStore((s) => s.setToured);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const now = useNow(30000);
  const [radiusKm, setRadiusKm] = useState(5);
  const [menu, setMenu] = useState(false);

  const dest = destinationById(trip?.destinationId ?? 'positano');
  const tz = dest?.tz ?? 'UTC';
  const weather = useWeather(dest?.id);
  const status = trip ? tripStatus(trip) : null;
  const next = nextUpcoming(trip);
  const show = personal.sections;
  const colW = Math.min(width, MAX_WIDTH) - 40;
  const today = todayInTz(tz);
  const tripLen = trip ? daysBetween(trip.startDate, trip.endDate) + 1 : 0;
  const daysToGo = trip ? Math.max(0, daysBetween(today, trip.startDate)) : 0;
  const dayNo = trip ? Math.min(tripLen, Math.max(1, daysBetween(trip.startDate, today) + 1)) : 0;
  const votingCount = trip ? trip.activities.filter((a) => a.status === 'voting').length : 0;
  const spent = trip ? totalSpent(trip) : 0;
  const firstName = personal.nickname || (user?.name.split(' ')[0] ?? 'traveller');
  const todays = trip && status === 'active' ? trip.activities.filter((a) => a.date === today && a.status !== 'voting').sort((a, b) => a.time.localeCompare(b.time)) : [];
  const picks = pickedForYou(personal);
  const homeTz = deviceTimeZone();
  const todayWx = weather?.daily[0];

  const nearby =
    dest && trip
      ? [trip.destinationId, ...trip.extraDestinationIds]
          .flatMap((id) => placesFor(id))
          .map((p) => ({ p, km: distanceKm(dest, p) }))
          .filter((x) => x.km <= radiusKm)
          .sort((a, b) => a.km - b.km)
      : [];

  const copyCode = async () => {
    if (!trip) return;
    await Clipboard.setStringAsync(trip.inviteCode).catch(() => {});
    tap('success');
    toast(`Invite code ${trip.inviteCode} copied`, { icon: 'copy-outline' });
  };

  const quick: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'checkbox-outline', label: `Vote (${votingCount})`, go: () => router.navigate({ pathname: '/(tabs)/itinerary', params: { tab: 'vote' } }) },
    { icon: 'airplane-outline', label: 'Flights', go: () => router.push('/flights') },
    { icon: 'folder-open-outline', label: 'Docs', go: () => router.push('/documents') },
    { icon: 'camera-outline', label: 'Photos', go: () => router.push('/photos') },
  ];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.column}>
          <SkylineHero image={dest?.image ?? 'amalfi'} tz={tz} height={400 + insets.top}>
            <View style={[styles.heroTop, { top: insets.top + 10 }]}>
              <Press onPress={() => (trip ? setMenu(true) : router.push('/trips'))} style={styles.tripPill} accessibilityLabel={trip ? `${trip.name}. Trip options and switching` : 'Choose a trip'}>
                <T variant="small" weight="bold" color={colors.white} numberOfLines={1} style={{ maxWidth: 190 }}>
                  {trip?.name ?? 'No trip yet'}
                </T>
                <Ionicons name="chevron-down" size={14} color={colors.white} />
              </Press>
              <View style={{ flex: 1 }} />
              <IconButton icon="notifications-outline" label={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} bg="rgba(255,255,255,0.92)" color="#111111" bordered={false} />
            </View>

            <View style={styles.heroBottom}>
              <View style={styles.place}>
                <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.9)" />
                <T variant="kicker" color="rgba(255,255,255,0.92)">
                  {dest ? `${dest.city}, ${dest.country}` : 'Somewhere great'}
                </T>
              </View>
              <FadeIn delay={120} distance={26}>
                <T variant="display" color={colors.white} style={{ fontSize: 60, lineHeight: 64 }} accessibilityRole="header">
                  {headlineFor(status, daysToGo)}
                </T>
              </FadeIn>
              <View style={styles.heroRow}>
                {trip ? <AvatarStack people={trip.members} max={4} size={32} /> : <View />}
                {trip ? (
                  <Press onPress={copyCode} style={styles.code} accessibilityLabel={`Invite code ${trip.inviteCode}. Tap to copy`}>
                    <T variant="small" weight="extrabold" color={colors.onAccent}>
                      Code {trip.inviteCode}
                    </T>
                    <Ionicons name="copy-outline" size={14} color={colors.onAccent} />
                  </Press>
                ) : null}
              </View>
            </View>
          </SkylineHero>

          <View style={styles.sheet}>
            <T variant="small" color={colors.textSecondary} style={{ marginBottom: 14 }}>
              {t(greetingFor(new Date(now).getHours()))}, {firstName} {personal.emoji}
            </T>

            {!trip ? (
              <Card style={{ gap: 12, marginBottom: 14 }}>
                <T variant="headline">Plan your first group trip</T>
                <T variant="small" color={colors.textSecondary}>
                  Create a trip, invite friends with a code and start planning together.
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Create trip" size="md" icon="add" onPress={() => router.push('/new-trip')} style={{ flex: 1 }} />
                  <Button label="Join" size="md" variant="secondary" icon="people-outline" onPress={() => router.push('/join')} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : null}

            {show.glance ? (
              <FadeIn delay={80}>
                <View style={styles.tiles}>
                  <Press onPress={() => router.push('/weather')} style={styles.tile} accessibilityLabel={`Weather in ${dest?.city}`}>
                    <T variant="kicker" color={colors.textSecondary}>
                      Weather
                    </T>
                    <View style={styles.tileRow}>
                      <Ionicons name={weather ? weatherInfo(weather.current.code).icon : 'partly-sunny'} size={34} color="#F5A524" />
                      <T variant="h1" weight="extrabold" style={{ fontSize: 36, lineHeight: 40 }}>
                        {weather ? `${weather.current.temp}°` : '—'}
                      </T>
                    </View>
                    <T variant="micro" color={colors.textSecondary}>
                      {todayWx ? `H ${Math.round(todayWx.max)}° · L ${Math.round(todayWx.min)}°` : 'Loading forecast…'}
                    </T>
                  </Press>
                  <View style={styles.tile} accessible accessibilityLabel={`Local time in ${dest?.city}`}>
                    <T variant="kicker" color={colors.textSecondary}>
                      Local time
                    </T>
                    <T variant="h1" weight="extrabold" style={{ marginTop: 6 }}>
                      {time12(partsInTz(now, tz).hhmm)}
                    </T>
                    <T variant="micro" color={colors.textSecondary} style={{ marginTop: 4 }}>
                      Home {time12(partsInTz(now, homeTz).hhmm)}
                    </T>
                  </View>
                </View>
              </FadeIn>
            ) : null}

            {trip && show.budget ? (
              <FadeIn delay={140}>
                <Press onPress={() => router.navigate('/(tabs)/budget')} style={styles.budget} accessibilityLabel="Group budget. Open budget">
                  <View style={styles.rowBetween}>
                    <T variant="kicker" color={colors.textSecondary}>
                      Group budget
                    </T>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <T variant="h1" weight="extrabold">
                      {money(spent)}
                    </T>
                    <T variant="small" color={colors.textSecondary}>
                      of {money(trip.budget)}
                    </T>
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <ProgressBar value={spent / Math.max(1, trip.budget)} color={spent > trip.budget ? colors.red : colors.primary} height={9} />
                  </View>
                </Press>
              </FadeIn>
            ) : null}

            {trip && show.upnext ? (
              <FadeIn delay={200}>
                <SectionHeader title="Up next" action="See all" onAction={() => router.navigate('/(tabs)/itinerary')} style={{ marginTop: 24 }} />
                {status === 'active' ? (
                  <Card style={{ marginBottom: 10, gap: 10 }}>
                    <View style={styles.rowBetween}>
                      <T variant="title" weight="bold">
                        Today · Day {dayNo} of {tripLen}
                      </T>
                      <T variant="caption" color={colors.textSecondary}>
                        {todays.filter((a) => a.done).length}/{todays.length} done
                      </T>
                    </View>
                    {todays.length ? (
                      todays.map((a) => (
                        <Press key={a.id} onPress={() => updateActivity(trip.id, a.id, { done: !a.done })} style={styles.todayRow} accessibilityRole="checkbox" accessibilityState={{ checked: !!a.done }} accessibilityLabel={`${a.title} at ${a.time}`}>
                          <Ionicons name={a.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={a.done ? colors.positive : colors.borderStrong} />
                          <T variant="caption" weight="bold" color={colors.textSecondary} style={{ width: 40 }}>
                            {a.time}
                          </T>
                          <T variant="small" weight="semibold" numberOfLines={1} style={[{ flex: 1 }, a.done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                            {a.title}
                          </T>
                        </Press>
                      ))
                    ) : (
                      <T variant="small" color={colors.textSecondary}>
                        A free day. Enjoy it!
                      </T>
                    )}
                  </Card>
                ) : null}
                {next ? (
                  <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.next} accessibilityLabel={`Next: ${next.a.title}`}>
                    <View style={styles.nextBadge}>
                      <T style={{ fontSize: 22, lineHeight: 28 }}>{typeEmoji[next.a.type]}</T>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="small" weight="bold" numberOfLines={1}>
                        {next.a.title}
                      </T>
                      <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                        {weekdayShort(next.a.date)}, {dayLabel(next.a.date)} · {time12(next.a.time)} · {lengthTag(next.a.durationMin)}
                      </T>
                    </View>
                    {next.a.reminder ? (
                      <Pulse>
                        <Ionicons name="notifications" size={16} color={colors.primary} />
                      </Pulse>
                    ) : null}
                    <View style={styles.countdown}>
                      <T variant="micro" weight="bold" color={colors.onPrimary}>
                        {next.startUtc - now > 0 ? `in ${countdownLabel(next.startUtc - now)}` : 'Now'}
                      </T>
                    </View>
                  </Press>
                ) : (
                  <Card>
                    <T variant="small" color={colors.textSecondary}>
                      Nothing scheduled yet.
                    </T>
                  </Card>
                )}
              </FadeIn>
            ) : null}

            {trip && show.quick ? (
              <FadeIn delay={260}>
                <View style={styles.quickRow}>
                  {quick.map((q) => (
                    <Press key={q.label} onPress={q.go} style={styles.quick} accessibilityLabel={q.label}>
                      <Ionicons name={q.icon} size={22} color={colors.text} />
                      <T variant="micro" weight="bold" numberOfLines={1}>
                        {q.label}
                      </T>
                    </Press>
                  ))}
                </View>
              </FadeIn>
            ) : null}

            {show.forYou ? (
              personal.done && picks.length ? (
                <FadeIn delay={300}>
                  <SectionHeader title="Picked for you" action="Edit" onAction={() => router.push('/personalize')} style={{ marginTop: 26 }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
                    {picks.map(({ d, match, why }) => (
                      <Press key={d.id} onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} style={styles.pick} accessibilityLabel={`${d.city}, ${match}% match`}>
                        <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
                        <View style={styles.match}>
                          <T variant="micro" weight="bold" color={colors.onAccent}>
                            {match}% match
                          </T>
                        </View>
                        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                          <T variant="title" weight="bold" color={colors.white} numberOfLines={1}>
                            {d.city}
                          </T>
                          <T variant="micro" color="rgba(255,255,255,0.9)" numberOfLines={1}>
                            {why}
                          </T>
                        </View>
                      </Press>
                    ))}
                  </ScrollView>
                </FadeIn>
              ) : !personal.done ? (
                <Press onPress={() => router.push('/personalize')} style={styles.cta} accessibilityLabel="Make TogetherWeGo yours — take the 60-second survey">
                  <LinearGradient colors={[colors.accent, '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.ctaEmoji}>
                    <T style={{ fontSize: 24, lineHeight: 30 }}>🎨</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="title" weight="extrabold" color={colors.onAccent}>
                      Make it yours
                    </T>
                    <T variant="caption" color={colors.onAccent}>
                      60-sec survey · colours, interests & your home screen
                    </T>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={28} color={colors.onAccent} />
                </Press>
              ) : null
            ) : null}

            {trip && dest && show.nearby ? (
              <FadeIn delay={340}>
                <SectionHeader title="Nearby" action="Filters" onAction={() => router.push('/nearby')} style={{ marginTop: 26 }} />
                <Card>
                  <View style={styles.rowBetween}>
                    <T variant="small" color={colors.textSecondary}>
                      Search radius
                    </T>
                    <T variant="small" weight="extrabold">
                      {radiusKm} km
                    </T>
                  </View>
                  <Slider value={radiusKm} min={1} max={20} onChange={setRadiusKm} label="Search radius in kilometres" formatValue={(v) => `${v} km`} />
                  <T variant="caption" color={colors.textMuted} style={{ marginBottom: 6 }}>
                    {nearby.length} places within {radiusKm} km of central {dest.city}
                  </T>
                  {nearby.slice(0, 4).map(({ p, km }) => (
                    <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id } })} style={styles.nearRow} scaleTo={0.99}>
                      <View style={styles.nearIcon}>
                        <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T variant="small" weight="bold" numberOfLines={1}>
                          {p.name}
                        </T>
                        <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                          {p.category[0].toUpperCase() + p.category.slice(1)} · {lengthTag(p.durationMin)} · {p.cost ? money(p.cost) : 'Free'}
                        </T>
                      </View>
                      <T variant="caption" weight="semibold" color={colors.textSecondary}>
                        {kmLabel(km)}
                      </T>
                    </Press>
                  ))}
                </Card>
              </FadeIn>
            ) : null}

            {show.discover ? (
              <FadeIn delay={380}>
                <SectionHeader title="Discover" action="See all" onAction={() => router.push('/destinations')} style={{ marginTop: 26 }} />
                <View style={styles.grid}>
                  {destinations.filter((d) => d.id !== dest?.id).slice(0, 4).map((d) => (
                    <PlaceCard key={d.id} d={d} style={{ width: (colW - 12) / 2 }} />
                  ))}
                </View>
              </FadeIn>
            ) : null}

            <Press onPress={() => router.push('/personalize')} style={styles.customize} accessibilityLabel="Customize this page">
              <Ionicons name="color-palette-outline" size={16} color={colors.text} />
              <T variant="small" weight="bold">
                Customize this page
              </T>
            </Press>
          </View>
        </View>
      </ScrollView>

      {trip ? <TripMenuSheet visible={menu} onClose={() => setMenu(false)} trip={trip} /> : null}
      <GuidedTour visible={!personal.toured && !!trip} onClose={() => setToured(true)} />
    </View>
  );
}

/** Ranks destinations against the “Make it yours” answers (interests + budget style). */
function pickedForYou(p: Personal): { d: Destination; match: number; why: string }[] {
  if (!p.interests.length) return [];
  return destinations
    .map((d) => {
      const hits = INTERESTS.filter((i) => p.interests.includes(i.key) && d.tags.includes(i.key));
      const budgetFit = p.budgetStyle === 'saver' ? (d.priceLevel <= 2 ? 1 : 0) : p.budgetStyle === 'treat' ? (d.priceLevel >= 3 ? 1 : 0) : d.priceLevel <= 3 ? 1 : 0;
      const ratio = hits.length / Math.min(3, p.interests.length);
      const match = Math.min(99, Math.round(52 + 36 * Math.min(1, ratio) + 7 * budgetFit + (d.rating - 4.5) * 8));
      return { d, match, hits, why: `${hits.map((h) => h.emoji).join(' ')} · ${d.country}` };
    })
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => b.match - a.match || b.d.rating - a.d.rating)
    .slice(0, 8);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH },
  heroTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(20,20,24,0.55)' },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 44 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.accent },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 22 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, minHeight: 112, ...shadow },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  budget: { marginTop: 12, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.xl, padding: 14, ...shadow },
  nextBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  countdown: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1, height: 84, backgroundColor: colors.card, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow },
  pick: { width: 156, height: 196, borderRadius: radius.xl, overflow: 'hidden', ...shadow },
  match: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  cta: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, overflow: 'hidden', ...shadow },
  ctaEmoji: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  nearIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  customize: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 26, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
