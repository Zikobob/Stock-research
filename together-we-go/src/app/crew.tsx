import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { AddMemberSheet } from '@/components/crew/AddMemberSheet';
import { ChecklistSection } from '@/components/crew/ChecklistSection';
import { DocsSection } from '@/components/crew/DocsSection';
import { InviteCard } from '@/components/crew/InviteCard';
import { MembersSection } from '@/components/crew/MembersSection';
import { NewPollSheet } from '@/components/crew/NewPollSheet';
import { PollsSection } from '@/components/crew/PollsSection';
import { RoleSheet } from '@/components/crew/RoleSheet';
import { SyncTripCard } from '@/components/sync/SyncTripCard';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Card, Pill } from '@/components/ui/bits';
import { toast, confirmAction } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { inviteMessage } from '@/services/share';
import { tripStatus, useActiveTrip, useAppStore, useMyTrips } from '@/store/useAppStore';
import type { Member } from '@/store/types';
import { colors } from '@/theme';
import { rangeLabel } from '@/utils/time';

export default function Crew() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <Hub key={trip.id} />;
}

/** Crew & roles: who is on the trip, the invite (code, QR, sync), polls, the shared checklist and documents. */
function Hub() {
  const trip = useActiveTrip()!;
  const myTrips = useMyTrips();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  // Actions are stable references, so read them without subscribing to the whole store.
  const s = useAppStore.getState();
  const owner = trip.ownerId === userId;
  const dest = destinationById(trip.destinationId);

  const [shareOpen, setShareOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<Member | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const status = tripStatus(trip);
  const assignee = trip.tasks.find((k) => k.id === assignTaskId)?.assignee;

  return (
    <Screen header={<Header title="Crew & roles" subtitle="Invite code, roles, votes and checklist" backLabel="More" />} bottomInset={30}>
      {/* Trip switcher */}
      <Card padded={false}>
        <Press onPress={() => router.push('/trips')} style={styles.tripRow} accessibilityLabel="Switch trip">
          <View style={styles.tripIcon}>
            <Ionicons name="airplane" size={18} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="title" numberOfLines={1}>
              {trip.name}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {dest?.city} · {rangeLabel(trip.startDate, trip.endDate)}
            </T>
          </View>
          <Pill label={status === 'planning' ? 'Planning' : status === 'active' ? 'In progress' : 'Completed'} tone={status === 'active' ? 'green' : status === 'planning' ? 'blue' : 'gray'} />
          <T variant="caption" weight="semibold" color={colors.textSecondary}>
            {myTrips.length > 1 ? `+${myTrips.length - 1}` : ''}
          </T>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Press>
      </Card>

      <InviteCard trip={trip} owner={owner} onShare={() => setShareOpen(true)} />
      <SyncTripCard trip={trip} />
      <MembersSection trip={trip} userId={userId} onPick={setRoleFor} onAdd={() => setAddOpen(true)} />
      <PollsSection trip={trip} userId={userId} owner={owner} onNew={() => setPollOpen(true)} />
      <ChecklistSection trip={trip} onAssign={setAssignTaskId} />
      <DocsSection trip={trip} />

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
      <AddMemberSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(n, e) => s.addMember(trip.id, n, e)}
        onShare={() => {
          setAddOpen(false);
          setTimeout(() => setShareOpen(true), 250);
        }}
      />
      <NewPollSheet visible={pollOpen} onClose={() => setPollOpen(false)} onCreate={(q, o) => s.createPoll(trip.id, q, o)} />
      <MemberPickerSheet
        visible={!!assignTaskId}
        single
        title="Assign task"
        onClose={() => setAssignTaskId(null)}
        members={trip.members}
        selected={assignee ? [assignee] : []}
        onToggle={(id) => assignTaskId && s.assignTask(trip.id, assignTaskId, id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
