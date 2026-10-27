import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AvatarStack, Chip, Divider } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { FadeIn } from '@/components/ui/motion';
import { Press, tap } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, ActivityStatus, Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { weekdayShort } from '@/utils/time';

import { ActionRow, DeleteRow, actionStyles, useActivityOps, useMetaLine } from './ActivityParts';
import { typeIcon } from './meta';
import { clockParts, voteTally } from './plan';
import { VoteCard } from './VoteCard';

interface Props {
  trip: Trip;
  activity: Activity;
  onEdit: (a: Activity) => void;
  onAssign: (a: Activity) => void;
  /** 'vote' is the ballot card of the Vote tab; 'plan' is a stop on the timeline. */
  mode?: 'plan' | 'vote';
  /** The last stop of its day: the rail ends here. */
  last?: boolean;
  /** Position in the list, so only the first few rows slide in. */
  index?: number;
  /** Vote card only: this item was just locked in, so it shows a stamp slamming down. */
  justLocked?: boolean;
}

/** Only the first few rows animate in, so a long day stays light. */
const STAGGER = 6;

export function ActivityCard({ mode = 'plan', ...rest }: Props) {
  return mode === 'vote' ? <VoteCard {...rest} /> : <Stop {...rest} />;
}

/** Locked in is the normal state, so it is printed in plain ink; the exceptions (pending, voting) are the ones with colour. */
const STATUS_STAMP: Record<ActivityStatus, { label: string; tone: 'ink' | 'warn' | 'accent' }> = {
  confirmed: { label: 'Locked in', tone: 'ink' },
  pending: { label: 'Pending', tone: 'warn' },
  voting: { label: 'Voting', tone: 'accent' },
};

/**
 * One stop on the timeline: the start time in mono on the left, a rail with a square stop on it (the kind of activity as a
 * line icon), then the title, the place and the facts. Tap it for the details; the reminder bell is its own button beside it.
 */
