import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GuidedTour } from '@/components/GuidedTour';
import { BudgetTile } from '@/components/home/BudgetTile';
import { DiscoverSection } from '@/components/home/DiscoverSection';
import { GlanceTiles } from '@/components/home/GlanceTiles';
import { HomeHero } from '@/components/home/HomeHero';
import { NearbySection } from '@/components/home/NearbySection';
import { PicksSection } from '@/components/home/PicksSection';
import { QuickTiles } from '@/components/home/QuickTiles';
import { UpNextSection } from '@/components/home/UpNextSection';
import { TripMenuSheet } from '@/components/trip/TripMenuSheet';
import { Card } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useNow, useWeather } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { nextUpcoming } from '@/services/notifications';
import { totalSpent, tripStatus, useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import { MAX_WIDTH, colors } from '@/theme';
import { daysBetween, deviceTimeZone, greetingFor, todayInTz } from '@/utils/time';

/** Home: a hero picture, then the things worth seeing at a glance. Each block is its own component in components/home. */
export default function Home() {
  const t = useT();
  const { width } = useWindowDimensions();
  const user = useCurrentUser();
  const trip = useActiveTrip();
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const personal = useAppStore((s) => s.personal);
  const setToured = useAppStore((s) => s.setToured);
  const now = useNow(30000);
  const [menu, setMenu] = useState(false);

  const dest = destinationById(trip?.destinationId ?? 'positano');
  const tz = dest?.tz ?? 'UTC';
  const weather = useWeather(dest?.id);
  const status = trip ? tripStatus(trip) : null;
  const show = personal.sections;
  const colW = Math.min(width, MAX_WIDTH) - 40;
  const today = todayInTz(tz);
  const tripLen = trip ? daysBetween(trip.startDate, trip.endDate) + 1 : 0;
  const daysToGo = trip ? Math.max(0, daysBetween(today, trip.startDate)) : 0;
  const dayNo = trip ? Math.min(tripLen, Math.max(1, daysBetween(trip.startDate, today) + 1)) : 0;
  const votingCount = trip ? trip.activities.filter((a) => a.status === 'voting').length : 0;
  const firstName = personal.nickname || (user?.name.split(' ')[0] ?? 'traveller');
  const todays = trip && status === 'active' ? trip.activities.filter((a) => a.date === today && a.status !== 'voting').sort((a, b) => a.time.localeCompare(b.time)) : [];

  const copyCode = async () => {
    if (!trip) return;
    await Clipboard.setStringAsync(trip.inviteCode).catch(() => {});
    tap('success');
    toast(`Invite code ${trip.inviteCode} copied`, { icon: 'copy-outline' });
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.column}>
          <HomeHero trip={trip} dest={dest} tz={tz} status={status} daysToGo={daysToGo} unread={unread} onMenu={() => setMenu(true)} onCopyCode={copyCode} />

          <View style={styles.sheet}>
            <T variant="small" color={colors.textSecondary} style={{ marginBottom: 14 }}>
              {t(greetingFor(new Date(now).getHours()))}, {firstName} {personal.emoji}
            </T>

            {!trip ? (
              <Card style={{ gap: 12, marginBottom: 14 }}>
                <T variant="headline">Plan your first group trip</T>
                <T variant="small" color={colors.textSecondary}>
                  Create a trip, invite friends with a code and start planning together.
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Create trip" size="md" icon="add" onPress={() => router.push('/new-trip')} style={{ flex: 1 }} />
                  <Button label="Join" size="md" variant="secondary" icon="people-outline" onPress={() => router.push('/join')} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : null}

            {show.glance ? <GlanceTiles dest={dest} weather={weather} now={now} tz={tz} homeTz={deviceTimeZone()} /> : null}
            {trip && show.budget ? <BudgetTile trip={trip} spent={totalSpent(trip)} /> : null}
            {trip && show.upnext ? <UpNextSection trip={trip} status={status} todays={todays} dayNo={dayNo} tripLen={tripLen} next={nextUpcoming(trip)} now={now} /> : null}
            {trip && show.quick ? <QuickTiles votingCount={votingCount} /> : null}
            {show.forYou ? <PicksSection personal={personal} /> : null}
            {trip && dest && show.nearby ? <NearbySection trip={trip} dest={dest} /> : null}
            {show.discover ? <DiscoverSection dest={dest} colW={colW} /> : null}

            <Press onPress={() => router.push('/personalize')} style={styles.customize} accessibilityLabel="Customize this page">
              <Ionicons name="color-palette-outline" size={16} color={colors.text} />
              <T variant="small" weight="bold">
                Customize this page
              </T>
            </Press>
          </View>
        </View>
      </ScrollView>

      {trip ? <TripMenuSheet visible={menu} onClose={() => setMenu(false)} trip={trip} /> : null}
      <GuidedTour visible={!personal.toured && !!trip} onClose={() => setToured(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  // width 100% so the page is exactly as wide as the phone (the root centres its children, which would otherwise let a wide card row stretch the page sideways)
  scroll: { width: '100%' },
  column: { width: '100%', maxWidth: MAX_WIDTH },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 22 },
  customize: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 26, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
