import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { AddToTripSheet, FeaturedCard, PlaceCard } from '@/components/explore';
import { HeroBanner } from '@/components/HeroBanner';
import { MenuSheet, ToolTile, toolGroups } from '@/components/MenuSheet';
import { placeCategoryIcon } from '@/components/trip/meta';
import { Avatar, Card, Chip, IconButton, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { FadeIn, Pulse } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinations, exploreCategories, featured, type Destination, type DestinationTag } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { INTERESTS } from '@/data/personal';
import { placesFor } from '@/data/places';
import { useNow, useWeather } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { nextUpcoming } from '@/services/notifications';
import { weatherInfo, weatherSummary } from '@/services/weather';
import { totalSpent, tripStatus, useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import type { Personal } from '@/store/types';
import { MAX_WIDTH, colors, fonts, radius, shadow } from '@/theme';
import { countdownLabel, lengthBucketLabel, money, priceTier } from '@/utils/format';
import { distanceKm, driveMinutes, kmLabel, nearestAirports } from '@/utils/geo';
import { greetingFor, rangeLabel, time12 } from '@/utils/time';
import { destinationById } from '@/data/destinations';

export default function Explore() {
  const t = useT();
  const { width } = useWindowDimensions();
  const user = useCurrentUser();
  const trip = useActiveTrip();
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const lead = useAppStore((s) => s.settings.reminderLeadMin);
  const personal = useAppStore((s) => s.personal);
  const show = personal.sections;
  const now = useNow(30000);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'all' | DestinationTag>('all');
  const [radiusKm, setRadiusKm] = useState(5);
  const [menu, setMenu] = useState(false);
  const [addDest, setAddDest] = useState<string | null>(null);

  const dest = trip ? destinationById(trip.destinationId) : destinationById('tokyo');
  const weather = useWeather(dest?.id);
  const hour = new Date(now).getHours();
  const status = trip ? tripStatus(trip) : null;
  const next = nextUpcoming(trip);
  const airport = dest ? nearestAirports(dest, 1)[0] : undefined;
  const colW = Math.min(width, MAX_WIDTH) - 40;

  const q = query.trim().toLowerCase();
  const results = destinations.filter(
    (d) => (cat === 'all' || d.tags.includes(cat)) && (!q || d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.highlights.some((h) => h.toLowerCase().includes(q))),
  );

  const nearby =
    dest && trip
      ? [trip.destinationId, ...trip.extraDestinationIds]
          .flatMap((id) => placesFor(id))
          .map((p) => ({ p, km: distanceKm(dest, p) }))
          .filter((x) => x.km <= radiusKm)
          .sort((a, b) => a.km - b.km)
      : [];

  const firstName = personal.nickname || (user?.name.split(' ')[0] ?? 'traveller');
  const picks = pickedForYou(personal);
  const left = trip ? trip.budget - totalSpent(trip) : 0;

  return (
    <Screen bottomInset={30}>
      {/* Header */}
      <View style={styles.header}>
        <Press onPress={() => router.navigate('/(tabs)/profile')} accessibilityLabel="Open profile">
          <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={42} />
          <View style={styles.emojiBadge}>
            <T style={{ fontSize: 12, lineHeight: 15 }}>{personal.emoji}</T>
          </View>
        </Press>
        <View style={{ flex: 1 }}>
          <T variant="caption" color={colors.textSecondary}>
            {t(greetingFor(hour))}, {firstName} 👋
          </T>
          <T variant="title" weight="bold" color={colors.primary}>
            TogetherWeGo
          </T>
        </View>
        <IconButton icon="color-palette-outline" label="Make it yours" onPress={() => router.push('/personalize')} />
        <IconButton icon="notifications-outline" label={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} />
        <IconButton icon="menu" label="Open menu" onPress={() => setMenu(true)} />
      </View>

      {/* Animated hero */}
      <FadeIn delay={40} from="scale" style={{ marginTop: 14, marginBottom: 16 }}>
        <HeroBanner>
          <T variant="kicker" color="rgba(255,255,255,0.8)">
            {personal.emoji} {t('nav.explore')}
          </T>
          <T variant="display" color={colors.white} style={{ fontSize: 30, lineHeight: 35, marginTop: 4 }} accessibilityRole="header">
            Where to{'\n'}next, {firstName}?
          </T>
          <T variant="small" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }} numberOfLines={2}>
            {t('explore.subtitle')}
          </T>
        </HeroBanner>
      </FadeIn>

      {/* Active trip */}
      {trip ? (
        <FadeIn delay={120}>
          <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.tripCard} accessibilityLabel={`Open ${trip.name}`}>
            <LinearGradient colors={[colors.primary, colors.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.tripBlob} />
            <Image source={imageSource(trip.cover)} style={styles.tripThumb} contentFit="cover" />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.tripBadge}>
                <T variant="micro" weight="bold" color={colors.white} style={{ letterSpacing: 0.8 }}>
                  {status === 'active' ? t('explore.activeTrip').toUpperCase() : status === 'planning' ? t('explore.upcomingTrip').toUpperCase() : t('explore.pastTrip').toUpperCase()}
                </T>
              </View>
              <T variant="title" weight="bold" color={colors.white} numberOfLines={1}>
                {trip.name}
              </T>
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
                <T variant="micro" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {rangeLabel(trip.startDate, trip.endDate)}
                  {status === 'planning' ? ` · in ${Math.max(1, Math.round((Date.parse(trip.startDate) - now) / 86400000))} days` : ''}
                </T>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={styles.leftPill}>
                <T variant="micro" weight="bold" color={colors.primary}>
                  {left >= 0 ? t('explore.left', { amount: money(left) }) : `${money(-left)} over`}
                </T>
              </View>
              <View style={styles.row}>
                <T variant="micro" color="rgba(255,255,255,0.8)">
                  {t('explore.members', { n: trip.members.length })}
                </T>
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.8)" />
              </View>
            </View>
          </Press>
        </FadeIn>
      ) : (
        <Card style={{ gap: 12 }}>
          <T variant="title">Plan your first group trip ✈️</T>
          <T variant="small" color={colors.textSecondary}>
            Create a trip, invite friends with a code and start planning together.
          </T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Create trip" size="md" icon="add" onPress={() => router.push('/new-trip')} style={{ flex: 1 }} />
            <Button label="Join" size="md" variant="secondary" icon="people-outline" onPress={() => router.push('/join')} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Live reminder */}
      {trip && next && show.reminder ? (
        <FadeIn delay={180}>
          <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.reminder} accessibilityLabel="Next reminder">
            <Pulse style={styles.reminderIcon} scale={1.1}>
              <Ionicons name={next.a.reminder ? 'notifications' : 'time-outline'} size={16} color={colors.primary} />
            </Pulse>
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold" numberOfLines={1}>
                {t('explore.reminder')} · {time12(next.a.time)} — {next.a.title}
              </T>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {next.a.reminder ? t('explore.reminderSub', { n: lead }) : 'Tap the bell on the activity to get a reminder.'}
              </T>
            </View>
            <View style={styles.countdown}>
              <T variant="micro" weight="bold" color={colors.white}>
                {next.startUtc - now > 0 ? `in ${countdownLabel(next.startUtc - now)}` : 'Now'}
              </T>
            </View>
          </Press>
        </FadeIn>
      ) : null}

      {/* Personalised picks */}
      {show.forYou ? (
        personal.done && picks.length ? (
          <FadeIn delay={240}>
            <SectionHeader title="Picked for you ✨" action="Edit" onAction={() => router.push('/personalize')} style={{ marginTop: 22 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
              {picks.map(({ d, match, why }, i) => (
                <FadeIn key={d.id} delay={300 + i * 70} from="right">
                  <Press
                    onPress={() =>
                      router.push({
                        pathname: '/destination/[id]',
                        params: { id: d.id },
                      })
                    }
                    style={styles.pick}
                    accessibilityLabel={`${d.city}, ${match}% match`}>
                    <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
                    <View style={styles.matchPill}>
                      <T variant="micro" weight="bold" color="#1A1C17">
                        {match}% match
                      </T>
                    </View>
                    <View
                      style={{
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: 12,
                      }}>
                      <T variant="title" weight="bold" color={colors.white} numberOfLines={1}>
                        {d.city}
                      </T>
                      <T variant="micro" color="rgba(255,255,255,0.9)" numberOfLines={1}>
                        {why}
                      </T>
                    </View>
                  </Press>
                </FadeIn>
              ))}
            </ScrollView>
          </FadeIn>
        ) : !personal.done ? (
          <FadeIn delay={240}>
            <Press onPress={() => router.push('/personalize')} style={styles.cta} accessibilityLabel="Make TogetherWeGo yours — take the 60-second survey">
              <LinearGradient colors={[colors.accent, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.ctaEmoji}>
                <T style={{ fontSize: 26, lineHeight: 32 }}>🎨</T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="title" weight="bold" color={colors.white}>
                  Make TogetherWeGo yours
                </T>
                <T variant="caption" color="rgba(255,255,255,0.92)">
                  60-sec survey · pick colours, interests & your home screen
                </T>
              </View>
              <Ionicons name="arrow-forward-circle" size={30} color={colors.white} />
            </Press>
          </FadeIn>
        ) : null
      ) : null}

      {show.popular ? (
        <FadeIn delay={300}>
          {/* Search */}
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('explore.search')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              accessibilityLabel="Search destinations"
              returnKeyType="search"
            />
            {query ? (
              <Press onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Press>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 14 }}>
            {exploreCategories.map((c) => (
              <Chip key={c.key} label={t(c.labelKey)} image={c.image} active={cat === c.key} onPress={() => setCat(c.key)} />
            ))}
          </ScrollView>

          {/* Popular */}
          <SectionHeader
            title={query ? `Results` : t('explore.popular')}
            action={results.length > 4 ? t('explore.seeAll') : t('explore.matches', { n: results.length })}
            onAction={() =>
              router.push({
                pathname: '/destinations',
                params: { q: query, cat },
              })
            }
            style={{ marginTop: 22 }}
          />
          {results.length ? (
            <View style={styles.grid}>
              {results.slice(0, 6).map((d) => (
                <PlaceCard key={d.id} d={d} style={{ width: (colW - 12) / 2 }} />
              ))}
            </View>
          ) : (
            <Card>
              <T variant="small" color={colors.textSecondary}>
                {t('explore.noResults', { q: query })}
              </T>
            </Card>
          )}
        </FadeIn>
      ) : null}

      {show.featured ? (
        <FadeIn delay={360}>
          {/* Featured */}
          <SectionHeader title={t('explore.featured')} action={t('explore.seeAll')} onAction={() => router.push('/destinations')} style={{ marginTop: 24 }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={colW * 0.88 + 12}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
            style={{ marginHorizontal: -20 }}>
            {featured.map((f) => (
              <FeaturedCard key={f.id} f={f} width={colW * 0.88} onAdd={setAddDest} />
            ))}
          </ScrollView>
        </FadeIn>
      ) : null}

      {/* Weather + airport */}
      {show.glance ? (
        <FadeIn delay={420}>
          <View style={[styles.grid, { marginTop: 20 }]}>
            <Press onPress={() => router.push('/weather')} style={[styles.mini, { width: (colW - 12) / 2 }]} accessibilityLabel="Weather">
              <LinearGradient colors={['#FDBA4D', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.miniBlob} />
              <Ionicons name={weather ? weatherInfo(weather.current.code).icon : 'partly-sunny'} size={24} color={colors.white} />
              <T variant="h2" color={colors.white} style={{ marginTop: 6 }}>
                {weather ? `${weather.current.temp}°C` : '—'}
              </T>
              <T variant="caption" color="rgba(255,255,255,0.92)" numberOfLines={1}>
                {dest?.city} · {weatherSummary(weather)}
              </T>
            </Press>
            <Press onPress={() => router.push('/airport')} style={[styles.mini, { width: (colW - 12) / 2 }]} accessibilityLabel="Nearest airport">
              <LinearGradient colors={['#60A5FA', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.miniBlob} />
              <Ionicons name="airplane" size={24} color={colors.white} />
              <T variant="h2" color={colors.white} style={{ marginTop: 6 }}>
                {airport?.iata ?? '—'}
              </T>
              <T variant="caption" color="rgba(255,255,255,0.92)" numberOfLines={1}>
                {t('explore.nearestAirport')} · {airport ? `${driveMinutes(airport.km)} min` : ''}
              </T>
            </Press>
          </View>
        </FadeIn>
      ) : null}

      {/* Nearby within radius */}
      {trip && dest && show.nearby ? (
        <FadeIn delay={480}>
          <Card style={{ marginTop: 16 }}>
            <View style={styles.nearHead}>
              <T variant="title">{t('explore.nearby')}</T>
              <T variant="small" weight="bold" color={colors.primary}>
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
                  <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="small" weight="semibold" numberOfLines={1}>
                    {p.name}
                  </T>
                  <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {p.category[0].toUpperCase() + p.category.slice(1)} · {lengthBucketLabel(p.durationMin)} · {priceTier(p.cost)}
                  </T>
                </View>
                <T variant="caption" weight="semibold" color={colors.textSecondary}>
                  {kmLabel(km)}
                </T>
              </Press>
            ))}
            <Button label="Explore nearby with filters" variant="soft" size="md" icon="options-outline" onPress={() => router.push('/nearby')} style={{ marginTop: 8 }} />
          </Card>
        </FadeIn>
      ) : null}

      {/* Tools */}
      {show.tools ? (
        <FadeIn delay={540}>
          <SectionHeader title={t('explore.tools')} action="All" onAction={() => setMenu(true)} style={{ marginTop: 24 }} />
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
              {[...toolGroups[0].items.slice(0, 3), ...toolGroups[1].items.slice(0, 3), ...toolGroups[2].items.slice(0, 3)].map((it) => (
                <ToolTile key={it.label} {...it} onPress={() => router.push(it.href)} />
              ))}
            </View>
          </Card>
        </FadeIn>
      ) : null}

      <Press onPress={() => router.push('/personalize')} style={styles.customize} accessibilityLabel="Customize this page">
        <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
        <T variant="small" weight="semibold" color={colors.primary}>
          Customize this page
        </T>
      </Press>

      <MenuSheet visible={menu} onClose={() => setMenu(false)} />
      <AddToTripSheet destinationId={addDest} onClose={() => setAddDest(null)} />
    </Screen>
  );
}

/** Ranks destinations against the "Make it yours" answers (interests + budget style). */
function pickedForYou(p: Personal): { d: Destination; match: number; why: string }[] {
  if (!p.interests.length) return [];
  return destinations
    .map((d) => {
      const hits = INTERESTS.filter((i) => p.interests.includes(i.key) && d.tags.includes(i.key));
      const budgetFit = p.budgetStyle === 'saver' ? (d.priceLevel <= 2 ? 1 : 0) : p.budgetStyle === 'treat' ? (d.priceLevel >= 3 ? 1 : 0) : d.priceLevel <= 3 ? 1 : 0;
      const ratio = hits.length / Math.min(3, p.interests.length);
      const match = Math.min(99, Math.round(52 + 36 * Math.min(1, ratio) + 7 * budgetFit + (d.rating - 4.5) * 8));
      return {
        d,
        match,
        hits,
        why: hits.length
          ? hits
              .map((h) => `${h.emoji} ${h.label}`)
              .slice(0, 2)
              .join(' · ')
          : 'A wildcard you might love',
      };
    })
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => b.match - a.match || b.d.rating - a.d.rating)
    .slice(0, 8);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 12,
    overflow: 'hidden',
    ...shadow,
  },
  tripBlob: {
    position: 'absolute',
    right: -30,
    top: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emojiBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pick: {
    width: 156,
    height: 196,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow,
  },
  matchPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow,
  },
  ctaEmoji: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBlob: {
    position: 'absolute',
    right: -24,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  customize: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryLine,
  },
  tripThumb: { width: 58, height: 58, borderRadius: 14 },
  tripBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  leftPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reminder: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLine,
    borderRadius: radius.lg,
    padding: 12,
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  search: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    height: '100%',
    ...({ outlineStyle: 'none' } as object),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mini: { borderRadius: radius.lg, padding: 14, overflow: 'hidden', ...shadow },
  nearHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nearIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
