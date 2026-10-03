import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { IconName } from './ui/bits';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';
import { colors, radius } from '@/theme';

export const toolGroups: { title: string; items: { icon: IconName; label: string; href: Href; color: string }[] }[] = [
  {
    title: 'Plan',
    items: [
      { icon: 'map-outline', label: 'Trip map', href: '/map', color: '#2A9D8F' },
      { icon: 'navigate-outline', label: 'Nearby', href: '/nearby', color: '#1F4D25' },
      { icon: 'airplane-outline', label: 'Flights', href: '/flights', color: '#3D7DD8' },
      { icon: 'partly-sunny', label: 'Weather', href: '/weather', color: '#E8A23A' },
      { icon: 'swap-horizontal', label: 'Currency', href: '/currency', color: '#7C5CD6' },
      { icon: 'list-outline', label: 'My trips', href: '/trips', color: '#5F645A' },
    ],
  },
  {
    title: 'Organize',
    items: [
      { icon: 'folder-open-outline', label: 'Documents', href: '/documents', color: '#3D7DD8' },
      { icon: 'briefcase-outline', label: 'Packing', href: '/packing', color: '#B4235A' },
      { icon: 'images-outline', label: 'Photo dump', href: '/photos', color: '#E8833A' },
      { icon: 'medkit-outline', label: 'Emergency', href: '/emergency', color: '#D64545' },
      { icon: 'locate-outline', label: 'Nearest airport', href: '/airport', color: '#2A9D8F' },
      { icon: 'language-outline', label: 'Phrasebook', href: '/phrasebook', color: '#1F4D25' },
    ],
  },
  {
    title: 'Have fun',
    items: [
      { icon: 'sparkles-outline', label: 'For you', href: '/survey', color: '#7C5CD6' },
      { icon: 'game-controller-outline', label: 'Travel quiz', href: '/quiz', color: '#E8833A' },
      { icon: 'flag-outline', label: 'Bucket list', href: '/bucket-list', color: '#1F4D25' },
      { icon: 'trophy-outline', label: 'Trip recap', href: '/recap', color: '#B7791F' },
      { icon: 'help-circle-outline', label: 'How to use', href: '/help', color: '#5F645A' },
      { icon: 'settings-outline', label: 'Settings', href: '/settings', color: '#5F645A' },
    ],
  },
];

export function ToolTile({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.tile} accessibilityLabel={label}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <T variant="micro" weight="medium" center numberOfLines={1} style={{ fontSize: 11 }}>
        {label}
      </T>
    </Press>
  );
}

/** Hamburger menu: every feature in one tidy grid. */
export function MenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Everything" subtitle="All TogetherWeGo tools in one place">
      {toolGroups.map((g) => (
        <View key={g.title} style={{ gap: 10 }}>
          <T variant="kicker" color={colors.textSecondary}>
            {g.title}
          </T>
          <View style={styles.grid}>
            {g.items.map((it) => (
              <ToolTile
                key={it.label}
                {...it}
                onPress={() => {
                  onClose();
                  setTimeout(() => router.push(it.href), 180);
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  tile: { width: '33.33%', alignItems: 'center', gap: 6 },
  tileIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
