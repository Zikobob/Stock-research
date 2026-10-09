import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareSheet } from '@/components/ShareSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Chip, EmptyState } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import { destinationById } from '@/data/destinations';
import { FileTooLargeError, deleteLocalFile, pickImage } from '@/services/files';
import { sharePhoto } from '@/services/share';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Photo } from '@/store/types';
import { MAX_WIDTH, colors } from '@/theme';
import { timeAgo } from '@/utils/format';
import { dayLabel, todayInTz, tripDays } from '@/utils/time';
import { maxLen } from '@/utils/validation';

type Filter = 'all' | 'mine' | 'liked' | string;

export default function Photos() {
  const trip = useActiveTrip();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addPhoto = useAppStore((s) => s.addPhoto);
  const like = useAppStore((s) => s.toggleLikePhoto);
  const remove = useAppStore((s) => s.deletePhoto);
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [captionErr, setCaptionErr] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<Photo | null>(null);

  const list = useMemo(() => {
    if (!trip) return [];
    const p = trip.photos.slice();
    if (filter === 'mine') return p.filter((x) => x.by === userId);
    if (filter === 'liked') return p.sort((a, b) => b.likes.length - a.likes.length);
    if (filter !== 'all') return p.filter((x) => x.day === filter);
    return p;
  }, [trip, filter, userId]);

  if (!trip) return <NoTrip />;
  const colW = Math.min(width, MAX_WIDTH) - 40;
  const tile = (colW - 8) / 3;
  const live = viewing ? trip.photos.find((p) => p.id === viewing.id) ?? null : null;
  const days = tripDays(trip.startDate, trip.endDate);

  const add = async (camera: boolean) => {
    try {
      const f = await pickImage(camera);
      if (f) {
        setPending(f.uri);
        setCaption('');
      }
    } catch (e) {
      toast(e instanceof FileTooLargeError ? e.message : e instanceof Error ? e.message : 'Couldn’t open photos', { tone: 'warn' });
    }
  };

  const today = todayInTz(destinationById(trip.destinationId)?.tz ?? 'UTC');

  return (
    <Screen header={<Header title="Photo dump" subtitle={`${trip.photos.length} photos · ${trip.name}`} />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Add photos" icon="images-outline" size="md" onPress={() => add(false)} style={{ flex: 1 }} />
        {Platform.OS !== 'web' ? <Button label="Camera" icon="camera-outline" size="md" variant="secondary" onPress={() => add(true)} style={{ flex: 1 }} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginVertical: 14 }}>
        <Chip small label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip small label="❤️ Most liked" active={filter === 'liked'} onPress={() => setFilter('liked')} />
        <Chip small label="Mine" active={filter === 'mine'} onPress={() => setFilter('mine')} />
        {days.map((d, i) => (
          <Chip key={d} small label={`Day ${i + 1}`} active={filter === d} onPress={() => setFilter(d)} />
        ))}
      </ScrollView>
      {list.length ? (
        <View style={styles.grid}>
          {list.map((p) => (
            <Press key={p.id} onPress={() => setViewing(p)} style={{ width: tile, height: tile }} scaleTo={0.96} accessibilityLabel={p.caption || 'Photo'}>
              <Image source={imageSource(p.uri)} style={styles.img} contentFit="cover" transition={150} />
              {p.likes.length ? (
                <View style={styles.likes}>
                  <Ionicons name="heart" size={10} color={colors.white} />
                  <T variant="micro" color={colors.white}>
                    {p.likes.length}
                  </T>
                </View>
              ) : null}
            </Press>
          ))}
        </View>
      ) : (
        <EmptyState icon="images-outline" title="No photos here yet" body="Add your best shots — everyone in the trip can like and share them." />
      )}

      <Sheet
        visible={!!pending}
        onClose={() => setPending(null)}
        title="Add a caption"
        footer={
          <Button
            label="Post to photo dump"
            icon="cloud-upload-outline"
            onPress={() => {
              const e = maxLen(80, 'Caption')(caption);
              setCaptionErr(e);
              if (e || !pending) return;
              addPhoto(trip.id, { uri: pending, caption: caption.trim(), day: days.includes(today) ? today : trip.startDate });
              setPending(null);
              tap('success');
              toast('Photo added 📸');
            }}
          />
        }>
        {pending ? <Image source={{ uri: pending }} style={{ width: '100%', height: 220, borderRadius: 16 }} contentFit="cover" /> : null}
        <Input placeholder="Say something about it…" value={caption} onChangeText={setCaption} error={captionErr} maxLength={90} />
      </Sheet>

      <Modal visible={!!live} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        {live ? (
          <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.viewerTop}>
              <Press onPress={() => setViewing(null)} style={styles.round} accessibilityLabel="Close photo">
                <Ionicons name="close" size={22} color={colors.white} />
              </Press>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Press onPress={() => setShareFor(live)} style={styles.round} accessibilityLabel="Share photo to social media">
                  <Ionicons name="share-social-outline" size={20} color={colors.white} />
                </Press>
                {live.by === userId ? (
                  <Press
                    onPress={() =>
                      confirmAction('Delete photo?', 'It will be removed from the photo dump for everyone.', () => {
                        deleteLocalFile(live.uri);
                        remove(trip.id, live.id);
                        setViewing(null);
                      }, { destructive: true, confirmLabel: 'Delete' })
                    }
                    style={styles.round}
                    accessibilityLabel="Delete photo">
                    <Ionicons name="trash-outline" size={20} color={colors.white} />
                  </Press>
                ) : null}
              </View>
            </View>
            <Image source={imageSource(live.uri)} style={{ flex: 1, width: '100%' }} contentFit="contain" />
            <View style={styles.viewerBottom}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {(() => {
                  const m = trip.members.find((x) => x.id === live.by);
                  return <Avatar name={m?.name ?? '?'} src={m?.avatar} size={32} />;
                })()}
                <View style={{ flex: 1 }}>
                  <T variant="small" weight="semibold" color={colors.white}>
                    {live.caption || 'Untitled'}
                  </T>
                  <T variant="caption" color="rgba(255,255,255,0.7)">
                    {trip.members.find((x) => x.id === live.by)?.name.split(' ')[0]} · {live.day ? dayLabel(live.day) : ''} · {timeAgo(live.ts)}
                  </T>
                </View>
                <Press onPress={() => like(trip.id, live.id)} style={styles.likeBtn} accessibilityLabel={live.likes.includes(userId) ? 'Unlike' : 'Like'}>
                  <Ionicons name={live.likes.includes(userId) ? 'heart' : 'heart-outline'} size={22} color={live.likes.includes(userId) ? '#FF6B81' : colors.white} />
                  <T variant="small" weight="semibold" color={colors.white}>
                    {live.likes.length}
                  </T>
                </Press>
              </View>
              <Button label="Save & share" variant="light" size="md" icon="download-outline" onPress={() => sharePhoto(live.uri, live.caption)} />
            </View>
          </View>
        ) : null}
        <ShareSheet
          visible={!!shareFor}
          onClose={() => setShareFor(null)}
          title="Share this memory"
          message={`${shareFor?.caption ?? ''} 📸 from our trip “${trip.name}” — planned with TogetherWeGo`}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  img: { width: '100%', height: '100%', borderRadius: 8 },
  likes: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 999 },
  viewer: { flex: 1, backgroundColor: '#0B0F0A' },
  viewerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  viewerBottom: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
});
