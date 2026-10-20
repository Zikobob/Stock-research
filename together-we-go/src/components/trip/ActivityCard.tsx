import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, View } from 'react-native';

import { AvatarStack, type IconName } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import { ensurePermission } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, Trip } from '@/store/types';
import { colors, radius, shadow } from '@/theme';
import { lengthTag, money } from '@/utils/format';
import { dayLabel, weekdayShort } from '@/utils/time';

import { typeEmoji } from './meta';

interface Props {
  trip: Trip;
  activity: Activity;
  onEdit: (a: Activity) => void;
  onAssign: (a: Activity) => void;
  /** 'vote' adds the progress bar + “Lock in” button used on the Vote tab. */
  mode?: 'plan' | 'vote';
}

/** One activity: emoji badge, when/where, tags, and a yellow vote pill with the people who said “I’m in”. */
export function ActivityCard({ trip, activity: a, onEdit, onAssign, mode = 'plan' }: Props) {
  const t = useT();
  const rates = useRates();
  const [open, setOpen] = useState(false);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const vote = useAppStore((s) => s.voteActivity);
  const update = useAppStore((s) => s.updateActivity);
  const remove = useAppStore((s) => s.deleteActivity);
  const currency = destinationById(trip.destinationId)?.currency ?? 'USD';
  const ups = Object.entries(a.votes).filter(([, v]) => v === 1).map(([id]) => id);
  const myVote = a.votes[userId];
  const total = trip.members.length;
  const needed = Math.floor(total / 2) + 1;
  const yesPeople = ups.map((id) => trip.members.find((m) => m.id === id)).filter(Boolean) as Trip['members'];
  const cost = a.costPerPerson > 0 ? `${money(convert(a.costPerPerson, 'USD', currency, rates), currency)} pp` : 'Free';

  const toggle = () => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  const directions = () => {
    const q = a.lat && a.lng ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.title} ${a.location}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => toast('Couldn’t open maps', { tone: 'warn' }));
  };

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

  const lockIn = () => {
    if (trip.ownerId !== userId) {
      const boss = trip.members.find((m) => m.id === trip.ownerId)?.name.split(' ')[0] ?? 'the organizer';
      return toast(`Only ${boss} (the organizer) can lock this in`, { tone: 'warn', icon: 'lock-closed-outline' });
    }
    update(trip.id, a.id, { status: 'confirmed', reminder: true });
    tap('success');
    toast(`Locked in: ${a.title} 🔒`, { icon: 'lock-closed' });
  };

  return (
    <View style={[styles.card, a.done && { opacity: 0.6 }]}>
      {/* The delete button sits next to the card button, not inside it: on the web a button inside a button is invalid HTML. */}
      <View style={styles.top}>
        <Press onPress={toggle} scaleTo={0.99} style={styles.topMain} accessibilityLabel={`${a.title}, ${weekdayShort(a.date)} ${a.time}, ${ups.length} of ${total} in`} accessibilityHint="Shows details and actions">
          <View style={styles.badge}>
            <T style={{ fontSize: 22, lineHeight: 28 }}>{typeEmoji[a.type]}</T>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <T variant="title" weight="bold" numberOfLines={open ? undefined : 2} style={[{ fontSize: 17, lineHeight: 22 }, a.done && { textDecorationLine: 'line-through' }]}>
              {a.title}
            </T>
            <View style={styles.meta}>
              <View style={styles.inline}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <T variant="caption" color={colors.textSecondary}>
                  {weekdayShort(a.date)}, {dayLabel(a.date)} · {a.time}
                </T>
              </View>
              <View style={[styles.inline, { flexShrink: 1 }]}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <T variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {a.location}
                </T>
              </View>
            </View>
            <View style={styles.tags}>
              <Tag label={lengthTag(a.durationMin)} />
              <Tag label={cost} />
              {a.status !== 'confirmed' && mode === 'plan' ? <Tag label={t(a.status === 'voting' ? 'itin.voting' : 'itin.pending')} tone="warn" /> : null}
            </View>
          </View>
        </Press>
        <Press
          onPress={() =>
            confirmAction('Delete activity?', `“${a.title}” will be removed for everyone.`, () => {
              remove(trip.id, a.id);
              toast('Activity deleted');
            }, { confirmLabel: 'Delete', destructive: true })
          }
          hitSlop={10}
          accessibilityLabel={`Delete ${a.title}`}>
          <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
        </Press>
      </View>

      <View style={styles.bottom}>
        <Press
          onPress={() => {
            vote(trip.id, a.id, 1);
            tap();
          }}
          style={[styles.votePill, myVote === 1 ? styles.votePillOn : styles.votePillOff]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: myVote === 1 }}
          accessibilityLabel={`I’m in. ${ups.length} of ${total} are in`}>
          <Ionicons name={myVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'} size={14} color={myVote === 1 ? colors.onAccent : colors.textSecondary} />
          <T variant="small" weight="bold" color={myVote === 1 ? colors.onAccent : colors.textSecondary}>
            {ups.length}/{total}
          </T>
        </Press>
        {yesPeople.length ? <AvatarStack people={yesPeople} max={4} size={24} /> : null}
        {mode === 'vote' ? (
          <>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={`${ups.length} of ${needed} votes needed`}>
              <View style={[styles.fill, { width: `${Math.min(1, ups.length / needed) * 100}%` }]} />
            </View>
            <Press onPress={lockIn} style={styles.lock} accessibilityLabel={`Lock in ${a.title}`}>
              <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
              <T variant="caption" weight="bold" color={colors.onPrimary}>
                Lock in
              </T>
            </Press>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }} />
            <Press onPress={toggleReminder} hitSlop={8} accessibilityLabel={a.reminder ? 'Turn reminder off' : 'Turn reminder on'} style={[styles.bell, a.reminder && styles.bellOn]}>
              <Ionicons name={a.reminder ? 'notifications' : 'notifications-outline'} size={15} color={a.reminder ? colors.onPrimary : colors.textSecondary} />
            </Press>
          </>
        )}
      </View>

      {open ? (
        <View style={styles.details}>
          {a.notes ? (
            <View style={styles.notes}>
              <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
              <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
                {a.notes}
              </T>
            </View>
          ) : null}
          {a.status === 'voting' ? (
            <T variant="caption" color={colors.textMuted}>
              Confirms automatically when more than half the crew votes “I’m in”, or the organizer can lock it in from the Vote tab.
            </T>
          ) : null}
          <View style={styles.actions}>
            <Action icon={myVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'} label={myVote === -1 ? 'Skipping' : 'Skip'} onPress={() => vote(trip.id, a.id, -1)} />
            <Action icon="people-outline" label="Assign" onPress={() => onAssign(a)} />
            <Action icon="navigate-outline" label="Directions" onPress={directions} />
            <Action icon={a.done ? 'refresh-outline' : 'checkmark-done-outline'} label={a.done ? 'Undo' : 'Done'} onPress={() => update(trip.id, a.id, { done: !a.done })} />
            <Action
              icon="swap-horizontal"
              label="Status"
              onPress={() => {
                const next = a.status === 'confirmed' ? 'voting' : a.status === 'voting' ? 'pending' : 'confirmed';
                update(trip.id, a.id, { status: next });
                toast(`Marked as ${next}`);
              }}
            />
            <Action icon="create-outline" label="Edit" onPress={() => onEdit(a)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Tag({ label, tone }: { label: string; tone?: 'warn' }) {
  return (
    <View style={[styles.tag, tone === 'warn' && { backgroundColor: colors.accentSoft }]}>
      <T variant="micro" weight="semibold" color={tone === 'warn' ? colors.onAccent : colors.textSecondary}>
        {label}
      </T>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.action} accessibilityLabel={label}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={16} color={colors.text} />
      </View>
      <T variant="micro" color={colors.textSecondary}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, marginBottom: 12, ...shadow },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  topMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { backgroundColor: colors.bgAlt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  votePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999 },
  votePillOn: { backgroundColor: colors.accent },
  votePillOff: { backgroundColor: colors.bgAlt },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.bgAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.primary },
  bell: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgAlt },
  bellOn: { backgroundColor: colors.primary },
  details: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  notes: { flexDirection: 'row', gap: 8, backgroundColor: colors.cardMuted, padding: 10, borderRadius: radius.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 4, minWidth: 44 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
