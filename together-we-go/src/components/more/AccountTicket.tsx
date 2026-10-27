import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import type { Account } from '@/store/types';
import { colors } from '@/theme';

/**
 * The account line at the top of More, drawn as a boarding pass: PASSENGER, the name, FROM home TO the trip's city, and a stub
 * under the tear line that opens My trips (switch, create or join). Pressing the main part opens the profile and settings.
 */
export function AccountTicket({ user, destCity, homeCity, tripCount }: { user: Account | undefined; destCity?: string; homeCity?: string; tripCount: number }) {
  const route = [homeCity, destCity].filter(Boolean).join('  →  ');
  return (
    <Ticket
      stub={
        <Press onPress={() => router.push('/trips')} style={styles.stub} scaleTo={0.99} accessibilityLabel="My trips" accessibilityHint="Switch, create or join a trip">
          <Ionicons name="swap-horizontal" size={20} color={colors.ink} />
          <T variant="title" weight="bold" style={{ flex: 1 }}>
            My trips
          </T>
          <T variant="numeralSm">{tripCount}</T>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </Press>
      }>
      <Press onPress={() => router.push('/settings')} style={styles.main} scaleTo={0.99} accessibilityLabel="Open your profile and settings">
        <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="kicker" color={colors.textSecondary}>
            Passenger
          </T>
          <T variant="headline" numberOfLines={1}>
            {user?.name ?? 'You'}
          </T>
          {route ? (
            <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
              {route}
            </T>
          ) : null}
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.ink} />
      </Press>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  stub: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16 },
});
