import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/bits';
import { Plate } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { colors, hair, line, radius, space } from '@/theme';

const SOURCES: [string, string, string][] = [
  ['Weather', 'Open-Meteo forecast API (CC BY 4.0)', 'https://open-meteo.com'],
  ['Exchange rates', 'ExchangeRate-API open access endpoint', 'https://www.exchangerate-api.com/docs/free'],
  ['Maps', 'Apple Maps / Google Maps via react-native-maps; OpenStreetMap on web (ODbL)', 'https://www.openstreetmap.org/copyright'],
  ['Photography', 'Unsplash. Free to use under the Unsplash License (see ATTRIBUTIONS.md)', 'https://unsplash.com/license'],
  ['Fonts', 'Fraunces, Space Grotesk and Space Mono. SIL Open Font License', 'https://fonts.google.com'],
  ['Icons', 'Ionicons & Material Community Icons (MIT) via @expo/vector-icons', 'https://icons.expo.fyi'],
  ['Emergency numbers', 'Official tourism and government sources per country (e.g. JNTO for Japan)', 'https://www.jnto.go.jp/safety-tips/eng/emergency-numbers.html'],
  ['AI (optional)', 'Anthropic Claude API. Only when the user adds their own key', 'https://docs.claude.com'],
];

const STACK = [
  'Expo SDK 57 + React Native 0.86 (iOS & Android, TypeScript)',
  'Expo Router: file-based navigation with protected routes',
  'Zustand + Immer for state; AsyncStorage for offline persistence',
  '@noble/hashes (PBKDF2 password hashing), expo-crypto (random salts), expo-secure-store (API key)',
  'expo-notifications, expo-location, expo-image-picker, expo-document-picker',
  'expo-print, expo-sharing, expo-speech, expo-file-system, expo-camera, react-native-maps',
  'qrcode-generator (invite QR codes, MIT), react-native-view-shot (share the recap as a picture)',
  'A small Node sync server in server/ (no dependencies) keeps friends’ phones in step; Jest + Playwright for tests',
];

/** The link under a source: the address in mono with an arrow, a whole 44 point row you can press. */
function Link({ url }: { url: string }) {
  return (
    <Press onPress={() => Linking.openURL(url)} style={styles.link} scaleTo={0.99} accessibilityRole="link" accessibilityLabel={`Open ${url}`}>
      <T variant="kicker" color={colors.accentText} numberOfLines={1} style={{ flex: 1, textTransform: 'none' }}>
        {url.replace(/^https?:\/\//, '')}
      </T>
      <Ionicons name="open-outline" size={16} color={colors.ink} />
    </Press>
  );
}

/** Credits and sources: what the app is made of, where its data comes from, and the licences that allow it. */
export default function About() {
  return (
    <Screen header={<Header kicker="TogetherWeGo" title="About" subtitle="Credits, sources and how it’s built" backLabel="More" />}>
      <View style={styles.brand}>
        <Plate offset={4} corner={radius.card}>
          <View style={styles.mark}>
            <Ionicons name="airplane" size={30} color={colors.onAccent} />
          </View>
        </Plate>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline">TogetherWeGo</T>
          <T variant="kicker" color={colors.textSecondary}>
            Group trip planner · v1.0
          </T>
          <T variant="caption" color={colors.textSecondary}>
            Made for FBLA Mobile Application Development 2026–27
          </T>
        </View>
      </View>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="How it’s built" />
        <T variant="small" color={colors.textSecondary}>
          A layered, MVVM-style design: screens (views) in src/app, reusable components in src/components, a single store (model and view-model selectors) in src/store, and side-effect services (weather, currency, notifications, AI, files) in src/services. Data flows one way: screens call store actions, state updates, the UI draws again.
        </T>
        <View style={{ marginTop: space.lg }}>
          {STACK.map((s, i) => (
            <View key={s} style={[styles.stack, i === 0 && { borderTopWidth: 0 }]}>
              <View style={styles.bullet} />
              <T variant="small" style={{ flex: 1 }}>
                {s}
              </T>
            </View>
          ))}
        </View>
        <Button label="How it works" icon="construct-outline" variant="secondary" size="md" style={{ marginTop: space.lg }} onPress={() => router.push('/how-it-works')} accessibilityHint="Architecture, sync, security and where to find every feature" />
      </View>

      <View style={{ marginTop: space.section }}>
        <SectionHeader title="Sources and licences" />
        {SOURCES.map(([k, v, url], i) => (
          <View key={k} style={[styles.source, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
            <T variant="kicker" color={colors.textSecondary}>
              {k}
            </T>
            <T variant="small">{v}</T>
            <Link url={url} />
          </View>
        ))}
      </View>

      <T variant="caption" color={colors.textMuted} style={{ marginTop: space.section }}>
        Demo people, trips and chats are fictional sample data. Destination facts are summarised from public tourism information.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  mark: { width: 68, height: 68, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.sm, borderTopWidth: hair, borderTopColor: colors.border },
  bullet: { width: 7, height: 7, marginTop: 7, backgroundColor: colors.ink },
  source: { gap: 2, paddingVertical: space.md, borderTopWidth: hair, borderTopColor: colors.border },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
});
