import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SyncBadge } from '@/components/sync/SyncBadge';
import { IconButton } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Header } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

export type ChatTab = 'crew' | 'ai';
const TABS = [
  { key: 'crew' as const, label: 'Crew' },
  { key: 'ai' as const, label: 'Scout AI' },
];

/** Trip name and the head count in small print, "Trip chat" as the title, the Crew / Scout AI switch, whether the trip is live-synced, and (in Scout AI) which brain answers. */
export function ChatHeader({ trip, tab, onTab, synced, aiMode }: { trip: Trip; tab: ChatTab; onTab: (t: ChatTab) => void; synced: boolean; aiMode: 'offline' | 'claude' }) {
  const t = useT();
  return (
    <View>
      <Header back={false} kicker={`${trip.name} · ${t('chat.kicker', { n: trip.members.length })}`} title={t('chat.title')} right={<IconButton icon="images-outline" label="Photo dump" onPress={() => router.push('/photos')} />} />
      <View style={styles.controls}>
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
          <Press onPress={() => router.push('/settings')} style={styles.mode} accessibilityLabel="Assistant settings" scaleTo={0.99}>
            <Ionicons name={aiMode === 'claude' ? 'cloud-outline' : 'cloud-offline-outline'} size={16} color={colors.ink} />
            <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
              {aiMode === 'claude' ? 'Answers by Claude' : 'Answers from your trip data'}
            </T>
            <T variant="kicker" color={colors.ink}>
              Change
            </T>
            <Ionicons name="arrow-forward" size={14} color={colors.ink} />
          </Press>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 20, gap: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
