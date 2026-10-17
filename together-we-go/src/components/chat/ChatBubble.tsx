import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';
import type { ChatMessage, Trip } from '@/store/types';
import { colors, shadow } from '@/theme';

const AVATAR_COLORS = ['#E8533F', '#1E73E8', '#2FB863', '#E0A100', '#7C5CD6'];

/** One chat message: a centred note for system messages, otherwise a bubble with the sender's avatar and name. */
export function ChatBubble({ item, prev, trip, userId }: { item: ChatMessage; prev: ChatMessage | undefined; trip: Trip; userId: string }) {
  if (item.kind === 'system') {
    return (
      <View style={styles.system}>
        <T variant="caption" color={colors.textMuted} center>
          {item.text}
        </T>
      </View>
    );
  }
  const mine = item.authorId === userId;
  const grouped = !!prev && prev.kind !== 'system' && prev.authorId === item.authorId && item.ts - prev.ts < 5 * 60000;
  const m = trip.members.find((x) => x.id === item.authorId);
  const memberIndex = trip.members.findIndex((x) => x.id === item.authorId);
  const avatarBg = memberIndex >= 0 ? AVATAR_COLORS[memberIndex % AVATAR_COLORS.length] : colors.textMuted;
  const name = item.ai ? 'Scout AI' : (m?.name.split(' ')[0] ?? 'Former member');
  return (
    <View style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }, grouped && { marginTop: 2 }]}>
      {!mine ? (
        <View style={{ width: 30 }}>
          {!grouped ? (
            item.ai ? (
              <View style={[styles.avatar, { backgroundColor: colors.black }]}>
                <Ionicons name="sparkles" size={14} color={colors.white} />
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                <T variant="micro" weight="bold" color={colors.white} style={{ fontSize: 12 }}>
                  {(m?.name.trim()[0] ?? '?').toUpperCase()}
                </T>
              </View>
            )
          ) : null}
        </View>
      ) : null}
      <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {!grouped && !mine ? (
          <View style={styles.nameRow}>
            <T variant="micro" weight="semibold" color={colors.textSecondary}>
              {name}
            </T>
            {item.ai && item.aiSource === 'claude' ? (
              <T variant="micro" color={colors.purple}>
                · Claude
              </T>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.bubble, mine ? styles.mine : item.ai ? styles.ai : styles.theirs]}>
          <T variant="bodySm" color={mine ? colors.white : item.ai ? colors.onAccent : colors.text} selectable>
            {item.text}
          </T>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  system: { alignSelf: 'center', backgroundColor: colors.bgAlt, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginVertical: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  nameRow: { flexDirection: 'row', gap: 3, marginBottom: 3, marginHorizontal: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20 },
  mine: { backgroundColor: colors.blue },
  theirs: { backgroundColor: colors.card, ...shadow },
  ai: { backgroundColor: colors.accentSoft, ...shadow },
});
