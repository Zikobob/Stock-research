import { router } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountTicket } from '@/components/more/AccountTicket';
import { Tag, WideTag } from '@/components/more/Tag';
import { SectionHeader, type IconName } from '@/components/ui/bits';
import { Header, Screen } from '@/components/ui/Screen';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { useActiveTrip, useCurrentUser, useMyTrips } from '@/store/useAppStore';
import { space } from '@/theme';

/** One tag. `title` is the full name a screen reader says; `label` is the shorter print on the tag. */
type Item = { icon: IconName; title: string; label?: string; /** Spoken by screen readers, not shown. */ hint: string; href: string };

const groups: { title: string; items: Item[]; /** A wide tag under the squares. */ wide?: Item & { sub: string } }[] = [
  {
    title: 'Your trip',
    items: [
      { icon: 'people-outline', title: 'Crew & roles', hint: 'Invite code, roles, votes and checklist', href: '/crew' },
      { icon: 'airplane-outline', title: 'Flights & arrivals', label: 'Flights', hint: 'Everyone’s arrival and departure times', href: '/flights' },
      { icon: 'briefcase-outline', title: 'Packing list', hint: 'Smart suggestions', href: '/packing' },
      { icon: 'folder-open-outline', title: 'Offline Docs', hint: 'Passports and bookings, no wifi needed', href: '/documents' },
      { icon: 'camera-outline', title: 'Photo Dump', hint: 'Everyone’s shots in one place', href: '/photos' },
      { icon: 'trophy-outline', title: 'Trip recap', hint: 'Stats, highlights and share card', href: '/recap' },
    ],
  },
  {
    title: 'Around town',
    items: [
      { icon: 'map-outline', title: 'Trip Map', hint: 'Pins and the nearest airport', href: '/map' },
      { icon: 'compass-outline', title: 'Explore Nearby', hint: 'Food and sights by radius', href: '/nearby' },
      { icon: 'globe-outline', title: '360° City Views', hint: 'Day and night skylines with the lights on', href: '/panorama' },
      { icon: 'partly-sunny-outline', title: 'Weather', hint: '7-day forecast', href: '/weather' },
      { icon: 'cash-outline', title: 'Currency', hint: 'Live converter', href: '/currency' },
      { icon: 'language-outline', title: 'Phrasebook', hint: 'Speak the basics', href: '/phrasebook' },
    ],
    wide: { icon: 'medkit-outline', title: 'Emergency', sub: 'Local numbers and safety', hint: 'Local numbers and safety', href: '/emergency' },
  },
  {
    title: 'Just for fun',
    items: [
      { icon: 'star-outline', title: 'Bucket List', hint: 'Must-dos for the trip', href: '/bucket-list' },
      { icon: 'game-controller-outline', title: 'Trip Quiz', hint: 'Test the crew', href: '/quiz' },
      { icon: 'telescope-outline', title: 'Find a trip', hint: 'Answer five questions, get a dream destination', href: '/survey' },
    ],
  },
  {
    title: 'The app',
    items: [
      { icon: 'settings-outline', title: 'Settings', hint: 'Profile, language, reminders and theme', href: '/settings' },
      { icon: 'help-circle-outline', title: 'Help & FAQ', hint: 'A tour of the app and answers to common questions', href: '/help' },
      { icon: 'information-circle-outline', title: 'About', hint: 'Credits and sources', href: '/about' },
    ],
  },
];

const go = (href: string) => router.push(href as never);

/** Three to a row; a short last row is padded with empty cells so every tag keeps the same width. */
function rows<T>(items: T[]): (T | null)[][] {
  const out: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    const row: (T | null)[] = items.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    out.push(row);
  }
  return out;
}

/**
 * The More tab: your boarding pass, then four sheets of luggage tags (Your trip, Around town, Just for fun, The app), three to a row,
 * each a big square you can hit. No group has more than six tags.
 */
export default function More() {
  const t = useT();
  const trip = useActiveTrip();
  const user = useCurrentUser();
  const myTrips = useMyTrips();
  const dest = trip ? destinationById(trip.destinationId) : undefined;

  return (
    <Screen bottomInset={30} header={<Header back={false} kicker={trip?.name} title={t('nav.profile')} />}>
      <AccountTicket user={user} destCity={dest?.city} homeCity={user?.homeCity} tripCount={myTrips.length} />

      {groups.map((g) => (
        <View key={g.title} style={{ marginTop: space.section }}>
          <SectionHeader title={g.title} />
          <View style={styles.grid}>
            {rows(g.items).map((row, i) => (
              <View key={i} style={styles.row}>
                {row.map((r, j) => (
                  <Fragment key={j}>{r ? <Tag icon={r.icon} label={r.label ?? r.title} name={r.title} hint={r.hint} onPress={() => go(r.href)} /> : <View style={{ flex: 1 }} />}</Fragment>
                ))}
              </View>
            ))}
            {g.wide ? <WideTag icon={g.wide.icon} label={g.wide.title} sub={g.wide.sub} hint={g.wide.hint} onPress={() => go(g.wide!.href)} /> : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
});
