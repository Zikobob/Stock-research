import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CurrencyConverter } from '@/components/CurrencyConverter';
import { Card, Pill } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useRatesLoader } from '@/hooks/useTrip';
import { convert, fetchRates, useRates } from '@/services/currency';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money, timeAgo } from '@/utils/format';

const QUICK = [1, 5, 10, 20, 50, 100, 500, 1000];

export default function Currency() {
  useRatesLoader();
  const trip = useActiveTrip();
  const home = useAppStore((s) => s.settings.homeCurrency);
  const rates = useRates();
  const local = destinationById(trip?.destinationId ?? 'tokyo')?.currency ?? 'JPY';
  const [pair, setPair] = useState<[string, string]>([home, local === home ? 'EUR' : local]);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Screen
      header={<Header title="Currency converter" subtitle={rates.live ? `Live rates · updated ${timeAgo(rates.fetchedAt)}` : 'Offline reference rates'} />}
      onRefresh={async () => {
        setRefreshing(true);
        const r = await fetchRates(true);
        setRefreshing(false);
        toast(r.live ? 'Rates updated' : 'Offline — using saved rates', { tone: r.live ? 'ok' : 'warn' });
      }}
      refreshing={refreshing}>
      <Card>
        <CurrencyConverter from={pair[0]} to={pair[1]} onChange={(a, b) => setPair([a, b])} />
      </Card>

      <View style={styles.head}>
        <T variant="h3">Quick reference</T>
        <Pill label={`${pair[0]} → ${pair[1]}`} />
      </View>
      <Card padded={false}>
        {QUICK.map((n, i) => (
          <View key={n} style={[styles.row, i % 2 === 1 && { backgroundColor: colors.cardMuted }]}>
            <T variant="small" weight="semibold">
              {money(n, pair[0])}
            </T>
            <T variant="small">{money(convert(n, pair[0], pair[1], rates), pair[1], { decimals: true })}</T>
          </View>
        ))}
      </Card>
      <T variant="caption" color={colors.textMuted} style={{ marginTop: 12 }}>
        Rates from open.er-api.com, cached on your phone so the converter keeps working offline. Your home currency ({home}) can be changed in Settings.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11 },
});
