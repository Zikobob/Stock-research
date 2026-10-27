import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { ROLE_OPTIONS, roleDescriptions, type Role } from '@/data/reference';
import type { Member } from '@/store/types';
import { colors, line, radius } from '@/theme';

/** Pick a role for a member (or remove them from the trip, if you are the organizer). The chosen role is filled with the highlighter. */
export function RoleSheet({ member, canEdit, canRemove, onClose, onPick, onRemove }: { member: Member | null; canEdit: boolean; canRemove: boolean; onClose: () => void; onPick: (r: Role) => void; onRemove: () => void }) {
  return (
    <Sheet visible={!!member} onClose={onClose} title={member?.name} subtitle={canEdit ? 'Choose a role for this trip' : 'Only the organizer can change other people’s roles'}>
      <View style={{ gap: 10 }}>
        {ROLE_OPTIONS.map((r) => {
          const on = member?.role === r;
          return (
            <Press
              key={r}
              disabled={!canEdit}
              onPress={() => onPick(r)}
              scaleTo={0.99}
              style={[styles.roleRow, on && { backgroundColor: colors.accent }, !canEdit && !on && { opacity: 0.6 }]}
              accessibilityLabel={r}
              accessibilityState={{ selected: on, disabled: !canEdit }}>
              <View style={{ flex: 1, gap: 1 }}>
                <T variant="title" weight="bold" color={on ? colors.onAccent : colors.text}>
                  {r}
                </T>
                <T variant="caption" color={on ? colors.onAccent : colors.textSecondary}>
                  {roleDescriptions[r]}
                </T>
              </View>
              {on ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}
            </Press>
          );
        })}
      </View>
      {canRemove ? (
        <>
          <Rule />
          <Button label="Remove from trip" variant="danger" size="md" icon="person-remove-outline" onPress={onRemove} />
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
});
