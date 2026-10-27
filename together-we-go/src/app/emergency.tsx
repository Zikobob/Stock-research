import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { Button } from '@/components/ui/Button';
import { ListRow, SectionHeader, type IconName } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { PlatePress } from '@/components/ui/Plate';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { emergencyByCountry } from '@/data/reference';
import { getLocation } from '@/services/location';
import { useActiveTrip } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';

/** Safety screen: everything here works offline except the map searches. */
export default function Emergency() {
  const trip = useActiveTrip();
  const dest = destinationById(trip?.destinationId ?? 'tokyo')!;
  const info = emergencyByCountry[dest.countryCode] ?? emergencyByCountry.DEFAULT;
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => toast(`Dial ${n} from your phone`, { tone: 'warn' }));

  const shareLocation = async () => {
    const loc = await getLocation(dest);
    if (loc.source !== 'device') toast('GPS unavailable. Sharing the trip centre instead', { tone: 'warn' });
    setShareMsg(`I need help. My location: https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)} (sent from TogetherWeGo, ${trip?.name ?? 'trip'})`);
  };

  const calls: [string, string, IconName][] = [
    ['Police', info.police, 'shield-outline'],
    ['Ambulance', info.ambulance, 'medkit-outline'],
    ['Fire', info.fire, 'flame-outline'],
  ];
  const help: { icon: IconName; label: string; sub: string; onPress: () => void; tint?: string }[] = [
    { icon: 'medical-outline', label: 'Find the nearest hospital', sub: 'Opens maps around you', tint: colors.red, onPress: () => Linking.openURL('https://www.google.com/maps/search/hospital+near+me') },
    { icon: 'flag-outline', label: 'Find my embassy', sub: `Embassies and consulates in ${dest.city}`, onPress: () => Linking.openURL(`https://www.google.com/maps/search/embassy+${encodeURIComponent(dest.city)}`) },
    { icon: 'document-lock-outline', label: 'Passport copies & insurance', sub: 'Your offline document vault', onPress: () => router.push('/documents') },
    { icon: 'language-outline', label: 'Emergency phrases', sub: `“Help!” and more in ${dest.language}`, onPress: () => router.push('/phrasebook') },
    { icon: 'airplane-outline', label: 'Nearest airport', sub: 'Closest airports and directions', onPress: () => router.push('/airport') },
  ];

  return (
    <Screen header={<Header kicker={`${dest.country} · works offline`} title="Emergency" subtitle="Tap a number to call it" backLabel="More" />}>
      <View style={styles.zone}>
        <View style={styles.zoneHead}>
          <Ionicons name="warning-outline" size={18} color={colors.red} />
          <T variant="kicker" color={colors.red}>
            Call in an emergency
          </T>
        </View>
        {calls.map(([label, num, icon]) => (
          <PlatePress key={label} onPress={() => call(num)} accessibilityLabel={`Call ${label}, ${num}`} color={colors.red} offset={4} corner={radius.card} style={styles.call}>
            <View style={styles.callIcon}>
              <Ionicons name={icon} size={26} color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="h3">{label}</T>
              <T variant="caption" color={colors.textSecondary}>
                Tap to call
              </T>
            </View>
            <T variant="numeral" style={styles.num}>
              {num}
            </T>
          </PlatePress>
        ))}
      </View>

      <Button label="Share my live location" icon="location" accessibilityHint="Sends your position to the group" style={{ marginTop: space.xl }} onPress={shareLocation} />

      <View style={{ marginTop: space.section }}>
        <SectionHeader title={`In ${dest.country}`} />
        {info.tips.map((tip, i) => (
          <View key={tip} style={[styles.tip, i === 0 && { borderTopWidth: 0 }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.ink} style={{ marginTop: 1 }} />
            <T variant="bodySm" style={{ flex: 1 }}>
              {tip}
            </T>
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="Find help" />
        {help.map((h, i) => (
          <View key={h.label} style={[styles.helpRow, i === 0 && { borderTopWidth: 0 }]}>
            <ListRow icon={h.icon} label={h.label} sub={h.sub} tint={h.tint} onPress={h.onPress} />
          </View>
        ))}
      </View>

      <ShareSheet visible={!!shareMsg} onClose={() => setShareMsg(null)} title="Send your location" message={shareMsg ?? ''} preview={shareMsg ?? ''} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // the red state area: everything you need in the first second
  zone: { gap: space.lg, padding: space.lg, paddingRight: space.lg + 4, borderRadius: radius.card, borderWidth: line, borderColor: colors.red, backgroundColor: colors.redSoft },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  call: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 76, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  callIcon: { width: 48, height: 48, borderRadius: radius.button, borderWidth: line, borderColor: colors.red, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 38, lineHeight: 42 },
  tip: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, borderTopWidth: hair, borderTopColor: colors.border },
  helpRow: { borderTopWidth: hair, borderTopColor: colors.border },
});
