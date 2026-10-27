import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Divider } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import type { Member } from '@/store/types';
import { colors, line, radius } from '@/theme';

/** Multi- or single-select list of trip members: one outlined list with a square tick box on each row. */
export function MemberPickerSheet({
  visible,
  onClose,
  members,
  selected,
  onToggle,
  title = 'Assign people',
  single,
}: {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  selected: string[];
  onToggle: (id: string) => void;
  title?: string;
  single?: boolean;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={single ? 'Choose one person' : 'Tap to add or remove'}>
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {members.map((m, i) => {
          const on = selected.includes(m.id);
          return (
            <View key={m.id}>
              {i > 0 ? <Divider /> : null}
              <Press
                onPress={() => {
                  onToggle(m.id);
                  if (single) onClose();
                }}
                style={styles.row}
                scaleTo={0.99}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${m.name}, ${m.role}`}>
                <Avatar name={m.name} src={m.avatar} size={40} />
                <View style={{ flex: 1 }}>
                  <T variant="bodySm" weight="semibold">
                    {m.name}
                  </T>
                  <T variant="kicker" color={colors.textSecondary}>
                    {m.role}
                  </T>
                </View>
                <View style={[styles.box, on && { backgroundColor: colors.accent }]}>{on ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}</View>
              </Press>
            </View>
          );
        })}
      </Card>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 8 },
  box: { width: 28, height: 28, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
