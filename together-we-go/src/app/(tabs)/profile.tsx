import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { useActiveTrip, useCurrentUser } from '@/store/useAppStore';
import { colors, radius, shadow } from '@/theme';

type Tile = { icon: IconName; title: string; /** Spoken by screen readers, not shown. */ hint: string; href: string };

const groups: { title: string; tiles: Tile[] }[] = [
  {
    title: 'Your trip',
    tiles: [
      { icon: 'people-outline', title: 'Crew & roles', hint: 'Invite code, roles, votes and checklist', href: '/crew' },
      { icon: 'airplane-outline', title: 'Flights & arrivals', hint: 'Everyone’s arrival and departure times', href: '/flights' },
      { icon: 'briefcase-outline', title: 'Packing list', hint: 'Smart suggestions', href: '/packing' },
      { icon: 'folder-open-outline', title: 'Offline Docs', hint: 'Passports and bookings, no wifi needed', href: '/documents' },
      { icon: 'camera-outline', title: 'Photo Dump', hint: 'Everyone’s shots in one place', href: '/photos' },
      { icon: 'trophy-outline', title: 'Trip recap', hint: 'Stats, highlights and share card', href: '/recap' },
      { icon: 'swap-horizontal-outline', title: 'My trips', hint: 'Switch, create or join a trip', href: '/trips' },
    ],
  },
  {
    title: 'Around town',
    tiles: [
      { icon: 'map-outline', title: 'Trip Map', hint: 'Pins and the nearest airport', href: '/map' },
      { icon: 'globe-outline', title: '360° City Views', hint: 'Day and night skylines with the lights on', href: '/panorama' },
      { icon: 'compass-outline', title: 'Explore Nearby', hint: 'Food and sights by radius', href: '/nearby' },
      { icon: 'partly-sunny-outline', title: 'Weather', hint: '7-day forecast', href: '/weather' },
      { icon: 'cash-outline', title: 'Currency', hint: 'Live converter', href: '/currency' },
      { icon: 'language-outline', title: 'Phrasebook', hint: 'Speak the basics', href: '/phrasebook' },
      { icon: 'medkit-outline', title: 'Emergency', hint: 'Local numbers and safety', href: '/emergency' },
    ],
  },
  {
    title: 'Just for fun',
    tiles: [
      { icon: 'star-outline', title: 'Bucket List', hint: 'Must-dos for the trip', href: '/bucket-list' },
      { icon: 'game-controller-outline', title: 'Trip Quiz', hint: 'Test the crew', href: '/quiz' },
      { icon: 'sparkles-outline', title: 'Find a trip', hint: 'Answer five questions, get a dream destination', href: '/survey' },
    ],
  },
  {
    title: 'The app',
    tiles: [
      { icon: 'settings-outline', title: 'Settings', hint: 'Profile, language, reminders and theme', href: '/settings' },
      { icon: 'bulb-outline', title: 'How it works', hint: 'A tour of the app', href: '/how-it-works' },
      { icon: 'help-circle-outline', title: 'Help & FAQ', hint: 'Answers to common questions', href: '/help' },
      { icon: 'information-circle-outline', title: 'About', hint: 'Credits and sources', href: '/about' },
    ],
  },
];

export default function More() {
  const t = useT();
  const trip = useActiveTrip();
  const user = useCurrentUser();

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
          <View style={styles.grid}>
            {g.tiles.map((r) => (
              <Press key={r.title} onPress={() => router.push(r.href as never)} style={styles.tile} scaleTo={0.97} accessibilityLabel={r.title} accessibilityHint={r.hint}>
                <View style={styles.icon}>
                  <Ionicons name={r.icon} size={22} color={colors.text} />
                </View>
                <T variant="small" weight="semibold" center numberOfLines={2}>
                  {r.title}
                </T>
              </Press>
            ))}
          </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // three to a row: 3 x 31% plus two 10 px gaps always fits the column
  tile: { width: '31%', minHeight: 100, backgroundColor: colors.card, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 12, ...shadow },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
