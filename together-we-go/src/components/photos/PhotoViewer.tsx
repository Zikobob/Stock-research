import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { PlatePress } from '@/components/ui/Plate';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { Avatar, type IconName } from '@/components/ui/bits';
import { confirmAction } from '@/components/ui/feedback';
import { imageSource } from '@/data/images';
import { deleteLocalFile } from '@/services/files';
import { sharePhoto } from '@/services/share';
import type { Photo, Trip } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors, line, radius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { dayLabel } from '@/utils/time';

/** A square outlined control (44 points) that sits on the dark backdrop, like the controls on the Home photo. */
function Control({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <PlatePress onPress={onPress} accessibilityLabel={label} offset={3} corner={radius.button} color={colors.accent} style={[styles.control, active && { backgroundColor: colors.accent }]}>
      <Ionicons name={icon} size={20} color={active ? colors.onAccent : colors.ink} />
    </PlatePress>
  );
}

/** The full-screen view of one photo: the picture as a print in a paper frame, who posted it, likes, share and (for your own photos) delete. */
export function PhotoViewer({ photo, trip, userId, onClose, onShare, onLike, onDelete }: { photo: Photo; trip: Trip; userId: string; onClose: () => void; onShare: () => void; onLike: () => void; onDelete: () => void }) {
  const insets = useSafeAreaInsets();
  const { uri, loading } = useSharedFile(photo.uri, photo.blob);
  const author = trip.members.find((x) => x.id === photo.by);
  const first = author?.name.split(' ')[0] ?? 'a friend';
  const liked = photo.likes.includes(userId);
  return (
    <View style={[styles.viewer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Control icon="close" label="Close photo" onPress={onClose} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Control icon="share-social-outline" label="Share photo to social media" onPress={onShare} />
          {photo.by === userId ? (
            <Control
              icon="trash-outline"
              label="Delete photo"
              onPress={() =>
                confirmAction('Delete photo?', 'It will be removed from the photo dump for everyone.', () => {
                  deleteLocalFile(photo.uri);
                  onDelete();
                }, { destructive: true, confirmLabel: 'Delete' })
              }
            />
          ) : null}
        </View>
      </View>
      <View style={styles.print}>
        {uri ? (
          <Image source={imageSource(uri)} style={{ flex: 1, width: '100%', borderRadius: radius.card }} contentFit="contain" accessibilityIgnoresInvertColors />
        ) : loading ? (
          <Skeleton height={320} corner={radius.xs} />
        ) : (
          <View style={styles.away}>
            <Ionicons name="phone-portrait-outline" size={36} color={colors.ink} />
            <T variant="small" center>
              This photo is on {first}’s phone. Likes and captions still sync.
            </T>
          </View>
        )}
      </View>
      <View style={styles.panel}>
        <View style={styles.who}>
          <Avatar name={author?.name ?? '?'} src={author?.avatar} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="title" weight="bold" numberOfLines={2}>
              {photo.caption || 'Untitled'}
            </T>
            <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
              {first} / {photo.day ? dayLabel(photo.day) : ''} / {timeAgo(photo.ts)}
            </T>
          </View>
          <PlatePress onPress={onLike} accessibilityLabel={liked ? 'Unlike' : 'Like'} accessibilityState={{ selected: liked }} offset={3} corner={radius.button} style={[styles.like, liked && { backgroundColor: colors.accent }]}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.onAccent : colors.ink} />
            <T variant="numeralSm" color={liked ? colors.onAccent : colors.ink} style={{ fontSize: 17, lineHeight: 22 }}>
              {photo.likes.length}
            </T>
          </PlatePress>
        </View>
        {uri ? <Button label="Save & share" size="md" icon="download-outline" onPress={() => sharePhoto(uri, photo.caption)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: colors.black, paddingHorizontal: 20, gap: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  control: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  print: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  away: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.card },
  panel: { backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.card, padding: 14, gap: 14 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  like: { minWidth: 64, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
});
