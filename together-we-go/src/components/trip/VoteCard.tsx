import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarStack, Divider, ProgressBar } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { FadeIn } from '@/components/ui/motion';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { dayLabel, time12, weekdayShort } from '@/utils/time';

import { ActionRow, DeleteRow, actionStyles, useActivityOps, useMetaLine } from './ActivityParts';
import { typeIcon } from './meta';
import { voteTally } from './plan';

interface Props {
  trip: Trip;
  activity: Activity;
  onEdit: (a: Activity) => void;
  onAssign: (a: Activity) => void;
  index?: number;
  /** Just locked in: the stamp slams down and the buttons make way for a line saying where it went. */
  justLocked?: boolean;
}

/**
 * A ballot on the Vote tab. An accent band on top says when it is, the live tally fills a bar toward the majority, and the crew
 * answers with two big buttons. The organizer gets a strip along the bottom to lock it in without waiting for the votes.
 */
export function VoteCard({ trip, activity: a, onEdit, onAssign, index = 0, justLocked }: Props) {
  const [open, setOpen] = useState(false);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const vote = useAppStore((s) => s.voteActivity);
  const update = useAppStore((s) => s.updateActivity);
  const { directions, askDelete } = useActivityOps(trip, a);
  const meta = useMetaLine(trip, a);
  const tally = voteTally(a.votes, trip.members.length);
  const myVote = a.votes[userId];
  const isOwner = trip.ownerId === userId;
  const yesPeople = Object.entries(a.votes)
    .filter(([, v]) => v === 1)
    .map(([id]) => trip.members.find((m) => m.id === id))
    .filter(Boolean) as Trip['members'];

  const lockIn = () => {
    if (!isOwner) {
      const boss = trip.members.find((m) => m.id === trip.ownerId)?.name.split(' ')[0] ?? 'the organizer';
      return toast(`Only ${boss} (the organizer) can lock this in`, { tone: 'warn', icon: 'lock-closed-outline' });
    }
    // The Plan screen sees the status change and does the celebrating, so it also happens when a vote tips it over.
    update(trip.id, a.id, { status: 'confirmed', reminder: true });
  };

  const card = (
    <View style={styles.card}>
      <View style={styles.band}>
        <T variant="kicker" color={colors.onAccent} style={{ flex: 1 }} numberOfLines={1}>
          {weekdayShort(a.date)} {dayLabel(a.date)} · {time12(a.time)}
        </T>
        {justLocked ? (
          <Stamp label="Locked in" tone="positive" icon="lock-closed" slam />
        ) : (
          <T variant="kicker" color={colors.onAccent}>
            Voting
          </T>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.kind} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name={typeIcon(a.type)} size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T variant="h2" numberOfLines={3}>
              {a.title}
            </T>
            <View style={styles.place}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <T variant="small" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {a.location}
              </T>
            </View>
            <T variant="kicker" color={colors.textSecondary}>
              {meta}
            </T>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={styles.tallyRow}>
            <T variant="title" accessibilityLabel={`${tally.yes} of ${tally.total} say yes. ${tally.needed} needed to lock it in`}>
              <T variant="numeralSm">{tally.yes}</T> of <T variant="numeralSm">{tally.total}</T> say yes
            </T>
            <T variant="kicker" color={colors.textSecondary}>
              {justLocked ? 'On the plan' : `${tally.needed} to lock in`}
            </T>
          </View>
          <ProgressBar value={tally.progress} />
          {yesPeople.length || tally.no ? (
            <View style={styles.who}>
              {yesPeople.length ? <AvatarStack people={yesPeople} max={5} size={28} /> : null}
              {tally.no ? (
                <T variant="small" color={colors.textSecondary}>
                  {tally.no} skipping
                </T>
              ) : null}
            </View>
          ) : null}
        </View>

        {justLocked ? (
          <View style={styles.moved}>
            <Ionicons name="calendar-outline" size={18} color={colors.ink} />
            <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
              It is on the plan now.
            </T>
          </View>
        ) : (
          <>
            <View style={styles.pair}>
              <Choice
                on={myVote === 1}
                tone="yes"
                icon={myVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                label="I’m in"
                accessibilityLabel={`I’m in. ${tally.yes} of ${tally.total} are in`}
                onPress={() => vote(trip.id, a.id, 1)}
              />
              <Choice on={myVote === -1} tone="no" icon={myVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'} label="Skip" accessibilityLabel={myVote === -1 ? 'Skipping. Tap to undo' : 'Skip this'} onPress={() => vote(trip.id, a.id, -1)} />
            </View>

            <Press onPress={() => setOpen((o) => !o)} style={styles.more} accessibilityLabel={open ? 'Hide details' : 'Show details'} accessibilityState={{ expanded: open }} scaleTo={0.99}>
              <T variant="kicker" color={colors.textSecondary}>
                {open ? 'Hide details' : 'Details'}
              </T>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </Press>
            {open ? (
              <View style={{ gap: 8 }}>
                {a.notes ? (
                  <T variant="small" color={colors.textSecondary}>
                    {a.notes}
                  </T>
                ) : null}
                <View style={actionStyles.grid}>
                  <ActionRow icon="people-outline" label="Assign" onPress={() => onAssign(a)} />
                  <ActionRow icon="navigate-outline" label="Directions" onPress={directions} />
                  <ActionRow icon="create-outline" label="Edit" onPress={() => onEdit(a)} />
                </View>
                <Divider />
                <DeleteRow title={a.title} onPress={askDelete} />
              </View>
            ) : null}
          </>
        )}
      </View>

      {isOwner && !justLocked ? (
        <>
          <Rule />
          <Press onPress={lockIn} style={styles.lock} accessibilityLabel={`Lock in ${a.title}`} scaleTo={0.99}>
            <Ionicons name="lock-closed-outline" size={19} color={colors.ink} />
            <T variant="title" weight="bold" style={{ flex: 1 }}>
              Lock in
            </T>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Press>
        </>
      ) : null}
    </View>
  );

  return index < 6 ? (
    <FadeIn delay={index * 60} distance={10} duration={320}>
      {card}
    </FadeIn>
  ) : (
    card
  );
}

/** One of the two answers: a big button that stays pressed (accent for yes, ink for skip) once chosen. */
function Choice({ on, tone, icon, label, accessibilityLabel, onPress }: { on: boolean; tone: 'yes' | 'no'; icon: 'thumbs-up' | 'thumbs-up-outline' | 'thumbs-down' | 'thumbs-down-outline'; label: string; accessibilityLabel: string; onPress: () => void }) {
  const bg = on ? (tone === 'yes' ? colors.accent : colors.primary) : colors.card;
  const fg = on ? (tone === 'yes' ? colors.onAccent : colors.onPrimary) : colors.ink;
  return (
    <PlatePress
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: on }}
      offset={3}
      corner={radius.button}
      wrapperStyle={{ flex: 1 }}
      style={[styles.choice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={fg} />
      <T variant="title" weight="bold" color={fg}>
        {label}
      </T>
      {on ? <Ionicons name="checkmark" size={16} color={fg} /> : null}
    </PlatePress>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden', marginBottom: 20 },
  band: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.accent, borderBottomWidth: line, borderBottomColor: colors.ink },
  body: { padding: 16, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kind: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flexDirection: 'row', gap: 12 },
  choice: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  moved: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.button, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, backgroundColor: colors.bgAlt },
});
