import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { checkDueReminders, syncReminders } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';

/**
 * Invisible component that keeps reminders live:
 * - re-schedules OS notifications whenever reminder-relevant data changes
 * - polls every 20 s while the app is open to surface due reminders in-app
 */
export function ReminderService() {
  const trips = useAppStore((s) => s.trips);
  const lead = useAppStore((s) => s.settings.reminderLeadMin);
  const enabled = useAppStore((s) => s.settings.notificationsEnabled);
  const userId = useAppStore((s) => s.session?.userId);

  const signature = useMemo(
    () =>
      [lead, enabled, userId]
        .concat(trips.flatMap((t) => t.activities.filter((a) => a.reminder).map((a) => `${a.id}|${a.date}|${a.time}`)))
        .join(','),
    [trips, lead, enabled, userId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      syncReminders().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [signature]);

  useEffect(() => {
    checkDueReminders();
    const id = setInterval(checkDueReminders, 20000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && checkDueReminders());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return null;
}
