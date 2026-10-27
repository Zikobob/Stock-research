import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Member, PackingItem } from '@/store/types';
import { colors, line, radius } from '@/theme';

/**
 * One thing on the packing list: a big square tick box (accent and a tick when packed), the item, who is bringing it and a remove button.
 * Every part you tap is at least 44 points.
 */
export function PackRow({ item, who, me, onToggle, onWho, onRemove }: { item: PackingItem; who?: Member; me?: string; onToggle: () => void; onWho: () => void; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <Press onPress={onToggle} style={styles.main} accessibilityRole="checkbox" accessibilityState={{ checked: item.packed }} accessibilityLabel={item.text} scaleTo={0.98}>
        <View style={[styles.box, item.packed && { backgroundColor: colors.accent }]}>{item.packed ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}</View>
        <T variant="bodySm" color={item.packed ? colors.textMuted : colors.text} style={[{ flex: 1 }, item.packed && { textDecorationLine: 'line-through' }]}>
          {item.text}
        </T>
      </Press>
      <Press onPress={onWho} style={styles.whoHit} accessibilityLabel={who ? `${item.text} is brought by ${who.name}. Change` : `Assign ${item.text}`}>
        {who ? (
          <View style={styles.who}>
            <Avatar name={who.name} src={who.avatar} size={24} />
            <T variant="caption" weight="bold" numberOfLines={1} style={{ maxWidth: 52 }}>
              {who.id === me ? 'Me' : who.name.split(' ')[0]}
            </T>
          </View>
        ) : (
          <Ionicons name="person-add-outline" size={20} color={colors.textSecondary} />
        )}
      </Press>
      <Press onPress={onRemove} style={styles.remove} accessibilityLabel={`Remove ${item.text}`}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingLeft: 12 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6 },
  box: { width: 28, height: 28, borderRadius: radius.xs + 2, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  whoHit: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 4 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
