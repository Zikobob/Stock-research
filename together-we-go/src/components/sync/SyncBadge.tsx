import { Pill } from '@/components/ui/bits';
import { useSyncStatus } from '@/sync/status';

/** A small pill that says whether a shared trip is up to date: "Live · 2 phones", "Offline · 3 waiting"... */
export function SyncBadge({ tripId }: { tripId: string }) {
  const shared = useSyncStatus((s) => s.shared.includes(tripId));
  const online = useSyncStatus((s) => s.online);
  const pending = useSyncStatus((s) => s.pending);
  const peers = useSyncStatus((s) => s.peers);
  if (!shared) return null;
  if (online === false) return <Pill label={pending ? `Offline · ${pending} waiting` : 'Offline'} tone="yellow" />;
  if (online === null) return <Pill label="Connecting…" tone="gray" />;
  return <Pill label={peers > 1 ? `Live · ${peers} phones` : 'Live'} tone="green" />;
}
