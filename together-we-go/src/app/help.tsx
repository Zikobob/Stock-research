import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { colors, radius } from '@/theme';

const JOURNEY: { icon: IconName; title: string; body: string; href: Href }[] = [
  { icon: 'add-circle-outline', title: '1. Create or join a trip', body: 'Pick a destination, dates and a group budget — or enter a friend’s invite code.', href: '/trips' },
  { icon: 'share-social-outline', title: '2. Invite your group', body: 'Profile → Invite code → Share sends it straight to WhatsApp, Instagram, Messages and more.', href: '/(tabs)/profile' },
  { icon: 'people-outline', title: '3. Give everyone a role', body: 'Treasurer, Navigator, Food Lead… tap a member to assign who owns what.', href: '/(tabs)/profile' },
  { icon: 'map-outline', title: '4. Build the itinerary', body: 'Add activities per day, filter by type or length, and vote with “I’m in”. Majority confirms.', href: '/(tabs)/itinerary' },
  { icon: 'airplane-outline', title: '5. Add flights & tickets', body: 'Everyone’s arrivals show in one list, converted to the trip’s time zone automatically.', href: '/flights' },
  { icon: 'wallet-outline', title: '6. Track the budget', body: 'Log expenses in any currency, see the breakdown and settle up with the fewest payments.', href: '/(tabs)/budget' },
  { icon: 'chatbubbles-outline', title: '7. Chat & ask the assistant', body: 'Message the group, or tap ✨ to ask the Trip Assistant about budget, weather, food or what’s next.', href: '/(tabs)/chat' },
  { icon: 'notifications-outline', title: '8. Get live reminders', body: 'Tap the bell on any activity — everyone gets an alert before it starts.', href: '/settings' },
  { icon: 'trophy-outline', title: '9. Wrap it up', body: 'Mark the trip complete for a shareable recap, final balances and the photo dump.', href: '/recap' },
];

const FAQ = [
  ['Does it work without internet?', 'Yes. Trips, chats, documents, the phrasebook, emergency numbers, the offline map and the Trip Assistant all work offline. Weather and currency rates refresh when you’re back online and are cached meanwhile.'],
  ['Where is my data stored?', 'On your phone, in TogetherWeGo’s private storage. Passwords are salted and hashed; an optional AI key goes in the secure keychain.'],
  ['How do time zones work?', 'Itinerary times are in the destination’s local time. Flights are stored as exact moments, so they display correctly in trip time or your own time — toggle it in Flights.'],
  ['How does voting work?', 'Activities marked “Voting” become “Confirmed” once more than half the group taps “I’m in”. Polls in Profile let the group pick between options.'],
  ['Can I change the language?', 'Settings → Language: English, Español, Français, 日本語, हिन्दी and 中文.'],
  ['How do I try the demo?', 'Sign in with the demo account on the sign-in screen. Settings → Demo timeline switches the sample trip between upcoming, in progress and completed.'],
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen header={<Header title="How to use TogetherWeGo" subtitle="Your group trip, from first idea to final recap" />}>
      <T variant="h3" style={{ marginBottom: 10 }}>
        The journey
      </T>
      <View style={{ gap: 8 }}>
        {JOURNEY.map((s) => (
          <Card key={s.title} onPress={() => router.push(s.href)} style={styles.step} accessibilityLabel={s.title}>
            <View style={styles.icon}>
              <Ionicons name={s.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold">
                {s.title}
              </T>
              <T variant="caption" color={colors.textSecondary}>
                {s.body}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Card>
        ))}
      </View>
      <T variant="h3" style={{ marginTop: 22, marginBottom: 10 }}>
        FAQ
      </T>
      <View style={{ gap: 8 }}>
        {FAQ.map(([q, a], i) => (
          <Press key={q} onPress={() => setOpen(open === i ? null : i)} style={styles.faq} accessibilityState={{ expanded: open === i }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T variant="small" weight="semibold" style={{ flex: 1 }}>
                {q}
              </T>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </View>
            {open === i ? (
              <T variant="small" color={colors.textSecondary} style={{ marginTop: 6 }}>
                {a}
              </T>
            ) : null}
          </Press>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  faq: { padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
