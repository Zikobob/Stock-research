import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReminderService } from '@/components/ReminderService';
import { DialogHost, ToastHost } from '@/components/ui/feedback';
import { initNotifications } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });
  const hydrated = useAppStore((s) => s.hydrated);
  const seeded = useAppStore((s) => s.seeded);
  const signedIn = useAppStore((s) => !!s.session);
  const ensureSeed = useAppStore((s) => s.ensureSeed);

  useEffect(() => {
    initNotifications();
  }, []);

  useEffect(() => {
    if (hydrated) ensureSeed();
  }, [hydrated, ensureSeed]);

  const ready = (fontsLoaded || !!fontError) && hydrated && seeded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="destination/[id]" />
          <Stack.Screen name="destinations" />
          <Stack.Screen name="nearby" />
          <Stack.Screen name="trips" />
          <Stack.Screen name="new-trip" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="join" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="flights" />
          <Stack.Screen name="map" />
          <Stack.Screen name="weather" />
          <Stack.Screen name="photos" />
          <Stack.Screen name="bucket-list" />
          <Stack.Screen name="quiz" />
          <Stack.Screen name="survey" />
          <Stack.Screen name="documents" />
          <Stack.Screen name="packing" />
          <Stack.Screen name="currency" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="phrasebook" />
          <Stack.Screen name="recap" />
          <Stack.Screen name="airport" />
          <Stack.Screen name="help" />
          <Stack.Screen name="about" />
        </Stack.Protected>
      </Stack>
      {signedIn ? <ReminderService /> : null}
      <ToastHost />
      <DialogHost />
    </SafeAreaProvider>
  );
}
