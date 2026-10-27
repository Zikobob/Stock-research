import { router } from 'expo-router';

import { Card, Divider, ListRow } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { shareText } from '@/services/share';
import { resetSync } from '@/sync/actions';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

/** Export, clearing the sample trips and resetting the app. */
export function DataCard() {
  const trip = useActiveTrip();
  const resetEverything = useAppStore((s) => s.resetEverything);
  const clearDemoData = useAppStore((s) => s.clearDemoData);
  const ensureSeed = useAppStore((s) => s.ensureSeed);

  return (
    <Card style={{ marginTop: 14 }}>
      {trip ? (
        <>
          <ListRow
            icon="download-outline"
            label="Export this trip"
            sub="Share a JSON backup of the itinerary, budget and checklist"
            onPress={() => {
              const { messages, photos, docs, ...rest } = trip;
              void messages;
              void photos;
              void docs;
              shareText(JSON.stringify(rest, null, 1), `${trip.name} backup`);
            }}
          />
          <Divider />
        </>
      ) : null}
      <ListRow
        icon="leaf-outline"
        label="Clear the sample trips"
        sub="Start with a blank app. Your own trips and accounts stay"
        onPress={() =>
          confirmAction(
            'Clear the sample trips?',
            'Amalfi Squad and the other example trips are removed from this phone. Trips you made yourself are not touched.',
            () => {
              clearDemoData();
              toast('Sample trips cleared');
            },
            { destructive: true, confirmLabel: 'Clear' },
          )
        }
      />
      <Divider />
      <ListRow
        icon="refresh-circle-outline"
        tint={colors.red}
        label="Reset app data"
        sub="Deletes all trips and accounts on this device"
        onPress={() =>
          confirmAction(
            'Reset everything?',
            'All trips, chats and accounts on this device will be erased and the demo data restored.',
            async () => {
              await resetSync(); // also forget which trips were shared with friends
              resetEverything();
              await ensureSeed();
              router.replace('/sign-in');
            },
            { destructive: true, confirmLabel: 'Reset' },
          )
        }
      />
    </Card>
  );
}
