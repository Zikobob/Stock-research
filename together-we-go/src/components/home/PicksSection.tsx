import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import { colors, line, radius } from '@/theme';

import type { pickedForYou } from './picks';

/** "Picked for you": photo cards in an ink outline, each with a stamp for how well it matches, ranked from the survey answers. */
export function PicksSection({ picks }: { picks: ReturnType<typeof pickedForYou> }) {
  return (
    <View>
      <SectionHeader title="Picked for you" action="Edit" onAction={() => router.push('/personalize')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
        {picks.map(({ d, match, why }) => (
          <Press key={d.id} onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} scaleTo={0.985} style={styles.pick} accessibilityLabel={`${d.city}, ${match}% match. ${why}`}>
            <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.match} pointerEvents="none">
              <Stamp label={`${match}% match`} tone="accent" />
            </View>
            <View style={styles.text} pointerEvents="none">
              <T variant="h3" color={colors.white} numberOfLines={1}>
                {d.city}
              </T>
              <T variant="kicker" color={colors.white} numberOfLines={1} style={{ fontSize: 10 }}>
                {d.country}
              </T>
            </View>
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pick: { width: 164, height: 204, borderRadius: radius.card, overflow: 'hidden', borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
  match: { position: 'absolute', top: 12, left: 10 },
  text: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 2 },
});
