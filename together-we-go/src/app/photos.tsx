import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { PhotoTile } from '@/components/photos/PhotoTile';
import { PhotoViewer } from '@/components/photos/PhotoViewer';
import { ShareSheet } from '@/components/ShareSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Chip, EmptyState } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { destinationById } from '@/data/destinations';
import { FileTooLargeError, pickImage } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Photo } from '@/store/types';
import { MAX_WIDTH } from '@/theme';
import { todayInTz, tripDays } from '@/utils/time';
import { maxLen } from '@/utils/validation';

type Filter = 'all' | 'mine' | 'liked' | string;

export default function Photos() {
  const trip = useActiveTrip();
  const { width } = useWindowDimensions();
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
            <PhotoTile key={p.id} photo={p} size={tile} who={trip.members.find((x) => x.id === p.by)?.name.split(' ')[0] ?? 'a friend'} onPress={() => setViewing(p)} />
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
          <PhotoViewer
            photo={live}
            trip={trip}
            userId={userId}
            onClose={() => setViewing(null)}
            onShare={() => setShareFor(live)}
            onLike={() => like(trip.id, live.id)}
            onDelete={() => {
              remove(trip.id, live.id);
              setViewing(null);
            }}
          />
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
});
