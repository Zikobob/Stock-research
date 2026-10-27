import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToTripSheet, FavStar } from '@/components/explore';
import { placeCategoryIcon } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, SectionHeader } from '@/components/ui/bits';
import { useMotion, useScrollY } from '@/components/ui/motion';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Header, Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { panoById } from '@/data/panoramas';
import { placesFor } from '@/data/places';
import { currencyByCode } from '@/data/reference';
import { useNow, useWeather } from '@/hooks/useTrip';
import { shareText } from '@/services/share';
import { weatherInfo } from '@/services/weather';
import { MAX_WIDTH, colors, hair, line, radius, space } from '@/theme';
import { durationLabel, money, priceTier } from '@/utils/format';
import { distanceKm, kmLabel, nearestAirports } from '@/utils/geo';
import { deviceTimeZone, hoursAhead, partsInTz, time12, utcOffsetLabel } from '@/utils/time';

/** How far the photo slides while the page scrolls (it is that much taller than its frame, so no gap shows). */
const PARALLAX = 60;
const HERO = 380;

/** 9,400 becomes "9.4K": a count that fits under a number in a narrow cell. */
const compactCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

/** An outlined square on the photo, like the controls on Home. */
function Control({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} style={styles.control}>
      {children}
    </PlatePress>
  );
}

