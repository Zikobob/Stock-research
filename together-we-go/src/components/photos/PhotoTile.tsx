import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import type { Photo } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors, line, radius } from '@/theme';

/**
 * One square in the photo grid, in a 2 px ink outline like a print on a contact sheet. A grey block pulses where the picture will be until
 * it has loaded (or while a friend's copy downloads); a picture that is on a friend's phone shows its caption instead.
 */
export function PhotoTile({ photo, size, who, onPress }: { photo: Photo; size: number; who: string; onPress: () => void }) {
  const { uri, loading } = useSharedFile(photo.uri, photo.blob);
  const [loaded, setLoaded] = useState(false);
  return (
    <Press onPress={onPress} style={[styles.tile, { width: size, height: size }]} scaleTo={0.96} accessibilityLabel={photo.caption || 'Photo'}>
      {uri ? (
        <Image source={imageSource(uri)} style={styles.img} contentFit="cover" transition={150} onLoad={() => setLoaded(true)} accessibilityIgnoresInvertColors />
      ) : loading ? null : (
        <View style={[styles.img, styles.missing]}>
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
          <T variant="micro" color={colors.textSecondary} center numberOfLines={2}>
            {photo.caption || `Photo from ${who}`}
          </T>
        </View>
      )}
      {(uri && !loaded) || loading ? <Skeleton height={size} corner={0} style={StyleSheet.absoluteFill} /> : null}
      {photo.likes.length ? (
        <View style={styles.likes}>
          <Ionicons name="heart" size={11} color={colors.ink} />
          <T variant="kicker" color={colors.ink} style={{ fontSize: 10.5, lineHeight: 13 }}>
            {photo.likes.length}
          </T>
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, overflow: 'hidden', backgroundColor: colors.bgAlt },
  img: { width: '100%', height: '100%' },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  likes: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.ink, paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.xs },
});
