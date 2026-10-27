import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { T } from '@/components/ui/T';
import { shareTrip, stopSharing } from '@/sync/actions';
import { effectiveServerUrl, useSyncPrefs } from '@/sync/prefs';
import { useSyncStatus } from '@/sync/status';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors } from '@/theme';

import { SyncBadge } from './SyncBadge';

/** On the Crew screen: share this trip with friends' phones, or see that it is already live. */
export function SyncTripCard({ trip }: { trip: Trip }) {
  const shared = useSyncStatus((s) => s.shared.includes(trip.id));
  const error = useSyncStatus((s) => s.error);
  const [busy, setBusy] = useState(false);
  useSyncPrefs((s) => s.serverUrl); // re-check when the address changes
  const hasServer = !!effectiveServerUrl();

  const start = async () => {
    setBusy(true);
    let r = await shareTrip(trip.id);
    setBusy(false);
    if (r.ok) return toast('Sharing! Friends can now join with the invite code');
    if (r.reason === 'code-taken') {
      return confirmAction(
        'Invite code already in use',
        `Another shared trip already uses ${trip.inviteCode}. To join that trip, use “Join a trip” instead. To share this one, give it a new code.`,
        async () => {
          useAppStore.getState().regenerateInvite(trip.id);
          setBusy(true);
          r = await shareTrip(trip.id);
          setBusy(false);
          toast(r.ok ? 'Sharing with a new invite code' : r.message, r.ok ? undefined : { tone: 'warn' });
        },
        { confirmLabel: 'New code and share' },
      );
    }
    toast(r.message, { tone: 'warn' });
  };

  return (
    <Card style={{ gap: 12, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <T variant="kicker" color={colors.textSecondary} accessibilityRole="header" style={{ flex: 1 }}>
          Sync across phones
        </T>
        <SyncBadge tripId={trip.id} />
      </View>
      {shared ? (
        <>
          <T variant="small" color={colors.textSecondary}>
            Chat, votes, the plan and expenses now update live on every phone in this trip. Changes made offline are sent when you are back online.
          </T>
          {error ? (
            <T variant="caption" color={colors.warn}>
              {error}. Your changes are saved here and will sync when the server is back.
            </T>
          ) : null}
          <Button
            label="Stop syncing on this phone"
            variant="secondary"
            size="md"
            onPress={() =>
              confirmAction('Stop syncing?', 'This trip stays on this phone, but it will no longer update with your friends’ phones.', async () => {
                await stopSharing(trip.id);
                toast('Syncing stopped for this trip');
              })
            }
          />
        </>
      ) : hasServer ? (
        <>
          <T variant="small" color={colors.textSecondary}>
            Share this trip so friends who join with the invite code see the same plan, chat and budget on their own phones.
          </T>
          <Button label="Share this trip across phones" icon="phone-portrait-outline" variant="secondary" loading={busy} onPress={start} />
        </>
      ) : (
        <>
          <T variant="small" color={colors.textSecondary}>
            Phones sync through a small server that runs on your computer. Set its address once and this trip can be shared.
          </T>
          <Button label="Set up sync" icon="settings-outline" variant="secondary" size="md" onPress={() => router.push('/settings')} />
        </>
      )}
    </Card>
  );
}
