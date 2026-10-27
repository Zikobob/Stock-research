import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';
import { Avatar } from '@/components/ui/bits';
import type { ChatMessage, Trip } from '@/store/types';
import { colors, hair, line, radius } from '@/theme';

import { clock, continues, dayHeading, endsRun, startsDay, systemLine } from './logic';

/** A thin line with a few words in the middle: a new day, or something that happened (Sam joined the trip). */
function Quiet({ children, strong }: { children: string; strong?: boolean }) {
  return (
    <View style={styles.quiet}>
      <View style={styles.hair} />
      <T variant="kicker" color={strong ? colors.ink : colors.textSecondary} center style={{ flexShrink: 1 }}>
        {children}
      </T>
      <View style={styles.hair} />
    </View>
  );
}

/**
 * One message. Yours are filled with ink, the others sit on paper in an outline, and each has one sharp corner where it points at
 * whoever said it. The name goes on the first bubble of a run, the face and the clock time on the last.
 */
export function ChatBubble({ item, prev, next, trip, userId }: { item: ChatMessage; prev: ChatMessage | undefined; next?: ChatMessage; trip: Trip; userId: string }) {
  const day = startsDay(item, prev) ? <Quiet strong>{dayHeading(item.ts)}</Quiet> : null;
  if (item.kind === 'system') {
    return (
      <>
        {day}
        <Quiet>{systemLine(item.text)}</Quiet>
      </>
    );
  }
  const mine = item.authorId === userId;
  const joined = continues(item, prev);
  const last = endsRun(item, next);
  const m = trip.members.find((x) => x.id === item.authorId);
  const name = item.ai ? 'Scout AI' : (m?.name.split(' ')[0] ?? 'Former member');
  const corner = Math.min(4, radius.card);
  return (
    <>
      {day}
      <View style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }, joined && { marginTop: 4 }]}>
        {!mine ? (
          <View style={{ width: 30 }}>
            {last ? (
              item.ai ? (
                <View style={styles.scout}>
                  <Ionicons name="compass-outline" size={18} color={colors.onAccent} />
                </View>
              ) : (
                <Avatar name={m?.name ?? '?'} src={m?.avatar} size={30} />
              )
            ) : null}
          </View>
        ) : null}
        <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {!joined && !mine ? (
            <View style={styles.nameRow}>
              <T variant="kicker" color={colors.textSecondary}>
                {name}
              </T>
              {item.ai && item.aiSource === 'claude' ? (
                <T variant="kicker" color={colors.textMuted}>
                  · Claude
                </T>
              ) : null}
            </View>
          ) : null}
          <View style={[styles.bubble, mine ? styles.mine : item.ai ? styles.ai : styles.theirs, mine ? { borderBottomRightRadius: corner } : { borderBottomLeftRadius: corner }]}>
            <T variant="bodySm" color={mine ? colors.onPrimary : colors.text} selectable>
              {item.text}
            </T>
          </View>
          {last ? (
            <T variant="kicker" color={colors.textMuted} style={styles.clock}>
              {clock(item.ts)}
            </T>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  quiet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  hair: { flex: 1, height: hair, backgroundColor: colors.borderStrong },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 },
  nameRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  scout: { width: 30, height: 30, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, borderWidth: line },
  mine: { backgroundColor: colors.primary, borderColor: colors.ink },
  theirs: { backgroundColor: colors.card, borderColor: colors.ink },
  ai: { backgroundColor: colors.accentSoft, borderColor: colors.ink },
  clock: { fontSize: 10, lineHeight: 14, marginTop: 4, letterSpacing: 0.6 },
});
