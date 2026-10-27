import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Avatar, Card, Divider, SectionHeader } from '@/components/ui/bits';
import { useT } from '@/i18n';
import type { Member, Trip } from '@/store/types';
import { colors } from '@/theme';

/**
 * Everyone on the trip, like the passenger list of a flight: a face, a name, a role in small print and a stamp that says
 * GOING or, for someone added by name who has not joined yet, INVITED. Tap a person to change their role.
 * The green dot on a face means "here now"; the app only knows that about you.
 */
export function MembersSection({ trip, userId, onPick, onAdd }: { trip: Trip; userId: string; onPick: (m: Member) => void; onAdd: () => void }) {
  const t = useT();
  return (
    <View>
      <SectionHeader title={t('hub.members')} action="+ Add" onAction={onAdd} />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {trip.members.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <Press onPress={() => onPick(m)} style={styles.member} scaleTo={0.99} accessibilityLabel={`${m.name}, ${m.role}. Tap to change role`}>
              <Avatar name={m.name} src={m.avatar} size={44} dot={m.id === userId ? colors.positive : undefined} />
              <View style={styles.who}>
                <T variant="title" weight="bold" numberOfLines={2}>
                  {m.name}
                  {m.id === userId ? ' (you)' : ''}
                </T>
                <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
                  {m.role}
                </T>
                {m.invited || m.homeCity ? (
                  <T variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {m.invited ? 'Hasn’t joined yet' : `From ${m.homeCity}`}
                  </T>
                ) : null}
              </View>
              {m.invited ? <Stamp label="Invited" tone="warn" rotate={0} /> : <Stamp label="Going" tone="positive" rotate={0} />}
            </Press>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 68 },
  who: { flex: 1, gap: 1 },
});
