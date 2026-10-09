import { router } from 'expo-router';

import { ListRow } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Sheet } from '@/components/ui/Sheet';
import { printPlanner, sharePlannerPdf } from '@/services/print';
import { inviteMessage, shareText } from '@/services/share';
import { tripStatus, useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

export function TripMenuSheet({ visible, onClose, trip }: { visible: boolean; onClose: () => void; trip: Trip }) {
  const userId = useAppStore((s) => s.session?.userId);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const leaveTrip = useAppStore((s) => s.leaveTrip);
  const deleteTrip = useAppStore((s) => s.deleteTrip);
  const owner = trip.ownerId === userId;
  const status = tripStatus(trip);
  const go = (href: Parameters<typeof router.push>[0]) => {
    onClose();
    setTimeout(() => router.push(href), 180);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={trip.name} subtitle="Trip options">
      <ListRow icon="swap-horizontal" label="Switch or create trip" sub="All your group trips in one place" onPress={() => go('/trips')} />
      <ListRow icon="create-outline" label="Edit trip details" sub="Name, dates and group budget" onPress={() => go({ pathname: '/new-trip', params: { edit: trip.id } })} />
      <ListRow icon="map-outline" label="Trip map" onPress={() => go('/map')} />
      <ListRow icon="airplane-outline" label="Flights & arrivals" onPress={() => go('/flights')} />
      <ListRow
        icon="print-outline"
        label="Print planner"
        sub="A clean day-by-day printout with checkboxes"
        onPress={async () => {
          onClose();
          try {
            await printPlanner(trip);
          } catch {
            toast('Allow pop-ups to print the planner', { tone: 'warn' });
          }
        }}
      />
      <ListRow
        icon="document-text-outline"
        label="Save planner as PDF"
        sub="Share it to Files, email or the group chat"
        onPress={async () => {
          onClose();
          await sharePlannerPdf(trip).catch(() => toast('Couldn’t create the PDF', { tone: 'warn' }));
        }}
      />
      <ListRow icon="share-social-outline" label="Share invite" sub={`Code ${trip.inviteCode}`} onPress={() => shareText(inviteMessage(trip.name, trip.inviteCode))} />
      <ListRow icon="trophy-outline" label="Trip recap" sub="Stats, highlights and memories" onPress={() => go('/recap')} />
      <ListRow
        icon={status === 'completed' ? 'refresh-outline' : 'flag-outline'}
        label={status === 'completed' ? 'Reopen trip' : 'Mark trip as complete'}
        sub={status === 'completed' ? 'Move it back to planning' : 'Wrap up, settle balances and see the recap'}
        onPress={() => {
          const done = status !== 'completed';
          updateTrip(trip.id, { completed: done });
          onClose();
          toast(done ? 'Trip completed 🎉 — here’s your recap' : 'Trip reopened');
          if (done) setTimeout(() => router.push('/recap'), 250);
        }}
      />
      {owner ? (
        <ListRow
          icon="trash-outline"
          tint={colors.red}
          label="Delete trip"
          sub="Removes it for everyone on this device"
          onPress={() => {
            onClose();
            confirmAction('Delete this trip?', `“${trip.name}” and all its plans, expenses and chats will be deleted. This can’t be undone.`, () => {
              deleteTrip(trip.id);
              toast('Trip deleted');
              router.navigate('/(tabs)/explore');
            }, { confirmLabel: 'Delete trip', destructive: true });
          }}
        />
      ) : (
        <ListRow
          icon="exit-outline"
          tint={colors.red}
          label="Leave trip"
          onPress={() => {
            onClose();
            confirmAction('Leave this trip?', 'You can rejoin later with the invite code.', () => {
              leaveTrip(trip.id);
              toast('You left the trip');
              router.navigate('/(tabs)/explore');
            }, { confirmLabel: 'Leave', destructive: true });
          }}
        />
      )}
    </Sheet>
  );
}
