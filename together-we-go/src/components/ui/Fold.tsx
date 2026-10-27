import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, line, radius } from '@/theme';

import { Card, type IconName } from './bits';
import { Press } from './Press';
import { T } from './T';

/**
 * Something most people never need, folded away under one line so the page stays short.
 * The cards inside bring their own top spacing.
 */
export function Fold({ title, summary, icon, label = title, children }: { title: string; summary: string; icon: IconName; /** What a screen reader says for the button. */ label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 14 }}>
      <Card padded={false}>
        <Press onPress={() => setOpen((o) => !o)} style={styles.head} scaleTo={0.99} accessibilityLabel={label} accessibilityState={{ expanded: open }}>
          <View style={styles.icon}>
            <Ionicons name={icon} size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="title" weight="bold">
              {title}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {summary}
            </T>
          </View>
          <Ionicons name={open ? 'remove' : 'add'} size={22} color={colors.ink} />
        </Press>
      </Card>
      {open ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64 },
  icon: { width: 38, height: 38, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
