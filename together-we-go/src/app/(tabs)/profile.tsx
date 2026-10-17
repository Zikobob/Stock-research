import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, type IconName } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { printPlanner } from '@/services/print';
import { useActiveTrip, useCurrentUser } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

type MenuRow = { icon: IconName; title: string; sub?: string; href?: string; onPress?: () => void };

export default function More() {
  const t = useT();
  const trip = useActiveTrip();
  const user = useCurrentUser();

  const printTrip = async () => {
    if (!trip) return toast('Create or join a trip to print its planner', { tone: 'info' });
    try {
      await printPlanner(trip);
    } catch {
      toast('Allow pop-ups to print the planner', { tone: 'warn' });
    }
  };

  const groups: { title: string; rows: MenuRow[] }[] = [
    {
      title: 'Trip',
      rows: [
        { icon: 'people-outline', title: 'Crew & roles', sub: 'Invite code, roles, votes & checklist', href: '/crew' },
        { icon: 'airplane-outline', title: 'Flights & arrivals', sub: 'Everyone’s arrival & departure times', href: '/flights' },
        { icon: 'swap-horizontal-outline', title: 'My trips', sub: 'Switch, create or join a trip', href: '/trips' },
        { icon: 'trophy-outline', title: 'Trip recap', sub: 'Stats, highlights & share card', href: '/recap' },
      ],
    },
    {
      title: 'Get around',
      rows: [
        { icon: 'map-outline', title: 'Trip Map', sub: 'Pins + nearest airport', href: '/map' },
        { icon: 'globe-outline', title: '360° City Views', sub: 'Day & night skylines with the lights on', href: '/panorama' },
        { icon: 'compass-outline', title: 'Explore Nearby', sub: 'Food & sights by radius', href: '/nearby' },
        { icon: 'partly-sunny-outline', title: 'Weather', sub: '7-day forecast', href: '/weather' },
        { icon: 'cash-outline', title: 'Currency', sub: 'Live converter', href: '/currency' },
        { icon: 'locate-outline', title: 'Nearest airport', sub: 'Based on your location', href: '/airport' },
      ],
    },
    {
      title: 'Keep it safe',
      rows: [
        { icon: 'folder-open-outline', title: 'Offline Docs', sub: 'Passports, bookings — no wifi needed', href: '/documents' },
        { icon: 'camera-outline', title: 'Photo Dump', sub: 'Everyone’s shots in one place', href: '/photos' },
        { icon: 'print-outline', title: 'Printable Planner', sub: 'Paper itinerary', onPress: printTrip },
        { icon: 'medkit-outline', title: 'Emergency', sub: 'Local numbers & safety', href: '/emergency' },
        { icon: 'briefcase-outline', title: 'Packing list', sub: 'Smart suggestions', href: '/packing' },
      ],
    },
    {
      title: 'Fun',
      rows: [
        { icon: 'star-outline', title: 'Bucket List', sub: 'Must-dos for the trip', href: '/bucket-list' },
        { icon: 'game-controller-outline', title: 'Trip Quiz', sub: 'Test the crew', href: '/quiz' },
        { icon: 'sparkles-outline', title: 'Discover', sub: 'Survey → your dream destination', href: '/survey' },
        { icon: 'language-outline', title: 'Phrasebook', sub: 'Speak the basics', href: '/phrasebook' },
        { icon: 'color-palette-outline', title: 'Make it yours', sub: 'Themes, interests & home screen', href: '/personalize' },
        { icon: 'settings-outline', title: 'Language & Settings', sub: '6 languages', href: '/settings' },
      ],
    },
    {
      title: 'Help',
      rows: [
        { icon: 'bulb-outline', title: 'How it works', sub: 'A tour of the app', href: '/how-it-works' },
        { icon: 'help-circle-outline', title: 'Help & FAQ', href: '/help' },
        { icon: 'information-circle-outline', title: 'About', href: '/about' },
      ],
    },
  ];

  return (
    <Screen bottomInset={30}>
      <View style={styles.head}>
        {trip ? (
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
            {trip.name}
          </T>
        ) : null}
        <T variant="display" accessibilityRole="header">
          {t('nav.profile')}
        </T>
      </View>

      <Card padded={false} style={styles.card}>
        <Press onPress={() => router.push('/settings')} style={styles.profile} scaleTo={0.99} accessibilityLabel="Open your profile and settings">
          <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={52} />
          <View style={{ flex: 1 }}>
            <T variant="title" weight="bold" numberOfLines={1}>
              {user?.name ?? 'You'}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {[user?.email, user?.homeCity].filter(Boolean).join(' · ')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Press>
      </Card>

      {groups.map((g) => (
        <View key={g.title}>
          <T variant="kicker" color={colors.textSecondary} style={styles.kicker}>
            {g.title}
          </T>
          <Card padded={false} style={styles.card}>
            {g.rows.map((r, i) => (
              <Press
                key={r.title}
                onPress={() => (r.onPress ? r.onPress() : router.push(r.href as never))}
                style={[styles.row, i > 0 && styles.line]}
                scaleTo={0.99}
                accessibilityLabel={r.sub ? `${r.title}. ${r.sub}` : r.title}>
                <View style={styles.icon}>
                  <Ionicons name={r.icon} size={19} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="title" weight="bold">
                    {r.title}
                  </T>
                  {r.sub ? (
                    <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                      {r.sub}
                    </T>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Press>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 12, marginBottom: 14 },
  card: { borderRadius: radius.xl },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  kicker: { marginTop: 24, marginBottom: 8, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 13 },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
