import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/bits';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import type { Personal } from '@/store/types';
import { colors, radius, shadow } from '@/theme';

import { pickedForYou } from './picks';

/** "Picked for you" cards ranked by the survey answers. Nothing is shown until the survey is done (Settings and the bottom of Home lead to it). */
export function PicksSection({ personal }: { personal: Personal }) {
  const picks = pickedForYou(personal);
  return (
    personal.done && picks.length ? (
      <FadeIn delay={300}>
        <SectionHeader title="Picked for you" action="Edit" onAction={() => router.push('/personalize')} style={{ marginTop: 26 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
          {picks.map(({ d, match, why }) => (
            <Press key={d.id} onPress={() => router.push({ pathname: '/destination/[id]', params: { id: d.id } })} style={styles.pick} accessibilityLabel={`${d.city}, ${match}% match`}>
              <Image source={imageSource(d.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
              <View style={styles.match}>
                <T variant="micro" weight="bold" color={colors.onAccent}>
                  {match}% match
                </T>
              </View>
              <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                <T variant="title" weight="bold" color={colors.white} numberOfLines={1}>
                  {d.city}
                </T>
                <T variant="micro" color="rgba(255,255,255,0.9)" numberOfLines={1}>
                  {why}
                </T>
              </View>
            </Press>
          ))}
        </ScrollView>
      </FadeIn>
    ) : null
  );
}

const styles = StyleSheet.create({
  pick: { width: 156, height: 196, borderRadius: radius.xl, overflow: 'hidden', ...shadow },
  match: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
});
