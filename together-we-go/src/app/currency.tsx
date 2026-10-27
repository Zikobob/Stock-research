import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CurrencyConverter } from '@/components/CurrencyConverter';
import { Card, SectionHeader } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useRatesLoader } from '@/hooks/useTrip';
import { convert, fetchRates, useRates } from '@/services/currency';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors, hair, space } from '@/theme';
import { money, timeAgo } from '@/utils/format';

const QUICK = [1, 5, 10, 20, 50, 100, 500, 1000];

/** The converter on its own page: the converter standing on the paper, then a short table of everyday amounts for the same pair. */
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
      header={<Header title="Currency" kicker={rates.live ? `Live rates · updated ${timeAgo(rates.fetchedAt)}` : 'Offline reference rates'} />}
      onRefresh={async () => {
        setRefreshing(true);
        const r = await fetchRates(true);
        setRefreshing(false);
        toast(r.live ? 'Rates updated' : 'Offline — using saved rates', { tone: r.live ? 'ok' : 'warn', icon: r.live ? 'checkmark-circle' : 'cloud-offline-outline' });
      }}
      refreshing={refreshing}>
      <Card plated>
        <CurrencyConverter from={pair[0]} to={pair[1]} onChange={(a, b) => setPair([a, b])} />
      </Card>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="Quick reference" />
        <T variant="kicker" color={colors.textSecondary} style={{ marginBottom: 4 }}>
          {pair[0]} to {pair[1]}
        </T>
        {QUICK.map((n, i) => (
          <View key={n} style={[styles.row, i > 0 && styles.divider]}>
            <T variant="numeralSm">{money(n, pair[0])}</T>
            <T variant="numeralSm" color={colors.textSecondary}>
              {money(convert(n, pair[0], pair[1], rates), pair[1], { decimals: true })}
            </T>
          </View>
        ))}
      </View>
      <T variant="caption" color={colors.textMuted} style={{ marginTop: 20 }}>
        Rates from open.er-api.com, cached on your phone so the converter keeps working offline. Your home currency ({home}) can be changed in Settings.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingVertical: 8 },
  divider: { borderTopWidth: hair, borderTopColor: colors.border },
});
