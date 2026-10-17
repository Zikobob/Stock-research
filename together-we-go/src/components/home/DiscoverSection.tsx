import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceCard } from '@/components/explore';
import { SectionHeader } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { destinations, type Destination } from '@/data/destinations';

/** Four other destinations to look at. */
export function DiscoverSection({ dest, colW }: { dest: Destination | undefined; colW: number }) {
  return (
    <FadeIn delay={380}>
      <SectionHeader title="Discover" action="See all" onAction={() => router.push('/destinations')} style={{ marginTop: 26 }} />
      <View style={styles.grid}>
        {destinations.filter((d) => d.id !== dest?.id).slice(0, 4).map((d) => (
          <PlaceCard key={d.id} d={d} style={{ width: (colW - 12) / 2 }} />
        ))}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