function Stop({ trip, activity: a, onEdit, onAssign, last, index = 0 }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const vote = useAppStore((s) => s.voteActivity);
  const update = useAppStore((s) => s.updateActivity);
  const { directions, askDelete } = useActivityOps(trip, a);
  const meta = useMetaLine(trip, a);
  const tally = voteTally(a.votes, trip.members.length);
  const myVote = a.votes[userId];
  const yesPeople = Object.entries(a.votes)
    .filter(([, v]) => v === 1)
    .map(([id]) => trip.members.find((m) => m.id === id))
    .filter(Boolean) as Trip['members'];
  const { clock, suffix } = clockParts(a.time);
  const stamp = a.done ? { label: 'Done', tone: 'muted' as const } : STATUS_STAMP[a.status];

  const toggle = () => setOpen((o) => !o);

  const toggleReminder = async () => {
    const next = !a.reminder;
    if (next) {
      const ok = await ensurePermission();
      if (!ok && Platform.OS !== 'web') toast('Enable notifications in Settings to get alerts', { tone: 'warn', icon: 'notifications-off-outline' });
    }
    update(trip.id, a.id, { reminder: next });
    tap();
    toast(next ? `Reminder on — we’ll ping the group before ${a.title}` : 'Reminder turned off', { icon: next ? 'notifications' : 'notifications-off-outline' });
  };

  const setStatus = (s: ActivityStatus) => {
    if (s === a.status) return;
    update(trip.id, a.id, { status: s });
    toast(s === 'voting' ? 'Moved to the Vote tab' : `Marked as ${s}`);
  };

  const row = (
    <View style={[styles.stop, !last && { paddingBottom: 26 }]}>
      {/* The route line runs the whole height of the stop, behind the square stops and behind the opened details. */}
      {last ? null : <View pointerEvents="none" style={styles.line} />}
      <View style={styles.row}>
        <View style={styles.time} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <T variant="numeralSm" style={a.done ? { color: colors.textMuted } : undefined}>
            {clock}
          </T>
          <T variant="kicker" color={colors.textSecondary}>
            {suffix}
          </T>
        </View>

        <View style={[styles.node, a.status === 'pending' && !a.done && styles.nodePending, a.done && { backgroundColor: colors.ink }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name={a.done ? 'checkmark' : typeIcon(a.type)} size={18} color={a.done ? colors.bg : colors.ink} />
        </View>

        <Press
          onPress={toggle}
          scaleTo={0.99}
          style={styles.main}
          accessibilityLabel={`${a.title}, ${weekdayShort(a.date)} ${a.time}, ${tally.yes} of ${tally.total} in`}
          accessibilityHint="Shows details and actions"
          accessibilityState={{ expanded: open }}>
          <T variant="h3" numberOfLines={open ? undefined : 3} style={a.done ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>
            {a.title}
          </T>
          <View style={styles.place}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <T variant="small" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              {a.location}
            </T>
          </View>
          <View style={styles.facts}>
            <Stamp label={stamp.label} tone={stamp.tone} icon={a.status === 'confirmed' && !a.done ? 'lock-closed' : undefined} rotate={0} />
            <T variant="kicker" color={colors.textSecondary} style={{ flexShrink: 1 }}>
              {meta}
            </T>
          </View>
        </Press>
        {/* The reminder belongs to the start time, so it sits under it. It comes after the stop in reading order and is never inside the tap area. */}
        <Press onPress={toggleReminder} accessibilityLabel={a.reminder ? 'Turn reminder off' : 'Turn reminder on'} style={styles.bell}>
          <Ionicons name={a.reminder ? 'notifications' : 'notifications-outline'} size={22} color={a.reminder ? colors.ink : colors.textMuted} />
        </Press>
      </View>

      {open ? (
        <FadeIn distance={6} duration={200}>
          <View style={styles.details}>
            {a.notes ? (
              <T variant="small" color={colors.textSecondary}>
                {a.notes}
              </T>
            ) : null}
            <View style={styles.going}>
              {yesPeople.length ? <AvatarStack people={yesPeople} max={4} size={28} /> : null}
              <T variant="small" weight="semibold" color={colors.textSecondary}>
                {tally.yes} of {tally.total} in
              </T>
            </View>
            <View style={styles.pair}>
              <Chip label="I’m in" icon={myVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'} active={myVote === 1} onPress={() => vote(trip.id, a.id, 1)} style={styles.choice} />
              <Chip label="Skip" icon={myVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'} active={myVote === -1} onPress={() => vote(trip.id, a.id, -1)} style={styles.choice} />
            </View>
            <Divider />
            <View style={actionStyles.grid}>
              <ActionRow icon="people-outline" label="Assign" onPress={() => onAssign(a)} />
              <ActionRow icon="navigate-outline" label="Directions" onPress={directions} />
              <ActionRow icon={a.done ? 'refresh-outline' : 'checkmark-done-outline'} label={a.done ? 'Undo' : 'Done'} onPress={() => update(trip.id, a.id, { done: !a.done })} />
              <ActionRow icon="create-outline" label="Edit" onPress={() => onEdit(a)} />
            </View>
            <Divider />
            <View style={{ gap: 8 }}>
              <T variant="kicker" color={colors.textSecondary}>
                Status
              </T>
              <View style={styles.pair}>
                <Chip small label="Locked in" active={a.status === 'confirmed'} onPress={() => setStatus('confirmed')} />
                <Chip small label={t('itin.voting')} active={a.status === 'voting'} onPress={() => setStatus('voting')} />
                <Chip small label={t('itin.pending')} active={a.status === 'pending'} onPress={() => setStatus('pending')} />
              </View>
            </View>
            <Divider />
            <DeleteRow title={a.title} onPress={askDelete} />
          </View>
        </FadeIn>
      ) : null}
    </View>
  );

  return index < STAGGER ? (
    <FadeIn delay={index * 45} distance={10} duration={320}>
      {row}
    </FadeIn>
  ) : (
    row
  );
}

const NODE = 36;
const TIME_W = 68;
const GAP = 8;

const styles = StyleSheet.create({
  stop: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: GAP, minHeight: 96 },
  time: { width: TIME_W, alignItems: 'flex-end', paddingTop: 2 },
  node: { width: NODE, height: NODE, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nodePending: { borderStyle: 'dashed' },
  line: { position: 'absolute', top: NODE / 2, bottom: 0, left: TIME_W + GAP + NODE / 2 - line / 2, width: line, backgroundColor: colors.ink },
  main: { flex: 1, minWidth: 0, gap: 4, paddingTop: 4, minHeight: NODE },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, marginTop: 4 },
  bell: { position: 'absolute', left: TIME_W - 44, top: 46, width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 1 },
  details: { marginTop: 8, padding: 14, gap: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink },
  going: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexGrow: 1, flexBasis: '40%', justifyContent: 'center' },
});
