import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Pill } from '@/components/ui/bits';
import { sizeLabel } from '@/services/files';
import type { Trip, TripDoc } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors, radius } from '@/theme';
import { timeAgo } from '@/utils/format';

const ICON = { image: 'image-outline', note: 'document-text-outline', pdf: 'document-outline', file: 'attach-outline' } as const;

/** One line in the document vault. The pill says whether the file can be opened with no connection. */
export function DocRow({ doc, trip, onPress }: { doc: TripDoc; trip: Trip; onPress: () => void }) {
  const { uri, loading } = useSharedFile(doc.uri, doc.blob);
  const adder = trip.members.find((m) => m.id === doc.addedBy)?.name.split(' ')[0];
  return (
    <Press onPress={onPress} style={styles.row} scaleTo={0.99} accessibilityLabel={`Open ${doc.name}`}>
      <View style={styles.icon}>
        <Ionicons name={ICON[doc.kind]} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="small" weight="semibold" numberOfLines={1}>
          {doc.name}
        </T>
        <T variant="caption" color={colors.textMuted}>
          {doc.kind === 'note' ? 'Note' : doc.kind.toUpperCase()} {doc.size ? `· ${sizeLabel(doc.size)}` : ''} · {timeAgo(doc.addedAt)} · {adder}
        </T>
      </View>
      {doc.kind === 'note' || uri ? <Pill label="Offline" icon="cloud-done-outline" /> : loading ? <Pill label="Downloading" icon="cloud-download-outline" tone="blue" /> : <Pill label={`On ${adder ?? 'a friend'}’s phone`} icon="phone-portrait-outline" tone="gray" />}
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
