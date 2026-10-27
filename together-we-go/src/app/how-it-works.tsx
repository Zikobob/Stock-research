import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SectionHeader, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';

const LAYERS: { icon: IconName; title: string; where: string; body: string }[] = [
  { icon: 'phone-portrait-outline', title: 'Screens', where: 'src/app · src/components', body: 'Show the data and turn taps into actions.' },
  { icon: 'funnel-outline', title: 'Selector hooks', where: 'useActiveTrip · balances · settlePlan', body: 'Work out exactly what each screen needs.' },
  { icon: 'server-outline', title: 'Zustand + Immer store', where: 'src/store', body: 'One source of truth. Saved to AsyncStorage on every change.' },
  { icon: 'sync-outline', title: 'Sync engine', where: 'src/sync · server', body: 'Keeps a shared trip identical on every phone, even after being offline.' },
  { icon: 'cloud-outline', title: 'Services', where: 'src/services', body: 'Weather, currency, notifications, AI, files and sharing.' },
];

const SYNC: [IconName, string, string][] = [
  ['create-outline', 'Every change is a tiny note', 'Adding an expense or sending a message becomes a small stamped change, not a whole copy of the trip.'],
  ['git-merge-outline', 'Newest change wins, per field', 'Two people can edit different things at once and both survive. Phones that swap their changes end up identical, in any order.'],
  ['cloud-offline-outline', 'Works with no signal', 'Changes wait on the phone and are sent when you are back online. Nothing is lost if the app closes.'],
  ['images-outline', 'Photos and files travel too', 'Photos, documents and receipts are sent to the server separately, then saved on every phone so they open offline.'],
  ['server-outline', 'Your own server, no accounts', 'A small program on your computer (npm run server) passes changes between phones. A trip is protected by a long random id that only the invite code reveals.'],
];

const SECURITY: [IconName, string, string][] = [
  ['key-outline', 'Passwords are never stored', 'Each one is salted and stretched with PBKDF2-SHA256 before it is saved, so even the stored copy can’t be read back.'],
  ['lock-closed-outline', 'API key in the keychain', 'The optional AI key lives in the iOS Keychain or Android Keystore (expo-secure-store), not in the app database.'],
  ['cloud-offline-outline', 'Offline-first', 'Trips, chats, documents and maps are saved on the phone. Weather and exchange rates are cached for when you lose signal.'],
  ['shield-checkmark-outline', 'Your data stays with you', 'Trips and chats are stored on the device. A trip you share is also kept on the sync server you chose. Only weather, exchange-rate and optional AI requests reach the wider internet.'],
  ['eye-off-outline', 'Private stays private', 'Your Scout AI chat, other people’s email addresses and your flight tickets are never sent to the sync server.'],
];

const VALIDATION: [string, string, string][] = [
  ['Email', 'Must look like name@mail.com', 'That email doesn’t look right'],
  ['Password', '8+ characters with a letter and a number', 'Use at least 8 characters'],
  ['Expense amount', 'Numbers only, above 0 and at most 1,000,000', 'Use numbers only, e.g. 25 or 25.50'],
  ['Trip dates', 'End on or after the start, up to 60 days', 'End date must be on or after the start date'],
  ['Invite code', 'Three letters, a dash, four digits', 'Codes look like ABC-1234'],
  ['Flight number', 'Airline code plus 1 to 4 digits', 'Flight numbers look like NH 175'],
  ['Packing item', '50 characters or fewer, no duplicates', 'That’s already on the list'],
];

const RUBRIC: { icon: IconName; area: string; where: string; href: Href }[] = [
  { icon: 'people-outline', area: 'Collaboration', where: 'More: members, roles, polls and checklist, plus live sync across phones. Plan: voting. Packing: who’s bringing what.', href: '/crew' },
  { icon: 'chatbubbles-outline', area: 'Communication', where: 'Chat tab: group chat and the Scout AI assistant.', href: '/(tabs)/chat' },
  { icon: 'calendar-outline', area: 'Scheduling', where: 'Plan tab: day-by-day itinerary, reminders, flights and time zones.', href: '/(tabs)/itinerary' },
  { icon: 'wallet-outline', area: 'Budgeting', where: 'Budget tab: expenses, split, settle up and currency converter.', href: '/(tabs)/budget' },
  { icon: 'folder-open-outline', area: 'Organization', where: 'More: offline docs, packing list, weather, photo dump and printable planner.', href: '/documents' },
  { icon: 'color-palette-outline', area: 'Other features', where: 'Themes and languages, trip quiz, bucket list, phrasebook and the recap story card.', href: '/personalize' },
  { icon: 'airplane-outline', area: 'Trip management', where: 'Home: switch trips. Create or join with an invite code. Recap when the trip ends.', href: '/trips' },
];

