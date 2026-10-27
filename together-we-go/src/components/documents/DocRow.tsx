import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { sizeLabel } from '@/services/files';
import type { Trip, TripDoc } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors, line, radius } from '@/theme';
import { timeAgo } from '@/utils/format';

/** One line icon for each kind of file, so the vault reads at a glance. */
export const DOC_ICON = { image: 'image-outline', note: 'create-outline', pdf: 'document-text-outline', file: 'attach-outline' } as const;
export const docKind = (d: Pick<TripDoc, 'kind'>) => (d.kind === 'note' ? 'Note' : d.kind.toUpperCase());

/** One line in the document vault. The stamp says whether the file can be opened with no connection. */
export function DocRow({ doc, trip, onPress }: { doc: TripDoc; trip: Trip; onPress: () => void }) {
  const { uri, loading } = useSharedFile(doc.uri, doc.blob);
  const adder = trip.members.find((m) => m.id === doc.addedBy)?.name.split(' ')[0];
  return (
    <Press onPress={onPress} style={styles.row} scaleTo={0.99} accessibilityLabel={`Open ${doc.name}`}>
      <View style={styles.icon}>
        <Ionicons name={DOC_ICON[doc.kind]} size={22} color={colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T variant="title" weight="bold" numberOfLines={1}>
          {doc.name}
        </T>
        <View style={styles.meta}>
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
            {docKind(doc)}
            {doc.size ? ` / ${sizeLabel(doc.size)}` : ''} / {timeAgo(doc.addedAt)}
            {adder ? ` / ${adder}` : ''}
          </T>
          {doc.kind === 'note' || uri ? (
            <Stamp label="Offline" tone="positive" rotate={0} />
          ) : loading ? (
            <Stamp label="Downloading" tone="muted" rotate={0} />
          ) : (
            <Stamp label={`On ${adder ?? 'a friend'}’s phone`} tone="warn" rotate={0} />
          )}
        </View>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 12, paddingVertical: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
