import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GuidedTour } from '@/components/GuidedTour';
import { BudgetSection } from '@/components/home/BudgetSection';
import { CrewSection } from '@/components/home/CrewSection';
import { DiscoverSection } from '@/components/home/DiscoverSection';
import { HomeHero } from '@/components/home/HomeHero';
import { blockHasContent, celebrateKey, shouldCelebrateOneDay } from '@/components/home/logic';
import { NearbySection } from '@/components/home/NearbySection';
import { PicksSection } from '@/components/home/PicksSection';
import { pickedForYou } from '@/components/home/picks';
import { PlaySection } from '@/components/home/PlaySection';
import { UpNextSection } from '@/components/home/UpNextSection';
import { hasTrip, useHomeContext } from '@/components/home/useHomeContext';
import { WeatherSection } from '@/components/home/WeatherSection';
import { TripMenuSheet } from '@/components/trip/TripMenuSheet';
import { Button } from '@/components/ui/Button';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { FadeIn, useScrollY } from '@/components/ui/motion';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { visibleSections } from '@/data/layouts';
import { useT } from '@/i18n';
import type { HomeSection } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, space } from '@/theme';
import { greetingFor } from '@/utils/time';

/**
 * Home: the trip's photo and boarding pass, a one-line greeting, then the blocks the person chose, in the order they chose
 * (see data/layouts). Each block is its own component in components/home; a block with nothing to show is left out.
 */
export default function Home() {
  const t = useT();
  const ctx = useHomeContext();
  const { trip, dest, status, now, today, tripLen, daysToGo, dayNo, personal, userName } = ctx;
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const fired = useAppStore((s) => s.firedReminders);
  const markReminderFired = useAppStore((s) => s.markReminderFired);
  const setToured = useAppStore((s) => s.setToured);
  const { width } = useWindowDimensions();
  const { y, onScroll } = useScrollY();
  const [menu, setMenu] = useState(false);

  const colW = Math.min(width, MAX_WIDTH) - 2 * space.gutter;
  const firstName = personal.nickname || userName.split(' ')[0] || 'traveller';
  const picks = personal.done ? pickedForYou(personal) : [];
  const blocks = visibleSections(personal).filter((k) => blockHasContent(k, { hasTrip: !!trip, status, hasPicks: picks.length > 0, hasDestination: !!dest }));

  // One day before the trip: a small celebration, once (it is remembered, so it does not repeat on every visit that day).
  const oneDay = !!trip && shouldCelebrateOneDay(status, daysToGo, fired, trip.id, today);
  const tripId = trip?.id;
  useEffect(() => {
    if (!oneDay || !tripId) return;
    const id = setTimeout(() => {
      markReminderFired(celebrateKey(tripId, today));
      celebrate('One day to go');
    }, 1200);
    return () => clearTimeout(id);
  }, [oneDay, tripId, today, markReminderFired]);

  const copyCode = async () => {
    if (!trip) return;
    await Clipboard.setStringAsync(trip.inviteCode).catch(() => {});
    tap('success');
    toast(`Invite code ${trip.inviteCode} copied`, { icon: 'copy-outline' });
  };

  const render = (k: HomeSection): ReactNode => {
    const withTrip = hasTrip(ctx) ? ctx : null;
    switch (k) {
      case 'upnext':
        return withTrip ? <UpNextSection ctx={withTrip} /> : null;
      case 'weather':
        return withTrip ? <WeatherSection ctx={withTrip} /> : null;
      case 'budget':
        return withTrip ? <BudgetSection ctx={withTrip} /> : null;
      case 'crew':
        return withTrip ? <CrewSection ctx={withTrip} onInvite={copyCode} /> : null;
      case 'play':
        return <PlaySection ctx={ctx} />;
      case 'forYou':
        return <PicksSection picks={picks} />;
      case 'nearby':
        return trip && dest ? <NearbySection trip={trip} dest={dest} /> : null;
      case 'discover':
        return <DiscoverSection dest={dest} colW={colW} />;
    }
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} onScroll={onScroll} scrollEventThrottle={16}>
        <View style={styles.column}>
          <HomeHero trip={trip} dest={trip ? dest : undefined} tz={ctx.tz} status={status} daysToGo={daysToGo} dayNo={dayNo} tripLen={tripLen} unread={unread} scrollY={y} onMenu={() => setMenu(true)} onCopyCode={copyCode} />

          <View style={styles.page}>
            <FadeIn delay={120} distance={10}>
              <T variant="title">
                {t(greetingFor(new Date(now).getHours()))}, <T variant="title" weight="bold">{firstName}</T>
              </T>
            </FadeIn>

            {!trip ? (
              <FadeIn delay={180} distance={12} style={styles.block}>
                <View style={{ gap: 6 }}>
                  <T variant="h2">Plan your first group trip</T>
                  <T variant="small" color={colors.textSecondary}>
                    Create a trip, invite friends with a code and start planning together.
                  </T>
                </View>
                <View style={styles.pair}>
                  <Button label="Create trip" icon="add" size="md" onPress={() => router.push('/new-trip')} style={{ flex: 1 }} />
                  <Button label="Join a trip" icon="people-outline" size="md" variant="secondary" onPress={() => router.push('/join')} style={{ flex: 1 }} />
                </View>
              </FadeIn>
            ) : null}

            {blocks.map((k, i) => (
              <FadeIn key={k} delay={220 + i * 70} distance={14} duration={380} style={styles.block}>
                {render(k)}
              </FadeIn>
            ))}

            <Press onPress={() => router.push('/settings')} style={styles.customize} accessibilityLabel="Customize this page">
              <Ionicons name="options-outline" size={18} color={colors.ink} />
              <T variant="small" weight="bold" style={{ textDecorationLine: 'underline' }}>
                Customize this page
              </T>
            </Press>
          </View>
        </View>
      </Animated.ScrollView>

      {trip ? <TripMenuSheet visible={menu} onClose={() => setMenu(false)} trip={trip} /> : null}
      <GuidedTour visible={!personal.toured && !!trip} onClose={() => setToured(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  // width 100% so the page is exactly as wide as the phone (the root centres its children, which would otherwise let a wide row stretch the page sideways)
  scroll: { width: '100%' },
  column: { width: '100%', maxWidth: MAX_WIDTH },
  page: { paddingHorizontal: space.gutter, paddingTop: 20 },
  block: { marginTop: space.section, gap: 16 },
  pair: { flexDirection: 'row', gap: 12 },
  customize: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: space.section },
});
