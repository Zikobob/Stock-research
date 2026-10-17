import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { ROLE_OPTIONS, roleDescriptions, type Role } from '@/data/reference';
import type { Member } from '@/store/types';
import { colors, radius } from '@/theme';

/** Pick a role for a member (or remove them from the trip, if you are the organizer). */
export function RoleSheet({ member, canEdit, canRemove, onClose, onPick, onRemove }: { member: Member | null; canEdit: boolean; canRemove: boolean; onClose: () => void; onPick: (r: Role) => void; onRemove: () => void }) {
  return (
    <Sheet visible={!!member} onClose={onClose} title={member?.name} subtitle={canEdit ? 'Choose a role for this trip' : 'Only the organizer can change other people’s roles'}>
      {ROLE_OPTIONS.map((r) => (
        <Press key={r} disabled={!canEdit} onPress={() => onPick(r)} style={[styles.roleRow, member?.role === r && styles.optionOn, !canEdit && { opacity: 0.6 }]} accessibilityState={{ selected: member?.role === r }}>
          <View style={{ flex: 1 }}>
            <T variant="small" weight="semibold">
              {r}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {roleDescriptions[r]}
            </T>
          </View>
          {member?.role === r ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
        </Press>
      ))}
      {canRemove ? <Button label="Remove from trip" variant="danger" icon="person-remove-outline" onPress={onRemove} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  optionOn: { borderColor: colors.primaryLine, backgroundColor: colors.primarySofter },
});
