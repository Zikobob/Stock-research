import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { groupByDay } from '@/components/more/groups';
import { Button } from '@/components/ui/Button';
import { EmptyState, SectionHeader, type IconName } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { sendTestReminder } from '@/services/notifications';
import type { AppNotification } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, hair, line, radius, space } from '@/theme';
import { timeAgo } from '@/utils/format';

/** One line icon per kind of notification. Colour is kept for states, so every kind is ink; unread is the one that is lit. */
const ICONS: Record<AppNotification['kind'], IconName> = {
  reminder: 'alarm-outline',
  chat: 'chatbubble-ellipses-outline',
  vote: 'stats-chart-outline',
  expense: 'wallet-outline',
  system: 'information-circle-outline',
  member: 'person-add-outline',
  photo: 'images-outline',
};

function testReminder() {
  sendTestReminder(5);
  toast('Test reminder scheduled. Lock your phone to see it arrive', { icon: 'alarm-outline' });
}

/** Reminders, votes and chat mentions, grouped Today and Earlier. Unread ones have an accent icon. */
export default function Notifications() {
  const list = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const clear = useAppStore((s) => s.clearNotifications);
  const setActive = useAppStore((s) => s.setActiveTrip);

  // Mark everything read when leaving the screen.
  useEffect(() => () => markAllRead(), [markAllRead]);

  const unread = list.filter((n) => !n.read).length;
  const groups = groupByDay(list);

  return (
    <Screen header={<Header kicker="TogetherWeGo" title="Notifications" subtitle={unread ? `${unread} unread` : 'Nothing new'} backLabel="Home" />}>
      {list.length ? (
        <>
          <View style={styles.bar}>
            <T variant="kicker" color={colors.textSecondary} style={{ flex: 1 }}>
              {list.length} {list.length === 1 ? 'notification' : 'notifications'}
            </T>
            <Button
              label="Mark all read"
              icon="checkmark-done-outline"
              size="sm"
              variant="secondary"
              full={false}
              disabled={!unread}
              onPress={() => {
                markAllRead();
                toast('All marked as read', { icon: 'checkmark-done-outline' });
              }}
            />
          </View>

          {groups.map((g) => (
            <View key={g.label} style={{ marginTop: space.xl }}>
              <SectionHeader title={g.label} />
              {g.items.map((n, i) => (
                <Press
                  key={n.id}
                  onPress={() => {
                    if (n.tripId) setActive(n.tripId);
                    if (n.route) router.push((n.route === '/(tabs)/profile' ? '/crew' : n.route) as Href);
                  }}
                  style={[styles.item, i === 0 && styles.first]}
                  scaleTo={0.99}
                  accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}>
                  <View style={[styles.icon, !n.read && { backgroundColor: colors.accent }]}>
                    <Ionicons name={ICONS[n.kind]} size={20} color={n.read ? colors.ink : colors.onAccent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodySm" weight={n.read ? 'semibold' : 'bold'}>
                      {n.title}
                    </T>
                    <T variant="small" color={colors.textSecondary}>
                      {n.body}
                    </T>
                    <T variant="kicker" color={colors.textSecondary} style={{ marginTop: 2 }}>
                      {timeAgo(n.ts)}
                    </T>
                  </View>
                </Press>
              ))}
            </View>
          ))}

          <View style={styles.foot}>
            <Button label="Send a test reminder (5 sec)" icon="alarm-outline" variant="secondary" size="md" onPress={testReminder} />
            <Button
              label="Clear all notifications"
              icon="trash-outline"
              variant="danger"
              size="md"
              onPress={() => confirmAction('Clear all notifications?', 'This removes every notification from this list.', clear, { confirmLabel: 'Clear all', destructive: true })}
            />
          </View>
        </>
      ) : (
        <EmptyState icon="notifications-off-outline" title="You’re all caught up" body="Reminders, votes and chat mentions will show up here.">
          <Button label="Send a test reminder (5 sec)" icon="alarm-outline" variant="secondary" onPress={testReminder} />
        </EmptyState>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, minHeight: 64, borderTopWidth: hair, borderTopColor: colors.border },
  first: { borderTopWidth: 0 },
  icon: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  foot: { gap: space.xxxl, marginTop: space.section },
});
