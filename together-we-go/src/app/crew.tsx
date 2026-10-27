import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { AddMemberSheet } from '@/components/crew/AddMemberSheet';
import { ChecklistSection } from '@/components/crew/ChecklistSection';
import { InviteCard } from '@/components/crew/InviteCard';
import { MembersSection } from '@/components/crew/MembersSection';
import { NewPollSheet } from '@/components/crew/NewPollSheet';
import { PollsSection } from '@/components/crew/PollsSection';
import { RoleSheet } from '@/components/crew/RoleSheet';
import { SyncTripCard } from '@/components/sync/SyncTripCard';
import { MemberPickerSheet } from '@/components/trip/MemberPickerSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { AvatarStack, Card, ListRow } from '@/components/ui/bits';
import { toast, confirmAction } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { inviteMessage } from '@/services/share';
import { useActiveTrip, useAppStore, useMyTrips } from '@/store/useAppStore';
import type { Member } from '@/store/types';
import { space } from '@/theme';

export default function Crew() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <Hub key={trip.id} />;
}

/** The crew: the invitation, who is on the trip, polls, the shared checklist, and sharing the trip across phones. */
function Hub() {
  const trip = useActiveTrip()!;
  const myTrips = useMyTrips();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  // Actions are stable references, so read them without subscribing to the whole store.
  const s = useAppStore.getState();
  const owner = trip.ownerId === userId;

  const [shareOpen, setShareOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<Member | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const assignee = trip.tasks.find((k) => k.id === assignTaskId)?.assignee;

  return (
    <Screen
      header={<Header kicker={trip.name} title="The crew" backLabel="More" right={<AvatarStack people={trip.members} max={2} size={32} />} />}
      bottomInset={30}>
      <InviteCard trip={trip} owner={owner} onShare={() => setShareOpen(true)} />

      <View style={styles.block}>
        <MembersSection trip={trip} userId={userId} onPick={setRoleFor} onAdd={() => setAddOpen(true)} />
      </View>
      <View style={styles.block}>
        <PollsSection trip={trip} userId={userId} owner={owner} onNew={() => setPollOpen(true)} />
      </View>
      <View style={styles.block}>
        <ChecklistSection trip={trip} onAssign={setAssignTaskId} />
      </View>
      <View style={[styles.block, { marginTop: space.section - 14 }]}>
        <SyncTripCard trip={trip} />
      </View>
      <Card padded={false} style={[styles.switch, { paddingHorizontal: 14 }]}>
        <ListRow icon="swap-horizontal" label="Switch trip" sub={myTrips.length > 1 ? `${myTrips.length} trips` : 'All your trips, or start a new one'} onPress={() => router.push('/trips')} />
      </Card>

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
  block: { marginTop: space.section },
  switch: { marginTop: space.section },
});
