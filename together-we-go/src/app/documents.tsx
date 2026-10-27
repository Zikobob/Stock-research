import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocFileBody } from '@/components/documents/DocFileBody';
import { DocRow, DOC_ICON, docKind } from '@/components/documents/DocRow';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Card, Divider, EmptyState, type IconName } from '@/components/ui/bits';
import { Fab } from '@/components/ui/Fab';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { PlatePress } from '@/components/ui/Plate';
import { tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { useDraft } from '@/hooks/useDraft';
import { FileTooLargeError, deleteLocalFile, pickDocument, pickImage, sizeLabel } from '@/services/files';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { TripDoc } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { firstError, maxLen, required } from '@/utils/validation';

/** What can go in the vault, as the three big rows of the Add sheet. The label is the button's name. */
const KINDS: { key: 'file' | 'photo' | 'note'; label: string; sub: string; icon: IconName }[] = [
  { key: 'file', label: 'File', sub: 'A PDF, ticket or booking', icon: DOC_ICON.pdf },
  { key: 'photo', label: 'Photo', sub: 'A picture of a passport or card', icon: DOC_ICON.image },
  { key: 'note', label: 'Note', sub: 'Addresses, booking refs, allergy cards', icon: DOC_ICON.note },
];

/** Offline document vault: tickets, bookings, passport copies and notes. */
export default function Documents() {
  const params = useLocalSearchParams<{ open?: string }>();
  const trip = useActiveTrip();
  const insets = useSafeAreaInsets();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addDoc = useAppStore((s) => s.addDoc);
  const deleteDoc = useAppStore((s) => s.deleteDoc);
  const [open, setOpen] = useState<TripDoc | null>(() => (params.open ? trip?.docs.find((d) => d.id === params.open) ?? null : null));
  const [adding, setAdding] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote, clearNote] = useDraft('doc-note', { name: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  if (!trip) return <NoTrip />;

  const upload = async (kind: 'file' | 'photo') => {
    setAdding(false);
    try {
      const f = kind === 'photo' ? await pickImage() : await pickDocument();
      if (!f) return;
      addDoc(trip.id, { name: f.name.replace(/\.[^.]+$/, ''), kind: f.kind, uri: f.uri, size: f.size, offline: true });
      tap('success');
      toast('Saved to the vault, available offline');
    } catch (e) {
      toast(e instanceof FileTooLargeError ? e.message : 'Couldn’t save that file', { tone: 'warn' });
    }
  };

  const choose = (k: 'file' | 'photo' | 'note') => {
    if (k === 'note') {
      setAdding(false);
      setNoteOpen(true);
    } else upload(k);
  };

  const openFile = async (uri: string, title: string) => {
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { dialogTitle: title });
      else await Linking.openURL(uri);
    } catch {
      toast('No app available to open this file', { tone: 'warn' });
    }
  };

  const used = trip.docs.reduce((n, d) => n + (d.size ?? (d.note?.length ?? 0)), 0);
  const empty = trip.docs.length === 0;

  return (
    <Screen
      header={<Header title="Documents" subtitle={`${trip.docs.length} items · all available offline`} />}
      fab={empty ? undefined : <Fab icon="add" label="Add" accessibilityLabel="Add a document" onPress={() => setAdding(true)} />}
      fabBottom={insets.bottom + 16}>
      {empty ? (
        <EmptyState icon="folder-open-outline" title="No documents yet" body="Add tickets, bookings and passport copies so they’re always on hand, even with no signal.">
          <Button label="Add a document" icon="add" onPress={() => setAdding(true)} />
        </EmptyState>
      ) : (
        <>
          <View style={styles.offline} accessible accessibilityLabel={`Works without wifi or data. ${sizeLabel(used) || '0 KB'} used on this phone`}>
            <Ionicons name="cloud-done-outline" size={22} color={colors.ink} />
            <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }} importantForAccessibility="no">
              Works without wifi / {sizeLabel(used) || '0 KB'} used
            </T>
          </View>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {trip.docs.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <Divider /> : null}
                <DocRow doc={d} trip={trip} onPress={() => setOpen(d)} />
              </View>
            ))}
          </Card>
        </>
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add to the vault" subtitle="Saved on this phone, so it opens with no signal">
        <View style={{ gap: 14, paddingBottom: 8 }}>
          {KINDS.map((k) => (
            <PlatePress key={k.key} onPress={() => choose(k.key)} accessibilityLabel={k.label} offset={3} corner={radius.button} style={styles.kind}>
              <View style={styles.kindIcon}>
                <Ionicons name={k.icon} size={22} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="title" weight="bold">
                  {k.label}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  {k.sub}
                </T>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.ink} />
            </PlatePress>
          ))}
        </View>
      </Sheet>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.name} subtitle={open ? `${docKind(open)} · added ${timeAgo(open.addedAt)}` : undefined}>
        {open?.kind === 'note' ? (
          <View style={styles.note}>
            <T variant="bodySm" selectable>
              {open.note}
            </T>
          </View>
        ) : null}
        {open ? <DocFileBody doc={open} adderName={trip.members.find((m) => m.id === open.addedBy)?.name.split(' ')[0] ?? 'a friend'} onOpen={(uri) => openFile(uri, open.name)} /> : null}
        {open && (open.addedBy === userId || trip.ownerId === userId) ? (
          <View style={{ marginTop: 16 }}>
            <Button
              label="Delete"
              variant="danger"
              size="md"
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
          </View>
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
              const e = { name: firstError(note.name, required('a title'), maxLen(40, 'Title')), note: firstError(note.note, required('some text'), maxLen(2000, 'Note')) };
              setErrors(e);
              if (e.name || e.note) return tap('warning');
              addDoc(trip.id, { name: note.name.trim(), kind: 'note', note: note.note.trim(), offline: true });
              clearNote();
              setNoteOpen(false);
              toast('Note saved offline');
            }}
          />
        }>
        <Input label="Title" value={note.name} onChangeText={(v) => setNote({ ...note, name: v })} error={errors.name} placeholder="e.g. Hotel address in Japanese" />
        <Input label="Note" value={note.note} onChangeText={(v) => setNote({ ...note, note: v })} error={errors.note} multiline placeholder="Write anything you’ll need offline…" style={{ minHeight: 140 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, minHeight: 28 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
  kindIcon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  note: { backgroundColor: colors.bgAlt, padding: 14, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink },
});
