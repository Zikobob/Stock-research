import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Avatar, Card, SectionHeader } from '@/components/ui/bits';
import { useT } from '@/i18n';
import type { Member, Trip } from '@/store/types';
import { colors } from '@/theme';

/** Everyone on the trip with their role. Tap a person to change their role. */
export function MembersSection({ trip, userId, onPick, onAdd }: { trip: Trip; userId: string; onPick: (m: Member) => void; onAdd: () => void }) {
  const t = useT();
  return (
    <>
      <SectionHeader title={t('hub.members')} action="+ Add" onAction={onAdd} style={{ marginTop: 26 }} />
      <Card padded={false}>
        {trip.members.map((m, i) => (
          <Press key={m.id} onPress={() => onPick(m)} style={[styles.member, i > 0 && styles.line]} scaleTo={0.99} accessibilityLabel={`${m.name}, ${m.role}. Tap to change role`}>
            <Avatar name={m.name} src={m.avatar} size={40} />
            <View style={{ flex: 1 }}>
              <T variant="title" weight="bold" numberOfLines={1}>
                {m.name}
                {m.id === userId ? ' (you)' : ''}
                {m.id === trip.ownerId ? ' 👑' : ''}
              </T>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {m.invited ? 'Invited · hasn’t joined yet' : m.homeCity ? `From ${m.homeCity}` : 'Member'}
              </T>
            </View>
            <View style={styles.rolePill}>
              <T variant="micro" weight="bold" color={colors.onAccent}>
                {m.role}
              </T>
            </View>
          </Press>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accent },
});
