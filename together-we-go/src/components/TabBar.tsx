import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors } from '@/theme';

import type { IconName } from './ui/bits';
import { Press } from './ui/Press';
import { T } from './ui/T';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  explore: { label: 'nav.explore', icon: 'compass-outline', active: 'compass' },
  itinerary: { label: 'nav.itinerary', icon: 'map-outline', active: 'map' },
  budget: { label: 'nav.budget', icon: 'wallet-outline', active: 'wallet' },
  chat: { label: 'nav.chat', icon: 'chatbubble-outline', active: 'chatbubble' },
  profile: { label: 'nav.profile', icon: 'person-outline', active: 'person' },
};

/** Bottom navigation matching the reference: soft-green pill behind the active tab. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const trip = useActiveTrip();
  const lastSeen = useAppStore((s) => s.notifications.filter((n) => !n.read && n.kind === 'chat').length);
  const unreadChat = trip ? lastSeen : 0;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Press
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(cfg.label)}
              style={styles.item}
              scaleTo={0.92}>
              <View style={[styles.pill, focused && styles.pillActive]}>
                <View>
                  <Ionicons name={focused ? cfg.active : cfg.icon} size={21} color={focused ? colors.primary : colors.textMuted} />
                  {route.name === 'chat' && unreadChat > 0 && !focused ? <View style={styles.dot} /> : null}
                </View>
                <T variant="micro" weight={focused ? 'semibold' : 'medium'} color={focused ? colors.primary : colors.textMuted} numberOfLines={1} style={{ fontSize: 10.5 }}>
                  {t(cfg.label)}
                </T>
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  inner: { flexDirection: 'row', width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 8, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center' },
  pill: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 10, minWidth: 58, height: 50, borderRadius: 25 },
  pillActive: { backgroundColor: colors.navActive },
  dot: { position: 'absolute', top: -1, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.white },
});
