import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

/** Entry point: routes to onboarding, sign-in or the app depending on state. */
export default function Index() {
  const signedIn = useAppStore((s) => !!s.session);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  if (signedIn) return <Redirect href="/(tabs)/explore" />;
  return <Redirect href={hasOnboarded ? '/sign-in' : '/onboarding'} />;
}
