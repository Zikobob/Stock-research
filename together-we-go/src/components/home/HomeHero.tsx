import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkylineHero } from '@/components/SkylineHero';
import { AvatarStack } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { SplitFlap } from '@/components/ui/SplitFlap';
import { Ticket } from '@/components/ui/Ticket';
import { T } from '@/components/ui/T';
import type { Destination } from '@/data/destinations';
import type { Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { rangeLabel } from '@/utils/time';

import { countdownView, type HeroStatus } from './logic';

/** Words for the stamp in the corner of the ticket. */
const STAMP: Record<NonNullable<HeroStatus>, { label: string; tone: 'accent' | 'positive' | 'muted' }> = {
  planning: { label: 'Boarding soon', tone: 'accent' },
  active: { label: 'Live now', tone: 'positive' },
  completed: { label: 'Arrived', tone: 'muted' },
};

function Control({ onPress, label, children, wide }: { onPress: () => void; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} style={[styles.control, wide && { paddingHorizontal: 12 }]}>
      {children}
    </PlatePress>
  );
}

/**
 * The top of Home: a photo of the place with square, outlined controls on it, and the trip as a boarding pass lying across
 * the photo's lower edge. The days to go flip like a departures board; below the tear line are the crew and the invite code.
 */
export function HomeHero({ trip, dest, tz, status, daysToGo, dayNo, tripLen, unread, onMenu, onCopyCode }: { trip: Trip | undefined; dest: Destination | undefined; tz: string; status: HeroStatus; daysToGo: number; dayNo: number; tripLen: number; unread: number; onMenu: () => void; onCopyCode: () => void }) {
  const insets = useSafeAreaInsets();
  const view = countdownView(status, daysToGo, dayNo, tripLen);
  const stamp = status ? STAMP[status] : null;
  return (
    <View>
      <SkylineHero image={dest?.image ?? 'amalfi'} tz={tz} height={300 + insets.top}>
        <View style={[styles.top, { top: insets.top + 10 }]}>
          <Control onPress={() => (trip ? onMenu() : router.push('/trips'))} label={trip ? `${trip.name}. Trip options and switching` : 'Choose a trip'} wide>
            <T variant="small" weight="bold" numberOfLines={1} style={{ maxWidth: 170 }}>
              {trip?.name ?? 'No trip yet'}
            </T>
            <Ionicons name="chevron-down" size={14} color={colors.ink} />
          </Control>
          <View style={{ flex: 1 }} />
          <Control onPress={() => router.push({ pathname: '/panorama', params: { city: dest?.id } })} label="Open the 360 degree city view" wide>
            <Ionicons name="globe-outline" size={16} color={colors.ink} />
            <T variant="kicker" color={colors.ink}>
              360°
            </T>
          </Control>
          <Control onPress={() => router.push('/notifications')} label={`Notifications, ${unread} unread`}>
            <Ionicons name="notifications-outline" size={19} color={colors.ink} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <T variant="micro" weight="bold" color={colors.white} style={{ fontSize: 9.5 }}>
                  {unread > 9 ? '9+' : unread}
                </T>
              </View>
            ) : null}
          </Control>
        </View>
      </SkylineHero>

      <FadeIn delay={80} distance={20} style={styles.ticketWrap}>
        <Ticket
          stub={
            trip ? (
              <View style={styles.stub}>
                <AvatarStack people={trip.members} max={4} size={32} />
                <Press onPress={onCopyCode} style={styles.code} accessibilityLabel={`Invite code ${trip.inviteCode}. Tap to copy`}>
                  <View>
                    <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 9.5 }}>
                      Invite code
                    </T>
                    <T variant="numeralSm" style={{ fontSize: 17, lineHeight: 20 }}>
                      {trip.inviteCode}
                    </T>
                  </View>
                  <Ionicons name="copy-outline" size={18} color={colors.ink} />
                </Press>
              </View>
            ) : undefined
          }>
          <View style={styles.main}>
            <View style={styles.row}>
              <T variant="kicker" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {dest ? `${dest.city}, ${dest.country}` : 'Somewhere great'}
              </T>
              {stamp ? <Stamp label={stamp.label} tone={stamp.tone} /> : null}
            </View>

            <View accessible accessibilityRole="header" accessibilityLabel={view.sentence} style={styles.count}>
              {view.kind === 'days' ? (
                <>
                  <SplitFlap value={view.number ?? 0} size={68} />
                  <T variant="headline" style={{ fontSize: 30, lineHeight: 34, marginLeft: 12 }}>
                    {view.words.join(' ')}
                  </T>
                </>
              ) : view.kind === 'day' ? (
                <>
                  <T variant="headline" style={{ fontSize: 30, lineHeight: 34, marginRight: 12 }}>
                    Day
                  </T>
                  <SplitFlap value={view.number ?? 1} size={68} />
                  <T variant="headline" style={{ fontSize: 30, lineHeight: 34, marginLeft: 12 }}>
                    {view.words.join(' ')}
                  </T>
                </>
              ) : (
                <T variant="display" style={{ fontSize: 44, lineHeight: 48 }}>
                  {view.words.join(' ')}
                </T>
              )}
            </View>

            {trip ? (
              <T variant="small" color={colors.textSecondary}>
                {rangeLabel(trip.startDate, trip.endDate)} · {tripLen} {tripLen === 1 ? 'day' : 'days'} · {trip.members.length} travellers
              </T>
            ) : (
              <T variant="small" color={colors.textSecondary}>
                Create a trip or join one with a code.
              </T>
            )}
          </View>
        </Ticket>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  control: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 44, height: 44, justifyContent: 'center', paddingHorizontal: 0, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink },
  badge: { position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  ticketWrap: { marginTop: -60, paddingHorizontal: 20 },
  main: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6 },
  stub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, borderStyle: 'dashed', backgroundColor: colors.accentSoft },
});
