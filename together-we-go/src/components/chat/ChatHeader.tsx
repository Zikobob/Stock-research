import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SyncBadge } from '@/components/sync/SyncBadge';
import { IconButton } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

export type ChatTab = 'crew' | 'ai';
const TABS = [
  { key: 'crew' as const, label: 'Crew' },
  { key: 'ai' as const, label: 'Scout AI' },
];

/** Trip name, the Crew / Scout AI switch, whether the trip is live-synced, and (in Scout AI) which brain answers. */
export function ChatHeader({ trip, tab, onTab, synced, aiMode }: { trip: Trip; tab: ChatTab; onTab: (t: ChatTab) => void; synced: boolean; aiMode: 'offline' | 'claude' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.titleRow}>
        <T variant="display" numberOfLines={1} style={{ flex: 1 }}>
          {trip.name}
        </T>
        <IconButton icon="images-outline" label="Photo dump" onPress={() => router.push('/photos')} />
      </View>
      <Segmented options={TABS} value={tab} onChange={onTab} />
      {synced ? (
        <View style={styles.syncRow}>
          <SyncBadge tripId={trip.id} />
          <T variant="micro" color={colors.textSecondary}>
            Shared with your group
          </T>
        </View>
      ) : null}
      {tab === 'ai' ? (
        <Press onPress={() => router.push('/settings')} style={styles.modePill} accessibilityLabel="Assistant settings">
          <Ionicons name={aiMode === 'claude' ? 'sparkles' : 'cloud-offline-outline'} size={12} color={colors.text} />
          <T variant="micro" weight="semibold" color={colors.text}>
            {aiMode === 'claude' ? 'Answers by Claude · change in Settings' : 'Answers offline from your trip data · change in Settings'}
          </T>
        </Press>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bgAlt },
});
