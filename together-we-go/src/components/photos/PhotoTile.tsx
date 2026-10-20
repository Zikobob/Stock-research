import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import type { Photo } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors } from '@/theme';

/** One square in the photo grid: the picture, a spinner while a friend's copy downloads, or a caption card. */
export function PhotoTile({ photo, size, who, onPress }: { photo: Photo; size: number; who: string; onPress: () => void }) {
  const { uri, loading } = useSharedFile(photo.uri, photo.blob);
  return (
    <Press onPress={onPress} style={{ width: size, height: size }} scaleTo={0.96} accessibilityLabel={photo.caption || 'Photo'}>
      {uri ? (
        <Image source={imageSource(uri)} style={styles.img} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.img, styles.missing]}>
          {loading ? <ActivityIndicator color={colors.textMuted} /> : <Ionicons name="image-outline" size={26} color={colors.textMuted} />}
          <T variant="micro" color={colors.textMuted} center numberOfLines={2}>
            {photo.caption || `Photo from ${who}`}
          </T>
        </View>
      )}
      {photo.likes.length ? (
        <View style={styles.likes}>
          <Ionicons name="heart" size={10} color={colors.white} />
          <T variant="micro" color={colors.white}>
            {photo.likes.length}
          </T>
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%', borderRadius: 8 },
  missing: { backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  likes: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 999 },
});
