import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceCard } from '@/components/explore';
import { SectionHeader } from '@/components/ui/bits';
import { destinations, type Destination } from '@/data/destinations';

/** Four other places to look at, as photo cards in two columns. */
export function DiscoverSection({ dest, colW }: { dest: Destination | undefined; colW: number }) {
  return (
    <View>
      <SectionHeader title="Discover" action="See all" onAction={() => router.push('/destinations')} />
      <View style={styles.grid}>
        {destinations
          .filter((d) => d.id !== dest?.id)
          .slice(0, 4)
          .map((d) => (
            <PlaceCard key={d.id} d={d} style={{ width: (colW - 12) / 2 }} />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
