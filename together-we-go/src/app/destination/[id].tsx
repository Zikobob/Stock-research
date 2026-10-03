import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToTripSheet, FavStar } from '@/components/explore';
import { placeCategoryIcon } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, IconButton, Pill, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { placesFor } from '@/data/places';
import { currencyByCode } from '@/data/reference';
import { useNow, useWeather } from '@/hooks/useTrip';
import { shareText } from '@/services/share';
import { weatherInfo } from '@/services/weather';
import { MAX_WIDTH, colors, radius } from '@/theme';
import { durationLabel, money, priceTier } from '@/utils/format';
import { distanceKm, kmLabel, nearestAirports } from '@/utils/geo';
import { hoursAhead, deviceTimeZone, partsInTz, time12, utcOffsetLabel } from '@/utils/time';

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = destinationById(String(id));
  const insets = useSafeAreaInsets();
  const weather = useWeather(d?.id);
  const [adding, setAdding] = useState<string | null>(null);
  const now = useNow(60000);
  if (!d) return <EmptyState icon="alert-circle-outline" title="Destination not found" />;

  const places = placesFor(d.id)
    .map((p) => ({ p, km: distanceKm(d, p) }))
    .sort((a, b) => b.p.rating - a.p.rating)
    .slice(0, 6);
  const air = nearestAirports(d, 1)[0];
  const diff = hoursAhead(d.tz, deviceTimeZone());
  const cur = currencyByCode(d.currency);

  const facts: [IconName, string, string][] = [
    ['calendar-outline', 'Best time', d.bestMonths],
    ['wallet-outline', 'Daily cost', `~${money(d.dailyCost)} pp`],
    ['cash-outline', 'Currency', `${d.currency}${cur ? ` (${cur.symbol})` : ''}`],
    ['language-outline', 'Language', d.language],
    ['time-outline', 'Local time', `${time12(partsInTz(now, d.tz).hhmm)} · ${utcOffsetLabel(d.tz)}`],
    ['airplane-outline', 'Airport', `${air.iata} · ${kmLabel(air.km)}`],
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTop, { top: insets.top + 8 }]}>
            <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} bg="rgba(255,255,255,0.9)" bordered={false} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton icon="share-social-outline" label={`Share ${d.city}`} onPress={() => shareText(`${d.city}, ${d.country} 🌍 ${d.blurb} — found on TogetherWeGo`)} bg="rgba(255,255,255,0.9)" bordered={false} />
              <FavStar id={d.id} size={40} />
            </View>
          </View>
          <View style={styles.heroText}>
            <T variant="display" color={colors.white}>
              {d.city}
            </T>
            <View style={styles.row}>
              <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.9)" />
              <T variant="small" color="rgba(255,255,255,0.9)">
                {d.country}
              </T>
              <Ionicons name="star" size={13} color={colors.star} style={{ marginLeft: 8 }} />
              <T variant="small" weight="bold" color={colors.white}>
                {d.rating} <T variant="caption" color="rgba(255,255,255,0.8)">({d.reviews.toLocaleString()} reviews)</T>
              </T>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.tags}>
            {d.tags.map((t) => (
              <Pill key={t} label={t === 'best' ? 'Top pick' : t[0].toUpperCase() + t.slice(1)} tone={t === 'best' ? 'yellow' : 'green'} />
            ))}
            <Pill label={'$'.repeat(d.priceLevel)} tone="gray" />
          </View>
          <T variant="body" color={colors.textSecondary}>
            {d.blurb}
          </T>

          {weather ? (
            <Press onPress={() => router.push({ pathname: '/weather', params: { id: d.id } })} style={styles.weather}>
              <Ionicons name={weatherInfo(weather.current.code).icon} size={26} color="#E8A23A" />
              <View style={{ flex: 1 }}>
                <T variant="title">
                  {weather.current.temp}°C · {weatherInfo(weather.current.code).label}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  Next 3 days: {weather.daily.slice(1, 4).map((x) => `${x.max}°`).join(' · ')} {weather.live ? '' : '(estimate)'}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Press>
          ) : null}

          <View style={styles.facts}>
            {facts.map(([icon, label, value]) => (
              <View key={label} style={styles.fact}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <T variant="micro" color={colors.textMuted}>
                  {label}
                </T>
                <T variant="caption" weight="semibold" numberOfLines={2}>
                  {value}
                </T>
              </View>
            ))}
          </View>
          <T variant="caption" color={colors.textMuted}>
            {diff === 0 ? 'Same time zone as you.' : `${Math.abs(diff)}h ${diff > 0 ? 'ahead of' : 'behind'} your time zone.`}
          </T>

          <T variant="h3" style={{ marginTop: 6 }}>
            Top things to do
          </T>
          {places.map(({ p, km }) => (
            <Card key={p.id} style={styles.placeRow} onPress={() => setAdding(d.id)}>
              <View style={styles.placeIcon}>
                <Ionicons name={placeCategoryIcon[p.category]} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="small" weight="semibold">
                  {p.name}
                </T>
                <T variant="caption" color={colors.textSecondary} numberOfLines={2}>
                  {p.blurb}
                </T>
                <T variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  ★ {p.rating} · {durationLabel(p.durationMin)} · {priceTier(p.cost)} · {kmLabel(km)} from centre
                </T>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Add to Trip" icon="add-circle-outline" onPress={() => setAdding(d.id)} style={{ flex: 1 }} />
      </View>
      <AddToTripSheet destinationId={adding} onClose={() => setAdding(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 360, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  heroTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 36, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { marginTop: -22, backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 14, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.yellowSoft, padding: 14, borderRadius: radius.lg },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { width: '31.5%', backgroundColor: colors.card, borderRadius: radius.md, padding: 10, gap: 3, borderWidth: 1, borderColor: colors.border },
  placeRow: { flexDirection: 'row', gap: 12, padding: 14 },
  placeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(244,244,238,0.96)', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', maxWidth: MAX_WIDTH, width: '100%' },
});
