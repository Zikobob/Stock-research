import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ToolTile } from '@/components/MenuSheet';
import { ShareSheet } from '@/components/ShareSheet';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, IconButton, Pill, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { ROLE_OPTIONS, roleDescriptions, type Role } from '@/data/reference';
import { useT } from '@/i18n';
import { copy, inviteMessage } from '@/services/share';
import { tripStatus, useActiveTrip, useAppStore, useCurrentUser, useMyTrips } from '@/store/useAppStore';
import type { Member } from '@/store/types';
import { colors, fonts, radius } from '@/theme';
import { rangeLabel } from '@/utils/time';
import { firstError, maxLen, required, validateEmail, validateName } from '@/utils/validation';

export default function Profile() {
  const trip = useActiveTrip();
  const user = useCurrentUser();
  const signOut = useAppStore((s) => s.signOut);
  if (!trip)
    return (
      <View style={{ flex: 1 }}>
        <NoTrip title={`Hi ${user?.name.split(' ')[0] ?? 'there'} — no trips yet`} />
        <View style={{ position: 'absolute', top: 60, right: 20 }}>
          <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={{ padding: 20 }}>
          <Button label="Sign out" variant="ghost" icon="log-out-outline" onPress={signOut} />
        </View>
      </View>
    );
  return <Hub key={trip.id} />;
}

