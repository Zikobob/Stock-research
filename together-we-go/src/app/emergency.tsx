import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { Button } from '@/components/ui/Button';
import { Card, ListRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { emergencyByCountry } from '@/data/reference';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

/** Safety screen — everything here works offline except the map searches. */
export default function Emergency() {
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const info = emergencyByCountry[dest.countryCode] ?? emergencyByCountry.DEFAULT;
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => toast(`Dial ${n} from your phone`, { tone: 'warn' }));

  const shareLocation = async () => {
    const loc = await getLocation(dest);
    if (loc.source !== 'device') toast('GPS unavailable — sharing the trip centre instead', { tone: 'warn' });
    setShareMsg(`🚨 I need help. My location: https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)} — sent from TogetherWeGo (${trip?.name ?? 'trip'})`);
  };

  return (
    <Screen header={<Header title="Emergency & safety" subtitle={`${dest.country} · works offline`} />}>
      <View style={styles.grid}>
        {[
          ['Police', info.police, 'shield-outline', '#2B5FB0'],
          ['Ambulance', info.ambulance, 'medkit-outline', colors.red],
          ['Fire', info.fire, 'flame-outline', colors.orange],
        ].map(([label, num, icon, color]) => (
          <Press key={label} onPress={() => call(num)} style={[styles.callBox, { borderColor: `${color}55` }]} accessibilityLabel={`Call ${label}, ${num}`}>
            <Ionicons name={icon as 'shield-outline'} size={24} color={color} />
            <T variant="h1" color={color}>
              {num}
            </T>
            <T variant="caption" weight="semibold" color={colors.textSecondary}>
              {label}
            </T>
          </Press>
        ))}
      </View>

      <Button label="Share my live location with the group" icon="location" variant="danger" onPress={shareLocation} style={{ marginTop: 14 }} />

      <Card style={{ marginTop: 14, gap: 8 }}>
        <T variant="title">Good to know in {dest.country}</T>
        {info.tips.map((tip) => (
          <View key={tip} style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <T variant="small" style={{ flex: 1 }}>
              {tip}
            </T>
          </View>
        ))}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <ListRow icon="medical-outline" label="Find the nearest hospital" sub="Opens maps around you" tint={colors.red} onPress={() => Linking.openURL('https://www.google.com/maps/search/hospital+near+me')} />
        <ListRow icon="flag-outline" label="Find my embassy" sub={`Embassies and consulates in ${dest.city}`} onPress={() => Linking.openURL(`https://www.google.com/maps/search/embassy+${encodeURIComponent(dest.city)}`)} />
        <ListRow icon="document-lock-outline" label="Passport copies & insurance" sub="Your offline document vault" onPress={() => router.push('/documents')} />
        <ListRow icon="language-outline" label="Emergency phrases" sub={`“Help!” and more in ${dest.language}`} onPress={() => router.push('/phrasebook')} />
        <ListRow icon="airplane-outline" label="Nearest airport" onPress={() => router.push('/airport')} />
      </Card>

      <ShareSheet visible={!!shareMsg} onClose={() => setShareMsg(null)} title="Send your location" message={shareMsg ?? ''} preview={shareMsg ?? ''} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  callBox: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1.5 },
});