/** One row of "At a glance": a small caps label on the left, the value on the right, a hair rule above. */
function Fact({ label, children, sub, first }: { label: string; children: ReactNode; sub?: string; first?: boolean }) {
  return (
    <View style={[styles.fact, first && styles.first]}>
      <T variant="kicker" color={colors.textSecondary} style={{ width: 96 }}>
        {label}
      </T>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {children}
        {sub ? (
          <T variant="caption" color={colors.textSecondary} style={{ textAlign: 'right' }}>
            {sub}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = destinationById(String(id));
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const motion = useMotion();
  const { y, onScroll } = useScrollY();
  const weather = useWeather(d?.id);
  const [adding, setAdding] = useState<string | null>(null);
  const now = useNow(60000);
  if (!d)
    return (
      <Screen header={<Header title="Destination" />}>
        <EmptyState icon="alert-circle-outline" title="Destination not found" />
      </Screen>
    );

  const places = placesFor(d.id)
    .map((p) => ({ p, km: distanceKm(d, p) }))
    .sort((a, b) => b.p.rating - a.p.rating)
    .slice(0, 6);
  const air = nearestAirports(d, 1)[0];
  const diff = hoursAhead(d.tz, deviceTimeZone());
  const cur = currencyByCode(d.currency);
  const heroH = HERO + insets.top;
  const best = d.bestMonths.split(',').map((s) => s.trim());
  const topPick = d.tags.includes('best');
  const tags = d.tags.filter((t) => t !== 'best');
  const slide = motion ? y.interpolate({ inputRange: [0, heroH], outputRange: [0, PARALLAX], extrapolate: 'clamp' }) : 0;
  // pulled past the top, the photo grows instead of showing a gap
  const grow = motion ? y.interpolate({ inputRange: [-240, 0], outputRange: [1.6, 1], extrapolate: 'clamp' }) : 1;
  const barOpacity = y.interpolate({ inputRange: [heroH - 150, heroH - 90], outputRange: [0, 1], extrapolate: 'clamp' });
  const narrow = width < 350;
  const factSize = narrow ? 15 : 18;

  return (
    <View style={styles.root}>
      <View style={styles.column}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
          <View style={{ height: heroH, overflow: 'hidden', backgroundColor: colors.ink }}>
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: -PARALLAX, height: heroH + PARALLAX, transform: [{ translateY: slide }, { scale: grow }] }}>
              <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
            </Animated.View>
            {/* the one scrim: it keeps the controls above and the name below readable on any photo */}
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroText} pointerEvents="none">
              <T variant="kicker" color={colors.white}>
                {d.country}
              </T>
              <T variant="display" color={colors.white} numberOfLines={2} accessibilityRole="header" style={{ fontSize: d.city.length > 10 ? 40 : 56, lineHeight: d.city.length > 10 ? 44 : 60 }}>
                {d.city}
              </T>
            </View>
          </View>

          <View style={styles.body}>
            {/* the quick facts: an outlined strip lying across the lower edge of the photo */}
            <Card plated padded={false}>
              <View style={styles.strip}>
                <View style={styles.cell} accessible accessibilityLabel={`Rated ${d.rating} from ${d.reviews.toLocaleString()} reviews`}>
                  <T variant="kicker" color={colors.textSecondary}>
                    Rating
                  </T>
                  <View style={styles.valueRow}>
                    <Ionicons name="star" size={factSize - 2} color={colors.ink} />
                    <T variant="numeralSm" style={{ fontSize: factSize + 3, lineHeight: factSize + 9 }}>
                      {d.rating.toFixed(1)}
                    </T>
                  </View>
                  <T variant="micro" color={colors.textSecondary} numberOfLines={1}>
                    {compactCount(d.reviews)}
                    {narrow ? '' : ' reviews'}
                  </T>
                </View>
                <View style={styles.cutline} />
                <View style={styles.cell} accessible accessibilityLabel={`Price level ${d.priceLevel} of 4, about ${money(d.dailyCost)} a day each`}>
                  <T variant="kicker" color={colors.textSecondary}>
                    Price
                  </T>
                  <T variant="numeralSm" style={{ fontSize: factSize + 3, lineHeight: factSize + 9 }}>
                    {'$'.repeat(d.priceLevel)}
                    <T variant="numeralSm" color={colors.borderStrong} style={{ fontSize: factSize + 3, lineHeight: factSize + 9 }}>
                      {'$'.repeat(4 - d.priceLevel)}
                    </T>
                  </T>
                  <T variant="micro" color={colors.textSecondary} numberOfLines={1}>
                    ~{money(d.dailyCost)} a day
                  </T>
                </View>
                <View style={styles.cutline} />
                <View style={styles.cell} accessible accessibilityLabel={`Best time to go: ${d.bestMonths}`}>
                  <T variant="kicker" color={colors.textSecondary}>
                    Best
                  </T>
                  <T variant="numeralSm" numberOfLines={1} style={{ fontSize: factSize, lineHeight: factSize + 9 }}>
                    {best[0]}
                  </T>
                  <T variant="micro" color={colors.textSecondary} numberOfLines={1}>
                    {best[1] ? `and ${best[1]}` : 'all year'}
                  </T>
                </View>
              </View>
            </Card>

            <View style={styles.about}>
              {topPick || tags.length ? (
                <View style={styles.tagRow}>
                  {topPick ? <Stamp label="Top pick" tone="accent" /> : null}
                  <T variant="kicker" color={colors.textSecondary} style={{ flexShrink: 1 }}>
                    {tags.slice(0, 4).join(' · ')}
                  </T>
                </View>
              ) : null}
              <T variant="body">{d.blurb}</T>
            </View>

            <View style={{ marginTop: space.section }}>
              <SectionHeader title="Weather" action="Details" onAction={() => router.push({ pathname: '/weather', params: { id: d.id } })} />
              {weather ? (
                <Press onPress={() => router.push({ pathname: '/weather', params: { id: d.id } })} style={styles.weather} scaleTo={0.99} accessibilityLabel={`Weather in ${d.city}: ${weather.current.temp} degrees, ${weatherInfo(weather.current.code).label}. Open the forecast`}>
                  <View style={styles.weatherIcon}>
                    <Ionicons name={weatherInfo(weather.current.code).icon} size={28} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="numeralSm">{weather.current.temp}°C</T>
                    <T variant="small" color={colors.textSecondary}>
                      {weatherInfo(weather.current.code).label}
                      {weather.live ? '' : ' (estimate)'}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T variant="kicker" color={colors.textSecondary}>
                      Next 3 days
                    </T>
                    <T variant="small" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                      {weather.daily.slice(1, 4).map((x) => `${x.max}°`).join('  ')}
                    </T>
                  </View>
                </Press>
              ) : (
                <Skeleton height={72} />
              )}
            </View>

            <View style={{ marginTop: space.section }}>
              <SectionHeader title="At a glance" />
              <View>
                <Fact label="Currency" first>
                  <T variant="small" weight="bold">
                    {d.currency}
                    {cur ? ` (${cur.symbol})` : ''}
                  </T>
                </Fact>
                <Fact label="Language">
                  <T variant="small" weight="bold">
                    {d.language}
                  </T>
                </Fact>
                <Fact label="Local time" sub={diff === 0 ? 'Same time zone as you' : `${Math.abs(diff)}h ${diff > 0 ? 'ahead of' : 'behind'} you`}>
                  <T variant="small" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                    {time12(partsInTz(now, d.tz).hhmm)} · {utcOffsetLabel(d.tz)}
                  </T>
                </Fact>
                <Fact label="Airport">
                  <T variant="small" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                    {air.iata} · {kmLabel(air.km)}
                  </T>
                </Fact>
              </View>
            </View>

            <View style={{ marginTop: space.section }}>
              <SectionHeader title="Top things to do" />
              <View>
                {places.map(({ p, km }, i) => (
                  <Press key={p.id} onPress={() => setAdding(d.id)} style={[styles.place, i === 0 && styles.first]} scaleTo={0.99} accessibilityLabel={`${p.name}. Plan a trip to ${d.city}`}>
                    <View style={styles.placeIcon}>
                      <Ionicons name={placeCategoryIcon[p.category]} size={20} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="bodySm" weight="semibold">
                        {p.name}
                      </T>
                      <T variant="caption" color={colors.textSecondary} numberOfLines={2}>
                        {p.blurb}
                      </T>
                      <T variant="kicker" color={colors.textSecondary} style={{ marginTop: 2 }}>
                        {p.rating.toFixed(1)} stars · {durationLabel(p.durationMin)} · {priceTier(p.cost)} · {kmLabel(km)}
                      </T>
                    </View>
                  </Press>
                ))}
              </View>
            </View>
          </View>
        </Animated.ScrollView>

        {/* once the photo has scrolled away, a paper bar with the city's name takes its place behind the controls */}
        <Animated.View pointerEvents="none" style={[styles.bar, { height: insets.top + 64, opacity: barOpacity }]}>
          <View style={styles.barTitle}>
            <T variant="title" weight="bold" numberOfLines={1}>
              {d.city}
            </T>
          </View>
        </Animated.View>

        {/* controls stay put while the page scrolls under them */}
        <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
          <Control onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} label="Go back">
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Control>
          <View style={{ flex: 1 }} />
          {panoById(d.id) ? (
            <Control onPress={() => router.push({ pathname: '/panorama', params: { city: d.id } })} label={`360° view of ${d.city}`}>
              <Ionicons name="globe-outline" size={20} color={colors.ink} />
            </Control>
          ) : null}
          <Control onPress={() => shareText(`${d.city}, ${d.country}. ${d.blurb} Found on TogetherWeGo.`)} label={`Share ${d.city}`}>
            <Ionicons name="share-social-outline" size={20} color={colors.ink} />
          </Control>
          <FavStar id={d.id} />
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Rule />
          <View style={styles.footerBody}>
            <Button label="Plan a trip here" icon="airplane-outline" onPress={() => setAdding(d.id)} />
          </View>
        </View>
      </View>
      <AddToTripSheet destinationId={adding} onClose={() => setAdding(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  control: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 58, gap: 2 },
  body: { paddingHorizontal: 20, marginTop: -34 },
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, gap: 2, minWidth: 0 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cutline: { width: line, backgroundColor: colors.ink },
  about: { marginTop: space.xxl, gap: space.md },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, padding: 12, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  weatherIcon: { width: 48, height: 48, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48, paddingVertical: 12, borderTopWidth: hair, borderTopColor: colors.border },
  place: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 56, paddingVertical: 14, borderTopWidth: hair, borderTopColor: colors.border },
  first: { borderTopWidth: 0 },
  barTitle: { height: 44, marginBottom: 10, marginLeft: 76, marginRight: 176, justifyContent: 'center' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.bg, borderBottomWidth: line, borderBottomColor: colors.ink, justifyContent: 'flex-end' },
  placeIcon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  footerBody: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
});
