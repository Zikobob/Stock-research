import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { AddToTripSheet, FeaturedCard, PlaceCard } from '@/components/explore';
import { MenuSheet, ToolTile, toolGroups } from '@/components/MenuSheet';
import { placeCategoryIcon } from '@/components/trip/meta';
import { Avatar, Card, Chip, IconButton, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Slider } from '@/components/ui/Slider';
import { T } from '@/components/ui/T';
import { destinations, exploreCategories, featured, type DestinationTag } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { placesFor } from '@/data/places';
import { useNow, useWeather } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { nextUpcoming } from '@/services/notifications';
import { weatherInfo, weatherSummary } from '@/services/weather';
import { totalSpent, tripStatus, useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
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
    (d) =>
      (cat === 'all' || d.tags.includes(cat)) &&
      (!q || d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.highlights.some((h) => h.toLowerCase().includes(q))),
  );

  const nearby =
    dest && trip
      ? [trip.destinationId, ...trip.extraDestinationIds]
          .flatMap((id) => placesFor(id))
          .map((p) => ({ p, km: distanceKm(dest, p) }))
          .filter((x) => x.km <= radiusKm)
          .sort((a, b) => a.km - b.km)
      : [];

  const firstName = user?.name.split(' ')[0] ?? 'traveller';
  const left = trip ? trip.budget - totalSpent(trip) : 0;

  return (
    <Screen bottomInset={30}>
      {/* Header */}
      <View style={styles.header}>
        <Press onPress={() => router.navigate('/(tabs)/profile')} accessibilityLabel="Open profile">
          <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={42} />
        </Press>
        <View style={{ flex: 1 }}>
          <T variant="caption" color={colors.textSecondary}>
            {t(greetingFor(hour))}, {firstName} 👋
          </T>
          <T variant="title" weight="bold" color={colors.primary}>
            TogetherWeGo
          </T>
        </View>
        <IconButton icon="notifications-outline" label={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} />
        <IconButton icon="menu" label="Open menu" onPress={() => setMenu(true)} />
      </View>

      <T variant="display" style={{ marginTop: 14 }} accessibilityRole="header">
        {t('explore.title')}
      </T>
      <T variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: 16 }}>
        {t('explore.subtitle')}
      </T>

      {/* Active trip */}
      {trip ? (
        <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.tripCard} accessibilityLabel={`Open ${trip.name}`}>
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
      {trip && next ? (
        <Press onPress={() => router.navigate('/(tabs)/itinerary')} style={styles.reminder} accessibilityLabel="Next reminder">
          <View style={styles.reminderIcon}>
            <Ionicons name={next.a.reminder ? 'notifications' : 'time-outline'} size={16} color={colors.primary} />
          </View>
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
      ) : null}

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
        onAction={() => router.push({ pathname: '/destinations', params: { q: query, cat } })}
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

      {/* Featured */}
      <SectionHeader title={t('explore.featured')} action={t('explore.seeAll')} onAction={() => router.push('/destinations')} style={{ marginTop: 24 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={colW * 0.88 + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
        {featured.map((f) => (
          <FeaturedCard key={f.id} f={f} width={colW * 0.88} onAdd={setAddDest} />
        ))}
      </ScrollView>

      {/* Weather + airport */}
      <View style={[styles.grid, { marginTop: 20 }]}>
        <Press onPress={() => router.push('/weather')} style={[styles.mini, { width: (colW - 12) / 2 }]} accessibilityLabel="Weather">
          <Ionicons name={weather ? weatherInfo(weather.current.code).icon : 'partly-sunny'} size={22} color="#E8A23A" />
          <T variant="h2" style={{ marginTop: 6 }}>
            {weather ? `${weather.current.temp}°C` : '—'}
          </T>
          <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {dest?.city} · {weatherSummary(weather)}
          </T>
        </Press>
        <Press onPress={() => router.push('/airport')} style={[styles.mini, { width: (colW - 12) / 2 }]} accessibilityLabel="Nearest airport">
          <Ionicons name="airplane" size={22} color={colors.blue} />
          <T variant="h2" style={{ marginTop: 6 }}>
            {airport?.iata ?? '—'}
          </T>
          <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {t('explore.nearestAirport')} · {airport ? `${driveMinutes(airport.km)} min` : ''}
          </T>
        </Press>
      </View>

      {/* Nearby within radius */}
      {trip && dest ? (
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
      ) : null}

      {/* Tools */}
      <SectionHeader title={t('explore.tools')} action="All" onAction={() => setMenu(true)} style={{ marginTop: 24 }} />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          {[...toolGroups[0].items.slice(0, 3), ...toolGroups[1].items.slice(0, 3), ...toolGroups[2].items.slice(0, 3)].map((it) => (
            <ToolTile key={it.label} {...it} onPress={() => router.push(it.href)} />
          ))}
        </View>
      </Card>

      <MenuSheet visible={menu} onClose={() => setMenu(false)} />
      <AddToTripSheet destinationId={addDest} onClose={() => setAddDest(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 12, ...shadow },
  tripThumb: { width: 58, height: 58, borderRadius: 14 },
  tripBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  leftPill: { backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
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
  reminderIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  countdown: { backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
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
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: '100%', ...({ outlineStyle: 'none' } as object) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mini: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  nearHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  nearIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
