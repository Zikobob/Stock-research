import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { type IconName } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors, radius, shadow } from '@/theme';

/** Four shortcuts: vote, flights, documents, photos. */
export function QuickTiles({ votingCount }: { votingCount: number }) {
  const quick: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'checkbox-outline', label: `Vote (${votingCount})`, go: () => router.navigate({ pathname: '/(tabs)/itinerary', params: { tab: 'vote' } }) },
    { icon: 'airplane-outline', label: 'Flights', go: () => router.push('/flights') },
    { icon: 'folder-open-outline', label: 'Docs', go: () => router.push('/documents') },
    { icon: 'camera-outline', label: 'Photos', go: () => router.push('/photos') },
  ];
  return (
    <FadeIn delay={260}>
      <View style={styles.quickRow}>
        {quick.map((q) => (
          <Press key={q.label} onPress={q.go} style={styles.quick} accessibilityLabel={q.label}>
            <Ionicons name={q.icon} size={22} color={colors.text} />
            <T variant="micro" weight="bold" numberOfLines={1}>
              {q.label}
            </T>
          </Press>
        ))}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1, height: 84, backgroundColor: colors.card, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow },
});