const LIBRARIES = [
  'Expo SDK 57',
  'React Native 0.86',
  'TypeScript',
  'Expo Router',
  'Zustand',
  'Immer',
  'AsyncStorage',
  'expo-crypto',
  'expo-secure-store',
  'expo-notifications',
  'expo-location',
  'expo-image-picker',
  'expo-document-picker',
  'expo-file-system',
  'expo-print',
  'expo-sharing',
  'expo-camera',
  'react-native-view-shot',
  'qrcode-generator',
  '@noble/hashes',
  'expo-speech',
  'expo-haptics',
  'react-native-maps',
  'react-native-svg',
  'Reanimated',
  'Anthropic Messages API via fetch (optional)',
  'Jest',
];

/** One part of the page: a serif title over a rule, then its content. The gap between parts is the big one. */
function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <View style={{ marginTop: first ? 0 : space.section }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

/** A line icon, a bold title and a few words, one under the other with a hair rule between. */
function Rows({ items }: { items: [IconName, string, string][] }) {
  return (
    <View>
      {items.map(([icon, title, body], i) => (
        <View key={title} style={[styles.row, i === 0 && styles.first]}>
          <Ionicons name={icon} size={22} color={colors.ink} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="bodySm" weight="bold">
              {title}
            </T>
            <T variant="small" color={colors.textSecondary}>
              {body}
            </T>
          </View>
        </View>
      ))}
    </View>
  );
}

/** How the app is built, drawn for the judges: layers, sync, security, validation, the rubric map and the libraries. */
export default function HowItWorks() {
  const setToured = useAppStore((s) => s.setToured);
  return (
    <Screen header={<Header kicker="TogetherWeGo" title="How it works" subtitle="How TogetherWeGo is built and where to find everything" backLabel="More" />}>
      <Section title="Architecture" first>
        <T variant="small" color={colors.textSecondary}>
          A layered, MVVM-style design. Data flows one way: a screen calls a store action, the state updates, and the screen redraws.
        </T>
        <View style={{ marginTop: space.lg }}>
          {LAYERS.map((l, i) => (
            <View key={l.title}>
              <View style={styles.layer}>
                <View style={styles.layerIcon}>
                  <Ionicons name={l.icon} size={20} color={colors.ink} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <T variant="bodySm" weight="bold">
                    {l.title}
                  </T>
                  <T variant="kicker" color={colors.textSecondary} style={{ textTransform: 'none' }}>
                    {l.where}
                  </T>
                  <T variant="small" color={colors.textSecondary}>
                    {l.body}
                  </T>
                </View>
              </View>
              {i < LAYERS.length - 1 ? <Ionicons name="arrow-down" size={16} color={colors.ink} style={{ alignSelf: 'center', marginVertical: 4 }} /> : null}
            </View>
          ))}
        </View>
      </Section>

      <Section title="Sync across phones">
        <T variant="small" color={colors.textSecondary} style={{ marginBottom: space.sm }}>
          Friends on different phones see the same plan, chat, votes and budget, live.
        </T>
        <Rows items={SYNC} />
      </Section>

      <Section title="Data and security">
        <Rows items={SECURITY} />
      </Section>

      <Section title="Input validation">
        <T variant="small" color={colors.textSecondary}>
          Every form checks the format and whether the value makes sense, then shows a plain message next to the field.
        </T>
        <View style={{ marginTop: space.sm }}>
          {VALIDATION.map(([field, rule, message], i) => (
            <View key={field} style={[styles.row, styles.col, i === 0 && styles.first]}>
              <T variant="bodySm" weight="bold">
                {field}
              </T>
              <T variant="small" color={colors.textSecondary}>
                {rule}
              </T>
              <View style={styles.msg}>
                <Ionicons name="alert-circle" size={14} color={colors.red} />
                <T variant="caption" color={colors.red} style={{ flexShrink: 1 }}>
                  {message}
                </T>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Rubric map">
        <T variant="small" color={colors.textSecondary} style={{ marginBottom: space.sm }}>
          Each competition area and where to find it. Tap a row to open it.
        </T>
        {RUBRIC.map((r, i) => (
          <Press key={r.area} onPress={() => router.push(r.href)} style={[styles.row, styles.press, i === 0 && styles.first]} scaleTo={0.99} accessibilityLabel={`${r.area}. ${r.where}`}>
            <Ionicons name={r.icon} size={22} color={colors.ink} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodySm" weight="bold">
                {r.area}
              </T>
              <T variant="small" color={colors.textSecondary}>
                {r.where}
              </T>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.ink} style={{ marginTop: 3 }} />
          </Press>
        ))}
      </Section>

      <Section title="Libraries used">
        <View style={styles.tags}>
          {LIBRARIES.map((l) => (
            <View key={l} style={styles.tag}>
              <T variant="caption" weight="semibold">
                {l}
              </T>
            </View>
          ))}
        </View>
      </Section>

      <Button
        label="Replay the app tour"
        icon="play-circle-outline"
        style={{ marginTop: space.section }}
        onPress={() => {
          setToured(false);
          router.navigate('/(tabs)/explore');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderTopWidth: hair, borderTopColor: colors.border },
  first: { borderTopWidth: 0 },
  col: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
  press: { minHeight: 56 },
  layer: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  layerIcon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.xs, borderWidth: 1.5, borderColor: colors.red, backgroundColor: colors.redSoft, alignSelf: 'flex-start', maxWidth: '100%' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.chip, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.card },
});
