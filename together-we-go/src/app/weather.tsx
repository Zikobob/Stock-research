import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, Chip, Pill } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useWeather } from '@/hooks/useTrip';
import { cToF, fetchWeather, weatherInfo } from '@/services/weather';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { dayLabel, weekdayShort } from '@/utils/time';

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
  const info = w ? weatherInfo(w.current.code) : null;
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
      header={<Header title={`Weather · ${d.city}`} subtitle={w ? `${w.live ? 'Live forecast' : 'Estimated (offline)'} · updated ${timeAgo(w.fetchedAt)}` : 'Loading…'} />}
      onRefresh={async () => {
        setLoading(true);
        const r = await fetchWeather(id, true);
        setLoading(false);
        toast(r?.live ? 'Forecast updated' : 'Offline — showing the last saved forecast', { tone: r?.live ? 'ok' : 'warn' });
      }}
      refreshing={loading}>
      {options.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 12 }}>
          {options.map((o) => (
            <Chip key={o} small label={destinationById(o)?.city ?? o} active={o === id} onPress={() => setId(o)} />
          ))}
        </ScrollView>
      ) : null}

      {w && info ? (
        <>
          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <T variant="kicker" color="rgba(255,255,255,0.75)">
                Right now
              </T>
              <T variant="display" color={colors.white} style={{ fontSize: 54, lineHeight: 60 }}>
                {u(w.current.temp)}
              </T>
              <T variant="title" color={colors.white}>
                {info.label}
              </T>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                <T variant="caption" color="rgba(255,255,255,0.85)">
                  💧 {w.current.humidity}%
                </T>
                <T variant="caption" color="rgba(255,255,255,0.85)">
                  💨 {w.current.wind} km/h
                </T>
              </View>
            </View>
            <Ionicons name={info.icon} size={84} color="#FFD27A" />
          </View>

          <View style={styles.unitRow}>
            {!w.live ? <Pill label="Estimate — connect to refresh" tone="orange" icon="cloud-offline-outline" /> : <Pill label="Live · Open-Meteo" icon="radio-button-on" />}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip small label="°C" active={!unitF} onPress={() => setUnitF(false)} />
              <Chip small label="°F" active={unitF} onPress={() => setUnitF(true)} />
            </View>
          </View>

          <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
            {w.daily.map((x, i) => {
              const di = weatherInfo(x.code);
              const span = Math.max(1, maxT - minT);
              return (
                <View key={x.date} style={[styles.day, i === w.daily.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ width: 70 }}>
                    <T variant="small" weight="semibold">
                      {i === 0 ? 'Today' : weekdayShort(x.date)}
                    </T>
                    <T variant="micro" color={colors.textMuted}>
                      {dayLabel(x.date)}
                    </T>
                  </View>
                  <Ionicons name={di.icon} size={22} color={x.rain >= 50 ? colors.blue : '#E8A23A'} />
                  <T variant="caption" color={x.rain >= 50 ? colors.blue : colors.textMuted} style={{ width: 38, textAlign: 'right' }}>
                    {x.rain}%
                  </T>
                  <T variant="small" color={colors.textSecondary} style={{ width: 38, textAlign: 'right' }}>
                    {unitF ? cToF(x.min) : x.min}°
                  </T>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { left: `${((x.min - minT) / span) * 100}%`, right: `${((maxT - x.max) / span) * 100}%` }]} />
                  </View>
                  <T variant="small" weight="semibold" style={{ width: 34 }}>
                    {unitF ? cToF(x.max) : x.max}°
                  </T>
                </View>
              );
            })}
          </Card>

          {best ? (
            <Card style={{ marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Ionicons name="sunny" size={26} color="#E8A23A" />
              <View style={{ flex: 1 }}>
                <T variant="small" weight="semibold">
                  Best outdoor day: {weekdayShort(best.date)} {dayLabel(best.date)}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  {best.rain}% rain, up to {u(best.max)} — plan hikes and day trips here.
                </T>
              </View>
            </Card>
          ) : null}

          <Card style={{ marginTop: 14, gap: 8 }}>
            <T variant="title">What to pack</T>
            {tips.map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <T variant="small">{t}</T>
              </View>
            ))}
            {trip ? (
              <Button
                label="Add these to the packing list"
                variant="soft"
                size="md"
                icon="briefcase-outline"
                onPress={() => {
                  addPacking(trip.id, tips.map((text) => ({ text, category: 'Weather' })));
                  toast('Added to the shared packing list');
                }}
              />
            ) : null}
          </Card>
        </>
      ) : (
        <Card>
          <T variant="small" color={colors.textSecondary}>
            Fetching the forecast…
          </T>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E6B8F', borderRadius: radius.xl, padding: 20 },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.bgAlt },
  barFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: '#F2B33D' },
});
