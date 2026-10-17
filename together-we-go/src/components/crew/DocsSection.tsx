import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Card, Pill, SectionHeader } from '@/components/ui/bits';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

/** A short list of the trip's documents, with a button to open the full vault. */
export function DocsSection({ trip }: { trip: Trip }) {
  const t = useT();
  return (
    <>
      <SectionHeader title={t('hub.documents')} action="Open vault" onAction={() => router.push('/documents')} style={{ marginTop: 26, marginBottom: 2 }} />
      <T variant="caption" color={colors.textSecondary} style={{ marginBottom: 10 }}>
        {t('hub.documentsSub')}
      </T>
      {trip.docs.length ? (
        <Card padded={false}>
          {trip.docs.slice(0, 4).map((d, i) => (
            <Press key={d.id} onPress={() => router.push({ pathname: '/documents', params: { open: d.id } })} style={[styles.doc, i > 0 && styles.line]} scaleTo={0.99}>
              <View style={styles.docIcon}>
                <Ionicons name={d.kind === 'image' ? 'image-outline' : d.kind === 'note' ? 'document-text-outline' : 'document-outline'} size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="small" weight="bold" numberOfLines={1}>
                  {d.name}
                </T>
                <T variant="caption" color={colors.textMuted}>
                  {d.kind === 'note' ? 'Note' : d.kind.toUpperCase()}
                </T>
              </View>
              {d.offline ? <Pill label={t('hub.offline')} icon="cloud-done-outline" tone="gray" /> : null}
            </Press>
          ))}
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  docIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
