import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { WeatherBoard } from '@/components/more/WeatherBoard';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionHeader } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useWeather } from '@/hooks/useTrip';
import { cToF, fetchWeather, weatherInfo } from '@/services/weather';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';
import { timeAgo } from '@/utils/format';
import { dayLabel, weekdayShort } from '@/utils/time';

/** Today: one huge mono number and the sky it belongs to, then humidity, wind and rain in three small columns. */
function Today({ w, unitF }: { w: NonNullable<ReturnType<typeof useWeather>>; unitF: boolean }) {
  const info = weatherInfo(w.current.code);
  const temp = unitF ? cToF(w.current.temp) : w.current.temp;
  return (
    <View>
      <T variant="kicker" color={colors.textSecondary}>
        Right now
      </T>
      <View style={styles.big} accessible accessibilityLabel={`${temp} degrees ${unitF ? 'Fahrenheit' : 'Celsius'}, ${info.label}`}>
        <T variant="hero" style={{ flexShrink: 1 }}>
          {temp}°
        </T>
        <Ionicons name={info.icon} size={76} color={colors.ink} />
      </View>
      <T variant="headline" accessibilityRole="header">
        {info.label}
      </T>
      <View style={styles.stats}>
        {[
          ['Humidity', `${w.current.humidity}`, '%'],
          ['Wind', `${w.current.wind}`, ' km/h'],
          ['Rain today', `${w.daily[0]?.rain ?? 0}`, '%'],
        ].map(([label, value, unit], i) => (
          <View key={label} style={[styles.stat, i > 0 && styles.statLine]} accessible accessibilityLabel={`${label} ${value}${unit}`}>
            <T variant="kicker" color={colors.textSecondary}>
              {label}
            </T>
            <T variant="numeralSm">
              {value}
              <T variant="kicker" color={colors.textSecondary}>
                {unit.toUpperCase()}
              </T>
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The same shape as the real thing, so nothing jumps when the forecast arrives. */
function WeatherSkeleton() {
  return (
    <View style={{ gap: space.xxl }} accessibilityLabel="Loading the forecast">
      <View style={{ gap: space.md }}>
        <Skeleton width={90} height={14} />
        <Skeleton height={76} />
        <Skeleton width={200} height={28} />
      </View>
      <Skeleton height={430} />
    </View>
  );
}

export default function Weather() {
  const params = useLocalSearchParams<{ id?: string }>();
  const trip = useActiveTrip();
  const options = trip ? [trip.destinationId, ...trip.extraDestinationIds] : [];
  const [id, setId] = useState(params.id ?? trip?.destinationId ?? 'tokyo');
  const [unitF, setUnitF] = useState(false);
  const [loading, setLoading] = useState(false);
  const addPacking = useAppStore((s) => s.addPackingItems);
  const w = useWeather(id);
  const d = destinationById(id)!;
  const u = (c: number) => (unitF ? `${cToF(c)}°F` : `${c}°C`);
  const rainy = w?.daily.filter((x) => x.rain >= 50) ?? [];
  const best = w?.daily.slice().sort((a, b) => a.rain - b.rain || b.max - a.max)[0];
  const maxT = Math.max(...(w?.daily.map((x) => x.max) ?? [30]));
  const minT = Math.min(...(w?.daily.map((x) => x.min) ?? [0]));

  const tips: string[] = [];
  if (w) {
    if (rainy.length) tips.push('Compact umbrella or rain jacket');
    if (maxT >= 27) tips.push('Sunscreen, hat & refillable water bottle');
    if (minT <= 12) tips.push('Warm layer for evenings');
    if (minT <= 3) tips.push('Gloves & beanie');
    tips.push('Comfortable walking shoes');
  }

  return (
    <Screen
      header={<Header kicker={`${d.city}, ${d.country}`} title="Weather" subtitle={w ? `${w.live ? 'Live forecast' : 'Estimated (offline)'} · updated ${timeAgo(w.fetchedAt)}` : 'Loading…'} backLabel="More" />}
      onRefresh={async () => {
        setLoading(true);
        const r = await fetchWeather(id, true);
        setLoading(false);
        toast(r?.live ? 'Forecast updated' : 'Offline. Showing the last saved forecast', { tone: r?.live ? 'ok' : 'warn' });
      }}
      refreshing={loading}>
      {options.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {options.map((o) => (
            <Chip key={o} label={destinationById(o)?.city ?? o} active={o === id} onPress={() => setId(o)} />
          ))}
        </ScrollView>
      ) : null}

      {w ? (
        <>
          <Today w={w} unitF={unitF} />

          <View style={styles.statusRow}>
            {w.live ? <Stamp label="Live · Open-Meteo" tone="positive" icon="radio-button-on" rotate={0} /> : <Stamp label="Estimate" tone="warn" icon="cloud-offline-outline" rotate={0} />}
            <View style={{ flex: 1 }} />
            <Chip label="°C" active={!unitF} onPress={() => setUnitF(false)} />
            <Chip label="°F" active={unitF} onPress={() => setUnitF(true)} />
          </View>
          {!w.live ? (
            <T variant="caption" color={colors.textSecondary} style={{ marginTop: space.sm }}>
              No connection, so this is a typical week for {d.city}. Pull down to refresh when you are back online.
            </T>
          ) : null}

          <View style={{ marginTop: space.xl }}>
            <WeatherBoard daily={w.daily} city={d.city} unitF={unitF} />
          </View>

          {best ? (
            <Card style={styles.best}>
              <View style={styles.bestIcon}>
                <Ionicons name="sunny-outline" size={24} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="kicker" color={colors.textSecondary}>
                  Best outdoor day
                </T>
                <T variant="numeralSm">
                  {weekdayShort(best.date)} {dayLabel(best.date)}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  {best.rain}% rain, up to {u(best.max)}. Plan hikes and day trips here.
                </T>
              </View>
            </Card>
          ) : null}

          <View style={{ marginTop: space.section }}>
            <SectionHeader title="What to pack" />
            <View>
              {tips.map((t, i) => (
                <View key={t} style={[styles.tip, i === 0 && { borderTopWidth: 0 }]}>
                  <Ionicons name="checkmark" size={18} color={colors.ink} />
                  <T variant="bodySm" style={{ flex: 1 }}>
                    {t}
                  </T>
                </View>
              ))}
            </View>
            {trip ? (
              <Button
                label="Add these to the packing list"
                icon="briefcase-outline"
                style={{ marginTop: space.xl }}
                onPress={() => {
                  addPacking(trip.id, tips.map((text) => ({ text, category: 'Weather' })));
                  toast('Added to the shared packing list');
                }}
              />
            ) : null}
          </View>
        </>
      ) : (
        <WeatherSkeleton />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -20, marginBottom: space.xl, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: 20, paddingRight: 28 },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: 2, marginBottom: space.xs },
  stats: { flexDirection: 'row', marginTop: space.lg, borderTopWidth: hair, borderTopColor: colors.border, paddingTop: space.md },
  stat: { flex: 1, gap: 2, paddingLeft: 0 },
  statLine: { paddingLeft: space.md, borderLeftWidth: hair, borderLeftColor: colors.border },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl },
  best: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, backgroundColor: colors.accentSoft },
  bestIcon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingVertical: space.sm, borderTopWidth: hair, borderTopColor: colors.border },
});
