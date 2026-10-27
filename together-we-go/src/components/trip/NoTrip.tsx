import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/bits';
import { Screen } from '@/components/ui/Screen';

/** Shown on trip tabs when the signed-in user isn't part of any trip yet. */
export function NoTrip({ title = 'No trip selected' }: { title?: string }) {
  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState icon="airplane-outline" title={title} body="Create a trip and invite your group, or join a friend’s trip with their invite code.">
        <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 12 }}>
          <Button label="Create a trip" icon="add" onPress={() => router.push('/new-trip')} />
          <Button label="Join with a code" icon="people-outline" variant="secondary" onPress={() => router.push('/join')} />
        </View>
      </EmptyState>
    </Screen>
  );
}
