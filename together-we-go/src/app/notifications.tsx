import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, type IconName } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { sendTestReminder } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { AppNotification } from '@/store/types';
import { colors, radius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { toast } from '@/components/ui/feedback';

const ICONS: Record<AppNotification['kind'], { icon: IconName; color: string }> = {
  reminder: { icon: 'alarm-outline', color: colors.orange },
  chat: { icon: 'chatbubble-ellipses-outline', color: colors.blue },
  vote: { icon: 'stats-chart-outline', color: colors.purple },
  expense: { icon: 'wallet-outline', color: colors.primary },
  system: { icon: 'information-circle-outline', color: colors.textSecondary },
  member: { icon: 'person-add-outline', color: colors.teal },
};

export default function Notifications() {
  const list = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const clear = useAppStore((s) => s.clearNotifications);
  const setActive = useAppStore((s) => s.setActiveTrip);

  // Mark everything read when leaving the screen.
  useEffect(() => () => markAllRead(), [markAllRead]);

  return (
    <Screen
      header={
        <Header
          title="Notifications"
          subtitle={`${list.filter((n) => !n.read).length} unread`}
          right={
            list.length ? (
              <Press onPress={clear} hitSlop={8} accessibilityLabel="Clear all notifications">
                <T variant="small" weight="semibold" color={colors.textSecondary}>
                  Clear
                </T>
              </Press>
            ) : null
          }
        />
      }>
      <Button
        label="Send a test reminder (5 sec)"
        icon="alarm-outline"
        variant="soft"
        onPress={() => {
          sendTestReminder(5);
          toast('Test reminder scheduled — lock your phone to see it arrive', { icon: 'alarm-outline' });
        }}
      />
      <View style={{ gap: 8, marginTop: 14 }}>
        {list.length ? (
          list.map((n) => {
            const meta = ICONS[n.kind];
            return (
              <Press
                key={n.id}
                onPress={() => {
                  if (n.tripId) setActive(n.tripId);
                  if (n.route) router.push(n.route as Href);
                }}
                style={[styles.item, !n.read && styles.unread]}
                accessibilityLabel={`${n.title}. ${n.body}`}>
                <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="small" weight="semibold">
                    {n.title}
                  </T>
                  <T variant="caption" color={colors.textSecondary}>
                    {n.body}
                  </T>
                  <T variant="micro" color={colors.textMuted} style={{ marginTop: 3 }}>
                    {timeAgo(n.ts)}
                  </T>
                </View>
                {!n.read ? <View style={styles.dot} /> : null}
              </Press>
            );
          })
        ) : (
          <EmptyState icon="notifications-off-outline" title="You’re all caught up" body="Reminders, votes and chat mentions will show up here." />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: colors.primarySofter, borderColor: colors.primaryLine },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
});
