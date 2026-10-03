import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/Logo';
import { Card } from '@/components/ui/bits';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';

const SOURCES: [string, string, string][] = [
  ['Weather', 'Open-Meteo forecast API (CC BY 4.0)', 'https://open-meteo.com'],
  ['Exchange rates', 'ExchangeRate-API open access endpoint', 'https://www.exchangerate-api.com/docs/free'],
  ['Maps', 'Apple Maps / Google Maps via react-native-maps; OpenStreetMap on web (ODbL)', 'https://www.openstreetmap.org/copyright'],
  ['Photography', 'Unsplash — free to use under the Unsplash License (see ATTRIBUTIONS.md)', 'https://unsplash.com/license'],
  ['Font', 'Outfit by Rodrigo Fuenzalida — SIL Open Font License', 'https://fonts.google.com/specimen/Outfit'],
  ['Icons', 'Ionicons & Material Community Icons (MIT) via @expo/vector-icons', 'https://icons.expo.fyi'],
  ['Emergency numbers', 'Official tourism / government sources per country (e.g. JNTO for Japan)', 'https://www.jnto.go.jp/safety-tips/eng/emergency-numbers.html'],
  ['AI (optional)', 'Anthropic Claude API — only when the user adds their own key', 'https://docs.claude.com'],
];

const STACK = [
  'Expo SDK 57 + React Native 0.86 (iOS & Android, TypeScript)',
  'Expo Router — file-based navigation with protected routes',
  'Zustand + Immer — state; AsyncStorage — offline persistence',
  'expo-crypto (SHA-256 password hashing), expo-secure-store (API key)',
  'expo-notifications, expo-location, expo-image-picker, expo-document-picker',
  'expo-print, expo-sharing, expo-speech, expo-file-system, react-native-maps',
];

export default function About() {
  return (
    <Screen header={<Header title="About" subtitle="Credits, sources & how it’s built" />}>
      <View style={styles.brand}>
        <LogoMark size={64} />
        <T variant="h2">TogetherWeGo</T>
        <T variant="small" color={colors.textSecondary} center>
          Together We Go: Group Trip Planner · FBLA Mobile Application Development 2026–27 · v1.0
        </T>
      </View>
      <Card style={{ gap: 10 }}>
        <T variant="title">Architecture</T>
        <T variant="small" color={colors.textSecondary}>
          Layered MVVM-style design: screens (views) in src/app, reusable components in src/components, a single store (model + view-model selectors) in src/store, and side-effect services (weather, currency, notifications, AI, files) in src/services. Data flows one way: screens call store actions → state updates → UI re-renders.
        </T>
        {STACK.map((s) => (
          <T key={s} variant="caption">
            • {s}
          </T>
        ))}
      </Card>
      <Card style={{ gap: 12, marginTop: 14 }}>
        <T variant="title">Data sources & licences</T>
        {SOURCES.map(([k, v, url]) => (
          <View key={k}>
            <T variant="small" weight="semibold">
              {k}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {v}
            </T>
            <T variant="caption" color={colors.primary} onPress={() => Linking.openURL(url)} accessibilityRole="link">
              {url}
            </T>
          </View>
        ))}
      </Card>
      <T variant="caption" color={colors.textMuted} center style={{ marginTop: 14 }}>
        Demo people, trips and chats are fictional sample data. Destination facts are summarised from public tourism information.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, marginBottom: 18 },
});
