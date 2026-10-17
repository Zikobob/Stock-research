import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import type { Member } from '@/store/types';
import { colors, radius } from '@/theme';

/** Multi- or single-select list of trip members. */
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
      {members.map((m) => {
        const on = selected.includes(m.id);
        return (
          <Press
            key={m.id}
            onPress={() => {
              onToggle(m.id);
              if (single) onClose();
            }}
            style={[styles.row, on && styles.rowOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}>
            <Avatar name={m.name} src={m.avatar} size={36} />
            <View style={{ flex: 1 }}>
              <T variant="bodySm" weight="semibold">
                {m.name}
              </T>
              <T variant="caption" color={colors.textSecondary}>
                {m.role}
              </T>
            </View>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.borderStrong} />
          </Press>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  rowOn: { borderColor: colors.primaryLine, backgroundColor: colors.primarySofter },
});
