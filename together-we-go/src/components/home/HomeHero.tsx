import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkylineHero } from '@/components/SkylineHero';
import { AvatarStack, IconButton } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Destination } from '@/data/destinations';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

/** Big hero headline that follows the trip’s stage. */
export function headlineFor(status: 'planning' | 'active' | 'completed' | null, daysToGo: number) {
  if (status === 'active') return 'Living it.';
  if (status === 'completed') return 'That was epic.';
  if (status === 'planning') return daysToGo <= 1 ? 'Tomorrow.' : `${daysToGo} days to go.`;
  return 'Where to next?';
}

/** The picture at the top of Home: trip name, 360° button, notifications, a headline and the invite code. */
export function HomeHero({ trip, dest, tz, status, daysToGo, unread, onMenu, onCopyCode }: { trip: Trip | undefined; dest: Destination | undefined; tz: string; status: 'planning' | 'active' | 'completed' | null; daysToGo: number; unread: number; onMenu: () => void; onCopyCode: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <SkylineHero image={dest?.image ?? 'amalfi'} tz={tz} height={400 + insets.top}>
      <View style={[styles.heroTop, { top: insets.top + 10 }]}>
        <Press onPress={() => (trip ? onMenu() : router.push('/trips'))} style={styles.tripPill} accessibilityLabel={trip ? `${trip.name}. Trip options and switching` : 'Choose a trip'}>
          <T variant="small" weight="bold" color={colors.white} numberOfLines={1} style={{ maxWidth: 190 }}>
            {trip?.name ?? 'No trip yet'}
          </T>
          <Ionicons name="chevron-down" size={14} color={colors.white} />
        </Press>
        <View style={{ flex: 1 }} />
        <Press onPress={() => router.push({ pathname: '/panorama', params: { city: dest?.id } })} style={styles.pano} accessibilityLabel="Open the 360 degree city view">
          <Ionicons name="globe-outline" size={15} color={colors.white} />
          <T variant="micro" weight="extrabold" color={colors.white}>
            360°
          </T>
        </Press>
        <IconButton icon="notifications-outline" label={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} bg="rgba(255,255,255,0.92)" color="#111111" bordered={false} />
      </View>

      <View style={styles.heroBottom}>
        <View style={styles.place}>
          <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.9)" />
          <T variant="kicker" color="rgba(255,255,255,0.92)">
            {dest ? `${dest.city}, ${dest.country}` : 'Somewhere great'}
          </T>
        </View>
        <FadeIn delay={120} distance={26}>
          <T variant="display" color={colors.white} style={{ fontSize: 60, lineHeight: 64 }} accessibilityRole="header">
            {headlineFor(status, daysToGo)}
          </T>
        </FadeIn>
        <View style={styles.heroRow}>
          {trip ? <AvatarStack people={trip.members} max={4} size={32} /> : <View />}
          {trip ? (
            <Press onPress={onCopyCode} style={styles.code} accessibilityLabel={`Invite code ${trip.inviteCode}. Tap to copy`}>
              <T variant="small" weight="extrabold" color={colors.onAccent}>
                Code {trip.inviteCode}
              </T>
              <Ionicons name="copy-outline" size={14} color={colors.onAccent} />
            </Press>
          ) : null}
        </View>
      </View>
    </SkylineHero>
  );
}

const styles = StyleSheet.create({
  heroTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pano: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(20,20,24,0.55)' },
  tripPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(20,20,24,0.55)' },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 44 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.accent },
});
