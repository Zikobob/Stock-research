import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, Pill } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { FileTooLargeError, deleteLocalFile, pickDocument, pickImage, sizeLabel } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { TripDoc } from '@/store/types';
import { colors, radius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { firstError, maxLen, required } from '@/utils/validation';

/** Offline document vault: tickets, bookings, passport copies and notes. */
export default function Documents() {
  const params = useLocalSearchParams<{ open?: string }>();
  const trip = useActiveTrip();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addDoc = useAppStore((s) => s.addDoc);
  const deleteDoc = useAppStore((s) => s.deleteDoc);
  const [open, setOpen] = useState<TripDoc | null>(() => (params.open ? trip?.docs.find((d) => d.id === params.open) ?? null : null));
  const [noteOpen, setNoteOpen] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  if (!trip) return <NoTrip />;

  const upload = async (kind: 'file' | 'photo') => {
    try {
      const f = kind === 'photo' ? await pickImage() : await pickDocument();
      if (!f) return;
      addDoc(trip.id, { name: f.name.replace(/\.[^.]+$/, ''), kind: f.kind, uri: f.uri, size: f.size, offline: true });
      tap('success');
      toast('Saved to the vault — available offline');
    } catch (e) {
      toast(e instanceof FileTooLargeError ? e.message : 'Couldn’t save that file', { tone: 'warn' });
    }
  };

  const openFile = async (d: TripDoc) => {
    if (!d.uri) return;
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(d.uri, { dialogTitle: d.name });
      else await Linking.openURL(d.uri);
    } catch {
      toast('No app available to open this file', { tone: 'warn' });
    }
  };

  const used = trip.docs.reduce((n, d) => n + (d.size ?? (d.note?.length ?? 0)), 0);

  return (
    <Screen header={<Header title="Documents" subtitle={`${trip.docs.length} items · all available offline`} />}>
      <Card style={styles.banner}>
        <Ionicons name="cloud-done-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <T variant="small" weight="semibold">
            Works without wifi or data
          </T>
          <T variant="caption" color={colors.textSecondary}>
            Files are copied into TogetherWeGo’s private storage on this phone · {sizeLabel(used) || '0 KB'} used
          </T>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button label="File" icon="document-attach-outline" size="md" onPress={() => upload('file')} style={{ flex: 1 }} />
        <Button label="Photo" icon="image-outline" size="md" variant="secondary" onPress={() => upload('photo')} style={{ flex: 1 }} />
        <Button label="Note" icon="create-outline" size="md" variant="secondary" onPress={() => setNoteOpen(true)} style={{ flex: 1 }} />
      </View>

      <View style={{ gap: 8, marginTop: 16 }}>
        {trip.docs.length ? (
          trip.docs.map((d) => (
            <Press key={d.id} onPress={() => setOpen(d)} style={styles.row} scaleTo={0.99} accessibilityLabel={`Open ${d.name}`}>
              <View style={styles.icon}>
                <Ionicons name={d.kind === 'image' ? 'image-outline' : d.kind === 'note' ? 'document-text-outline' : d.kind === 'pdf' ? 'document-outline' : 'attach-outline'} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="small" weight="semibold" numberOfLines={1}>
                  {d.name}
                </T>
                <T variant="caption" color={colors.textMuted}>
                  {d.kind === 'note' ? 'Note' : d.kind.toUpperCase()} {d.size ? `· ${sizeLabel(d.size)}` : ''} · {timeAgo(d.addedAt)} · {trip.members.find((m) => m.id === d.addedBy)?.name.split(' ')[0]}
                </T>
              </View>
              <Pill label="Offline" icon="cloud-done-outline" />
            </Press>
          ))
        ) : (
          <EmptyState icon="folder-open-outline" title="No documents yet" body="Add tickets, bookings and passport copies so they’re always on hand." />
        )}
      </View>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.name} subtitle={open ? `${open.kind === 'note' ? 'Note' : open.kind.toUpperCase()} · added ${timeAgo(open.addedAt)}` : undefined}>
        {open?.kind === 'note' ? (
          <View style={styles.note}>
            <T variant="bodySm" selectable>
              {open.note}
            </T>
          </View>
        ) : null}
        {open?.kind === 'image' && open.uri ? <Image source={{ uri: open.uri }} style={{ width: '100%', height: 320, borderRadius: 14 }} contentFit="contain" /> : null}
        {open && open.kind !== 'note' && open.uri ? <Button label="Open / share file" icon="open-outline" onPress={() => openFile(open)} /> : null}
        {open && (open.addedBy === userId || trip.ownerId === userId) ? (
          <Button
            label="Delete"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              const d = open;
              setOpen(null);
              confirmAction('Delete document?', `“${d.name}” will be removed from the vault.`, () => {
                deleteLocalFile(d.uri);
                deleteDoc(trip.id, d.id);
                toast('Document deleted');
              }, { destructive: true, confirmLabel: 'Delete' });
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="New note"
        subtitle="Addresses, booking refs, allergy cards…"
        footer={
          <Button
            label="Save note"
            icon="checkmark"
            onPress={() => {
              const e = { name: firstError(name, required('a title'), maxLen(40, 'Title')), note: firstError(note, required('some text'), maxLen(2000, 'Note')) };
              setErrors(e);
              if (e.name || e.note) return tap('warning');
              addDoc(trip.id, { name: name.trim(), kind: 'note', note: note.trim(), offline: true });
              setName('');
              setNote('');
              setNoteOpen(false);
              toast('Note saved offline');
            }}
          />
        }>
        <Input label="Title" value={name} onChangeText={setName} error={errors.name} placeholder="e.g. Hotel address in Japanese" />
        <Input label="Note" value={note} onChangeText={setNote} error={errors.note} multiline placeholder="Write anything you’ll need offline…" style={{ minHeight: 140 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySofter, borderColor: colors.primaryLine },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  note: { backgroundColor: colors.cardMuted, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
});