function Hub() {
  const t = useT();
  const trip = useActiveTrip()!;
  const user = useCurrentUser();
  const myTrips = useMyTrips();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  // Actions are stable references, so read them without subscribing to the whole store.
  const s = useAppStore.getState();
  const owner = trip.ownerId === userId;
  const dest = destinationById(trip.destinationId);
  const me = trip.members.find((m) => m.id === userId);

  const [shareOpen, setShareOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<Member | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [task, setTask] = useState('');
  const [taskErr, setTaskErr] = useState<string | null>(null);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const done = trip.tasks.filter((k) => k.done).length;
  const status = tripStatus(trip);

  const addTask = () => {
    const e = firstError(task, required('a task'), maxLen(60, 'Task'));
    setTaskErr(e);
    if (e) return tap('warning');
    s.addTask(trip.id, task);
    setTask('');
    tap('success');
  };

  return (
    <Screen bottomInset={30}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T variant="kicker" color={colors.textSecondary}>
            {t('hub.kicker')}
          </T>
          <T variant="h1">{t('hub.title')}</T>
        </View>
        <IconButton icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      {/* Me + trip switcher */}
      <Card style={{ gap: 12 }}>
        <View style={styles.row}>
          <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={48} />
          <View style={{ flex: 1 }}>
            <T variant="title">{user?.name}</T>
            <T variant="caption" color={colors.textSecondary}>
              {user?.email}
            </T>
          </View>
          {me ? <Pill label={me.role} /> : null}
        </View>
        <Press onPress={() => router.push('/trips')} style={styles.tripRow} accessibilityLabel="Switch trip">
          <Ionicons name="airplane" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T variant="small" weight="semibold" numberOfLines={1}>
              {trip.name}
            </T>
            <T variant="caption" color={colors.textSecondary}>
              {dest?.city} · {rangeLabel(trip.startDate, trip.endDate)}
            </T>
          </View>
          <Pill label={status === 'planning' ? 'Planning' : status === 'active' ? 'In progress' : 'Completed'} tone={status === 'active' ? 'green' : status === 'planning' ? 'blue' : 'gray'} />
          <T variant="caption" weight="semibold" color={colors.primary}>
            {myTrips.length > 1 ? `+${myTrips.length - 1}` : ''}
          </T>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Press>
      </Card>

      {/* Invite */}
      <View style={styles.invite}>
        <LinearGradient colors={[colors.primary, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.blob} />
        <View style={{ flex: 1 }}>
          <T variant="kicker" color="rgba(255,255,255,0.7)">
            {t('hub.invite')}
          </T>
          <Press onPress={() => copy(trip.inviteCode, `Invite code ${trip.inviteCode} copied`)} accessibilityLabel={`Invite code ${trip.inviteCode}. Tap to copy`}>
            <T variant="display" color={colors.white} style={{ letterSpacing: 3, fontSize: 30 }}>
              {trip.inviteCode}
            </T>
          </Press>
          <T variant="caption" color="rgba(255,255,255,0.75)">
            Friends enter this in “Join a trip”
          </T>
        </View>
        <View style={{ gap: 8 }}>
          <Press onPress={() => setShareOpen(true)} style={styles.shareBtn} accessibilityLabel="Share invite">
            <Ionicons name="share-social-outline" size={15} color={colors.primary} />
            <T variant="small" weight="semibold" color={colors.primary}>
              {t('hub.share')}
            </T>
          </Press>
          {owner ? (
            <Press
              onPress={() =>
                confirmAction('New invite code?', 'The old code will stop working. Members already on the trip stay.', () => {
                  s.regenerateInvite(trip.id);
                  toast('New invite code created');
                })
              }
              style={styles.ghostBtn}
              accessibilityLabel="Generate a new invite code">
              <Ionicons name="refresh-outline" size={14} color={colors.white} />
              <T variant="caption" weight="semibold" color={colors.white}>
                New code
              </T>
            </Press>
          ) : null}
        </View>
      </View>

      {/* Members */}
      <SectionHeader title={t('hub.members')} action="+ Add" onAction={() => setAddOpen(true)} style={{ marginTop: 22 }} />
      <View style={{ gap: 8 }}>
        {trip.members.map((m) => (
          <Press key={m.id} onPress={() => setRoleFor(m)} style={styles.member} scaleTo={0.99} accessibilityLabel={`${m.name}, ${m.role}. Tap to change role`}>
            <Avatar name={m.name} src={m.avatar} size={36} />
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold">
                {m.name}
                {m.id === userId ? ' (you)' : ''}
                {m.id === trip.ownerId ? ' 👑' : ''}
              </T>
              <T variant="caption" color={colors.textMuted}>
                {m.invited ? 'Invited · hasn’t joined yet' : m.homeCity ? `From ${m.homeCity}` : 'Member'}
              </T>
            </View>
            <View style={styles.rolePill}>
              <T variant="micro" weight="semibold" color={colors.textSecondary}>
                {m.role}
              </T>
            </View>
          </Press>
        ))}
      </View>

      {/* Polls */}
      <SectionHeader title={t('hub.vote')} action="+ New poll" onAction={() => setPollOpen(true)} style={{ marginTop: 22 }} />
      <View style={{ gap: 10 }}>
        {trip.polls.length ? (
          trip.polls.map((p) => {
            const total = p.options.reduce((n, o) => n + o.votes.length, 0);
            const voted = p.options.find((o) => o.votes.includes(userId));
            return (
              <Card key={p.id} style={{ gap: 10 }}>
                <View style={styles.rowBetween}>
                  <T variant="small" weight="semibold" style={{ flex: 1 }}>
                    {p.question}
                  </T>
                  {p.closed ? <Pill label="Closed" tone="gray" /> : <Pill label={`${total} vote${total === 1 ? '' : 's'}`} tone="green" />}
                </View>
                {p.options.map((o) => {
                  const pctv = total ? Math.round((o.votes.length / total) * 100) : 0;
                  const mine = o.votes.includes(userId);
                  return (
                    <Press
                      key={o.id}
                      disabled={p.closed}
                      onPress={() => {
                        s.votePoll(trip.id, p.id, o.id);
                        tap();
                      }}
                      style={[styles.option, mine && styles.optionOn]}
                      accessibilityLabel={`${o.text}, ${pctv} percent${mine ? ', your vote' : ''}`}>
                      <View style={styles.rowBetween}>
                        <T variant="caption" weight={mine ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                          {mine ? '✓ ' : ''}
                          {o.text}
                        </T>
                        <T variant="caption" color={colors.textSecondary}>
                          {pctv}%
                        </T>
                      </View>
                      <ProgressBar value={pctv / 100} height={5} />
                    </Press>
                  );
                })}
                <View style={styles.rowBetween}>
                  <T variant="caption" color={colors.textMuted}>
                    {voted ? 'Tap again to remove your vote' : p.closed ? 'Voting closed' : 'Tap an option to vote'}
                  </T>
                  {p.createdBy === userId || owner ? (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Press onPress={() => s.closePoll(trip.id, p.id)} hitSlop={6}>
                        <T variant="caption" weight="semibold" color={colors.primary}>
                          {p.closed ? 'Reopen' : 'Close'}
                        </T>
                      </Press>
                      <Press
                        onPress={() => confirmAction('Delete poll?', p.question, () => s.deletePoll(trip.id, p.id), { destructive: true, confirmLabel: 'Delete' })}
                        hitSlop={6}>
                        <T variant="caption" weight="semibold" color={colors.red}>
                          Delete
                        </T>
                      </Press>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <T variant="small" color={colors.textSecondary}>
              No polls yet — start one to settle a decision fast.
            </T>
          </Card>
        )}
      </View>

      {/* Checklist */}
      <SectionHeader title={t('hub.checklist')} action={t('hub.done', { a: done, b: trip.tasks.length })} style={{ marginTop: 22 }} />
      <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        {trip.tasks.map((k) => {
          const who = trip.members.find((m) => m.id === k.assignee);
          return (
            <View key={k.id} style={styles.task}>
              <Press onPress={() => s.toggleTask(trip.id, k.id)} accessibilityRole="checkbox" accessibilityState={{ checked: k.done }} accessibilityLabel={k.text} hitSlop={6}>
                <Ionicons name={k.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={k.done ? colors.primary : colors.borderStrong} />
              </Press>
              <Press onPress={() => s.toggleTask(trip.id, k.id)} style={{ flex: 1 }} haptic={false}>
                <T variant="small" color={k.done ? colors.textMuted : colors.text} style={k.done && { textDecorationLine: 'line-through' }}>
                  {k.text}
                </T>
              </Press>
              <Press onPress={() => setAssignTaskId(k.id)} hitSlop={6} accessibilityLabel="Assign task">
                <T variant="caption" color={colors.textMuted}>
                  {who ? who.name.split(' ')[0] : 'Everyone'}
                </T>
              </Press>
              <Press onPress={() => s.deleteTask(trip.id, k.id)} hitSlop={6} accessibilityLabel={`Delete task ${k.text}`}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Press>
            </View>
          );
        })}
        <View style={styles.addTask}>
          <TextInput
            value={task}
            onChangeText={(v) => {
              setTask(v);
              if (taskErr) setTaskErr(null);
            }}
            placeholder={t('hub.addTask')}
            placeholderTextColor={colors.textMuted}
            style={[styles.taskInput, taskErr && { borderColor: colors.red }]}
            onSubmitEditing={addTask}
            returnKeyType="done"
            maxLength={70}
            accessibilityLabel="New task"
          />
          <Press onPress={addTask} style={styles.addBtn} accessibilityLabel="Add task">
            <Ionicons name="add" size={20} color={colors.white} />
          </Press>
        </View>
        {taskErr ? (
          <T variant="caption" color={colors.red} style={{ marginBottom: 8 }}>
            {taskErr}
          </T>
        ) : null}
      </Card>

      {/* Documents */}
      <SectionHeader title={t('hub.documents')} action="Open vault" onAction={() => router.push('/documents')} style={{ marginTop: 22, marginBottom: 2 }} />
      <T variant="caption" color={colors.textSecondary} style={{ marginBottom: 10 }}>
        {t('hub.documentsSub')}
      </T>
      <View style={{ gap: 8 }}>
        {trip.docs.slice(0, 4).map((d) => (
          <Press key={d.id} onPress={() => router.push({ pathname: '/documents', params: { open: d.id } })} style={styles.doc} scaleTo={0.99}>
            <Ionicons name={d.kind === 'image' ? 'image-outline' : d.kind === 'note' ? 'document-text-outline' : 'document-outline'} size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold" numberOfLines={1}>
                {d.name}
              </T>
              <T variant="caption" color={colors.textMuted}>
                {d.kind === 'note' ? 'Note' : d.kind.toUpperCase()}
              </T>
            </View>
            {d.offline ? <Pill label={t('hub.offline')} icon="cloud-done-outline" /> : null}
          </Press>
        ))}
      </View>

      {/* Tools */}
      <SectionHeader title={t('hub.tools')} style={{ marginTop: 22 }} />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          <ToolTile icon="airplane-outline" label="Flights" color="#3D7DD8" onPress={() => router.push('/flights')} />
          <ToolTile icon="images-outline" label="Photo dump" color="#E8833A" onPress={() => router.push('/photos')} />
          <ToolTile icon="briefcase-outline" label="Packing" color="#B4235A" onPress={() => router.push('/packing')} />
          <ToolTile icon="medkit-outline" label="Emergency" color="#D64545" onPress={() => router.push('/emergency')} />
          <ToolTile icon="trophy-outline" label="Recap" color="#B7791F" onPress={() => router.push('/recap')} />
          <ToolTile icon="print-outline" label="Planner" color="#1F4D25" onPress={() => router.push('/(tabs)/itinerary')} />
        </View>
      </Card>

      <Button
        label={t('settings.signOut')}
        variant="ghost"
        icon="log-out-outline"
        style={{ marginTop: 16 }}
        onPress={() =>
          confirmAction('Sign out?', 'Your trips stay saved on this device.', () => {
            s.signOut();
            router.replace('/sign-in');
          }, { confirmLabel: 'Sign out' })
        }
      />

      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} title="Invite your group" message={inviteMessage(trip.name, trip.inviteCode)} preview={inviteMessage(trip.name, trip.inviteCode)} />

      <RoleSheet
        member={roleFor}
        canEdit={owner || roleFor?.id === userId}
        canRemove={owner && roleFor?.id !== trip.ownerId}
        onClose={() => setRoleFor(null)}
        onPick={(role) => {
          if (roleFor) {
            s.setRole(trip.id, roleFor.id, role);
            toast(`${roleFor.name.split(' ')[0]} is now ${role}`);
          }
          setRoleFor(null);
        }}
        onRemove={() => {
          const m = roleFor!;
          setRoleFor(null);
          confirmAction(`Remove ${m.name}?`, 'They’ll lose access to this trip.', () => {
            s.removeMember(trip.id, m.id);
            toast(`${m.name.split(' ')[0]} removed`);
          }, { destructive: true, confirmLabel: 'Remove' });
        }}
      />
      <AddMemberSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdd={(n, e) => s.addMember(trip.id, n, e)} onShare={() => {
        setAddOpen(false);
        setTimeout(() => setShareOpen(true), 250);
      }} />
      <NewPollSheet visible={pollOpen} onClose={() => setPollOpen(false)} onCreate={(q, o) => s.createPoll(trip.id, q, o)} />
      <MemberPickerSheet
        visible={!!assignTaskId}
        single
        title="Assign task"
        onClose={() => setAssignTaskId(null)}
        members={trip.members}
        selected={trip.tasks.find((k) => k.id === assignTaskId)?.assignee ? [trip.tasks.find((k) => k.id === assignTaskId)!.assignee!] : []}
        onToggle={(id) => assignTaskId && s.assignTask(trip.id, assignTaskId, id)}
      />
    </Screen>
  );
}

function RoleSheet({ member, canEdit, canRemove, onClose, onPick, onRemove }: { member: Member | null; canEdit: boolean; canRemove: boolean; onClose: () => void; onPick: (r: Role) => void; onRemove: () => void }) {
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

function AddMemberSheet({ visible, onClose, onAdd, onShare }: { visible: boolean; onClose: () => void; onAdd: (name: string, email?: string) => void; onShare: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null }>({});
  return (
    <Sheet visible={visible} onClose={onClose} title="Add a member" subtitle="Add someone by name, or share the invite code so they can join themselves">
      <Button label="Share invite code instead" variant="soft" icon="share-social-outline" onPress={onShare} />
      <Input label="Name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" autoCapitalize="words" />
      <Input label="Email (optional)" value={email} onChangeText={setEmail} error={errors.email} icon="mail-outline" autoCapitalize="none" keyboardType="email-address" />
      <Button
        label="Add member"
        icon="person-add-outline"
        onPress={() => {
          const e = { name: validateName(name), email: email.trim() ? validateEmail(email) : null };
          setErrors(e);
          if (e.name || e.email) return tap('warning');
          onAdd(name, email);
          toast(`${name.trim().split(' ')[0]} added to the trip`);
          setName('');
          setEmail('');
          onClose();
        }}
      />
    </Sheet>
  );
}

function NewPollSheet({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (q: string, opts: string[]) => void }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet visible={visible} onClose={onClose} title="New poll" subtitle="Let the group decide">
      <Input label="Question" value={q} onChangeText={setQ} placeholder="e.g. Where should we eat on Day 3?" maxLength={80} />
      {opts.map((o, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={o}
            onChangeText={(v) => setOpts((arr) => arr.map((x, j) => (j === i ? v : x)))}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={colors.textMuted}
            style={styles.optInput}
            maxLength={50}
            accessibilityLabel={`Option ${i + 1}`}
          />
          {opts.length > 2 ? (
            <Press onPress={() => setOpts((arr) => arr.filter((_, j) => j !== i))} accessibilityLabel={`Remove option ${i + 1}`}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Press>
          ) : null}
        </View>
      ))}
      {opts.length < 5 ? <Button label="Add option" variant="ghost" size="sm" icon="add" onPress={() => setOpts((a) => [...a, ''])} /> : null}
      {err ? (
        <T variant="caption" color={colors.red}>
          {err}
        </T>
      ) : null}
      <Button
        label="Start poll"
        icon="stats-chart-outline"
        onPress={() => {
          const clean = opts.map((o) => o.trim()).filter(Boolean);
          if (!q.trim()) return setErr('Write a question for the poll');
          if (clean.length < 2) return setErr('Add at least two options');
          if (new Set(clean.map((c) => c.toLowerCase())).size !== clean.length) return setErr('Options must be different');
          onCreate(q, clean);
          setQ('');
          setOpts(['', '']);
          setErr(null);
          toast('Poll started — the group has been notified');
          onClose();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.1)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
  invite: { marginTop: 14, backgroundColor: colors.primary, borderRadius: radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgAlt },
  option: { gap: 6, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  optionOn: { borderColor: colors.primaryLine, backgroundColor: colors.primarySofter },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  addTask: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  taskInput: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 12, fontFamily: fonts.regular, color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  optInput: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 12, fontFamily: fonts.regular, color: colors.text },
});

