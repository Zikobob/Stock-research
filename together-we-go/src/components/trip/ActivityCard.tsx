import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack, Pill, type IconName } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { Activity, Trip } from '@/store/types';
import { colors, radius, shadow } from '@/theme';
import { durationLabel, money } from '@/utils/format';

import { statusMeta, typeMeta } from './meta';

interface Props {
  trip: Trip;
  activity: Activity;
  onEdit: (a: Activity) => void;
  onAssign: (a: Activity) => void;
  last?: boolean;
}

/** Timeline row + expandable card, modelled on the reference itinerary screen. */
export function ActivityCard({ trip, activity: a, onEdit, onAssign, last }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const vote = useAppStore((s) => s.voteActivity);
  const update = useAppStore((s) => s.updateActivity);
  const remove = useAppStore((s) => s.deleteActivity);
  const meta = typeMeta(a.type);
  const st = statusMeta[a.status];
  const ups = Object.values(a.votes).filter((v) => v === 1).length;
  const downs = Object.values(a.votes).filter((v) => v === -1).length;
  const myVote = a.votes[userId];
  const people = a.assigned.map((id) => trip.members.find((m) => m.id === id)).filter(Boolean) as Trip['members'];

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

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <T variant="micro" color={colors.textSecondary} style={{ fontSize: 11 }}>
          {a.time}
        </T>
        <View style={[styles.dot, { borderColor: st.dot }]}>
          <View style={[styles.dotInner, { backgroundColor: st.dot }]} />
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>

      <Press onPress={toggle} scaleTo={0.99} style={[styles.card, a.done && { opacity: 0.6 }]} accessibilityLabel={`${a.title}, ${a.time}, ${t(st.key)}`} accessibilityHint="Shows details and actions">
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodySm" weight="semibold" numberOfLines={open ? undefined : 2} style={a.done && { textDecorationLine: 'line-through' }}>
              {a.title}
            </T>
            <View style={styles.inline}>
              <Ionicons name="location-sharp" size={11} color={colors.textMuted} />
              <T variant="caption" color={colors.textMuted} numberOfLines={1}>
                {a.location}
              </T>
            </View>
          </View>
          <Press onPress={toggleReminder} hitSlop={8} accessibilityLabel={a.reminder ? 'Turn reminder off' : 'Turn reminder on'} style={[styles.bell, a.reminder && styles.bellOn]}>
            <Ionicons name={a.reminder ? 'notifications' : 'notifications-outline'} size={14} color={a.reminder ? colors.white : colors.textMuted} />
          </Press>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>

        <View style={[styles.inline, { marginTop: 10, gap: 8 }]}>
          <View style={styles.inline}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <T variant="caption" color={colors.textSecondary}>
              {durationLabel(a.durationMin)}
            </T>
          </View>
          <Pill label={t(st.key)} tone={st.tone} />
          <View style={{ flex: 1 }} />
          {a.costPerPerson > 0 ? (
            <T variant="caption" weight="semibold">
              {money(a.costPerPerson)}
              {t('itin.perPerson')}
            </T>
          ) : (
            <T variant="caption" color={colors.textMuted}>
              Free
            </T>
          )}
        </View>

        <View style={[styles.inline, { marginTop: 10 }]}>
          {people.length ? (
            <>
              {people.length === 1 ? <Avatar name={people[0].name} src={people[0].avatar} size={22} /> : <AvatarStack people={people} size={22} />}
              <T variant="caption" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                {people.length === 1 ? people[0].name.split(' ')[0] : t('itin.assigned', { n: people.length })}
              </T>
            </>
          ) : (
            <T variant="caption" color={colors.textMuted}>
              Unassigned
            </T>
          )}
          <View style={{ flex: 1 }} />
          <Ionicons name={myVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'} size={12} color={myVote === 1 ? colors.primary : colors.textMuted} />
          <T variant="caption" color={colors.textSecondary} style={{ marginLeft: 4 }}>
            {ups}/{trip.members.length}
          </T>
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
            <View style={styles.voteRow}>
              <Press onPress={() => vote(trip.id, a.id, 1)} style={[styles.voteBtn, myVote === 1 && styles.voteOn]} accessibilityLabel={`Vote yes, ${ups} votes`}>
                <Ionicons name="thumbs-up" size={14} color={myVote === 1 ? colors.white : colors.primary} />
                <T variant="small" weight="semibold" color={myVote === 1 ? colors.white : colors.primary}>
                  I’m in · {ups}
                </T>
              </Press>
              <Press onPress={() => vote(trip.id, a.id, -1)} style={[styles.voteBtn, myVote === -1 && styles.voteNo]} accessibilityLabel={`Vote no, ${downs} votes`}>
                <Ionicons name="thumbs-down" size={14} color={myVote === -1 ? colors.white : colors.red} />
                <T variant="small" weight="semibold" color={myVote === -1 ? colors.white : colors.red}>
                  Skip · {downs}
                </T>
              </Press>
            </View>
            {a.status === 'voting' ? (
              <T variant="caption" color={colors.textMuted}>
                Confirms automatically when more than half the group votes “I’m in”.
              </T>
            ) : null}
            <View style={styles.actions}>
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
              <Action
                icon="trash-outline"
                label="Delete"
                danger
                onPress={() =>
                  confirmAction('Delete activity?', `“${a.title}” will be removed for everyone.`, () => {
                    remove(trip.id, a.id);
                    toast('Activity deleted');
                  }, { confirmLabel: 'Delete', destructive: true })
                }
              />
            </View>
          </View>
        ) : null}
      </Press>
    </View>
  );
}

function Action({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Press onPress={onPress} style={styles.action} accessibilityLabel={label}>
      <View style={[styles.actionIcon, danger && { backgroundColor: colors.redSoft }]}>
        <Ionicons name={icon} size={16} color={danger ? colors.red : colors.primary} />
      </View>
      <T variant="micro" color={colors.textSecondary}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  rail: { width: 40, alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: colors.white },
  dotInner: { width: 5, height: 5, borderRadius: 3 },
  line: { flex: 1, width: 1.5, backgroundColor: colors.border, marginTop: 4 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bell: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  bellOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  details: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  notes: { flexDirection: 'row', gap: 8, backgroundColor: colors.cardMuted, padding: 10, borderRadius: radius.sm },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteBtn: { flex: 1, height: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  voteOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  voteNo: { backgroundColor: colors.red, borderColor: colors.red },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 4, minWidth: 40 },
  actionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
