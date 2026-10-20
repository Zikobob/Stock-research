import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Avatar } from '@/components/ui/bits';
import { confirmAction } from '@/components/ui/feedback';
import { imageSource } from '@/data/images';
import { deleteLocalFile } from '@/services/files';
import { sharePhoto } from '@/services/share';
import type { Photo, Trip } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors } from '@/theme';
import { timeAgo } from '@/utils/format';
import { dayLabel } from '@/utils/time';

/** The full-screen view of one photo: the picture, who posted it, likes, share and (for your own photos) delete. */
export function PhotoViewer({ photo, trip, userId, onClose, onShare, onLike, onDelete }: { photo: Photo; trip: Trip; userId: string; onClose: () => void; onShare: () => void; onLike: () => void; onDelete: () => void }) {
  const insets = useSafeAreaInsets();
  const { uri, loading } = useSharedFile(photo.uri, photo.blob);
  const author = trip.members.find((x) => x.id === photo.by);
  const liked = photo.likes.includes(userId);
  return (
    <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.viewerTop}>
        <Press onPress={onClose} style={styles.round} accessibilityLabel="Close photo">
          <Ionicons name="close" size={22} color={colors.white} />
        </Press>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Press onPress={onShare} style={styles.round} accessibilityLabel="Share photo to social media">
            <Ionicons name="share-social-outline" size={20} color={colors.white} />
          </Press>
          {photo.by === userId ? (
            <Press
              onPress={() =>
                confirmAction('Delete photo?', 'It will be removed from the photo dump for everyone.', () => {
                  deleteLocalFile(photo.uri);
                  onDelete();
                }, { destructive: true, confirmLabel: 'Delete' })
              }
              style={styles.round}
              accessibilityLabel="Delete photo">
              <Ionicons name="trash-outline" size={20} color={colors.white} />
            </Press>
          ) : null}
        </View>
      </View>
      {uri ? (
        <Image source={imageSource(uri)} style={{ flex: 1, width: '100%' }} contentFit="contain" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}>
          {loading ? <ActivityIndicator color="rgba(255,255,255,0.8)" size="large" /> : <Ionicons name="phone-portrait-outline" size={40} color="rgba(255,255,255,0.6)" />}
          <T variant="small" color="rgba(255,255,255,0.8)" center>
            {loading ? `Getting ${author?.name.split(' ')[0] ?? 'your friend'}’s photo…` : `This photo is on ${author?.name.split(' ')[0] ?? 'a friend'}’s phone. Likes and captions still sync.`}
          </T>
        </View>
      )}
      <View style={styles.viewerBottom}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={author?.name ?? '?'} src={author?.avatar} size={32} />
          <View style={{ flex: 1 }}>
            <T variant="small" weight="semibold" color={colors.white}>
              {photo.caption || 'Untitled'}
            </T>
            <T variant="caption" color="rgba(255,255,255,0.7)">
              {author?.name.split(' ')[0]} · {photo.day ? dayLabel(photo.day) : ''} · {timeAgo(photo.ts)}
            </T>
          </View>
          <Press onPress={onLike} style={styles.likeBtn} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#FF6B81' : colors.white} />
            <T variant="small" weight="semibold" color={colors.white}>
              {photo.likes.length}
            </T>
          </Press>
        </View>
        {uri ? <Button label="Save & share" variant="light" size="md" icon="download-outline" onPress={() => sharePhoto(uri, photo.caption)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#0B0F0A' },
  viewerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  viewerBottom: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
});
