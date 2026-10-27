import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { colors, hair, line, radius, space } from '@/theme';

const JOURNEY: { title: string; body: string; href: Href }[] = [
  { title: 'Create or join a trip', body: 'Pick a destination, dates and a group budget, or enter a friend’s invite code.', href: '/trips' },
  { title: 'Invite your group', body: 'More, then Crew & roles, then Share sends it straight to WhatsApp, Instagram, Messages and more.', href: '/crew' },
  { title: 'Give everyone a role', body: 'Treasurer, Navigator, Food Lead… tap a member to assign who owns what.', href: '/crew' },
  { title: 'Build the plan', body: 'In the Plan tab, add activities per day, filter by type or length, and vote with “I’m in”. A majority confirms.', href: '/(tabs)/itinerary' },
  { title: 'Add flights & tickets', body: 'Everyone’s arrivals show in one list, converted to the trip’s time zone automatically.', href: '/flights' },
  { title: 'Track the budget', body: 'In the Budget tab, log expenses in any currency, see the breakdown and settle up with the fewest payments.', href: '/(tabs)/budget' },
  { title: 'Chat & ask the assistant', body: 'In the Chat tab, message the group, or open the Scout AI tab to ask about budget, weather, food or what’s next.', href: '/(tabs)/chat' },
  { title: 'Get live reminders', body: 'Tap the bell on any activity and everyone gets an alert before it starts.', href: '/settings' },
  { title: 'Wrap it up', body: 'Mark the trip complete for a shareable recap, final balances and the photo dump.', href: '/recap' },
];

const FAQ = [
  ['Does it work without internet?', 'Yes. Trips, chats, documents, the phrasebook, emergency numbers, the offline map and the Trip Assistant all work offline. Weather and currency rates refresh when you’re back online and are cached meanwhile.'],
  ['Where is my data stored?', 'On your phone, in TogetherWeGo’s private storage. Passwords are salted and hashed; an optional AI key goes in the secure keychain.'],
  ['How do time zones work?', 'Itinerary times are in the destination’s local time. Flights are stored as exact moments, so they display correctly in trip time or your own time. Toggle it in Flights.'],
  ['How does voting work?', 'Activities marked “Voting” become “Confirmed” once more than half the group taps “I’m in”. Polls in More let the group pick between options.'],
  ['Can I change the language?', 'Settings, then Language: English, Español, Français, 日本語, हिन्दी and 中文.'],
  ['How do I try the demo?', 'Sign in with the demo account on the sign-in screen. In Settings, Advanced, Demo timeline switches the sample trip between upcoming, in progress and completed.'],
];

/** A tour of the app in nine steps, then the questions people ask. Every step opens the screen it talks about. */
export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen header={<Header kicker="TogetherWeGo" title="Help" subtitle="Your group trip, from first idea to final recap" backLabel="More" />}>
      <Card onPress={() => router.push('/how-it-works')} style={styles.how} accessibilityLabel="How it works">
        <View style={styles.howIcon}>
          <Ionicons name="construct-outline" size={22} color={colors.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold">
            How it works
          </T>
          <T variant="caption" color={colors.textSecondary}>
            How the app is built, how your data is kept safe, and where to find every feature
          </T>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.ink} />
      </Card>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="The journey" />
        {JOURNEY.map((s, i) => (
          <Press key={s.title} onPress={() => router.push(s.href)} style={[styles.step, i === 0 && styles.first]} scaleTo={0.99} accessibilityLabel={`Step ${i + 1}. ${s.title}`}>
            <View style={styles.num}>
              <T variant="numeralSm" style={{ fontSize: 20, lineHeight: 26 }}>
                {i + 1}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodySm" weight="semibold">
                {s.title}
              </T>
              <T variant="caption" color={colors.textSecondary}>
                {s.body}
              </T>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.ink} style={{ marginTop: 14 }} />
          </Press>
        ))}
      </View>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="Questions" />
        {FAQ.map(([q, a], i) => (
          <Press key={q} onPress={() => setOpen(open === i ? null : i)} style={[styles.faq, i === 0 && styles.first]} scaleTo={0.99} accessibilityLabel={q} accessibilityState={{ expanded: open === i }}>
            <View style={styles.q}>
              <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
                {q}
              </T>
              <Ionicons name={open === i ? 'remove' : 'add'} size={22} color={colors.ink} />
            </View>
            {open === i ? (
              <T variant="small" color={colors.textSecondary} style={{ marginTop: space.sm }}>
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
  how: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  howIcon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderTopWidth: hair, borderTopColor: colors.border },
  first: { borderTopWidth: 0 },
  num: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  faq: { paddingVertical: space.md, minHeight: 56, justifyContent: 'center', borderTopWidth: hair, borderTopColor: colors.border },
  q: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
