/**
 * Live activity reminders.
 * - iOS / Android: real local notifications scheduled with expo-notifications
 *   (they fire even when the app is closed).
 * - Every platform: an in-app watcher adds due reminders to the notification
 *   centre and, on web, shows a toast + browser notification.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { toast } from '@/components/ui/feedback';
import { destinationById } from '@/data/destinations';
import { tripStatus, useAppStore } from '@/store/useAppStore';
import type { Activity, Trip } from '@/store/types';
import { time12, zonedToUtc } from '@/utils/time';

const isNative = Platform.OS !== 'web';
let initialised = false;

export function initNotifications() {
  if (initialised || !isNative) return;
  initialised = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('reminders', {
      name: 'Activity reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#1F4D25',
    }).catch(() => {});
  }
  Notifications.addNotificationResponseReceivedListener((resp) => {
    const route = resp.notification.request.content.data?.route;
    if (typeof route === 'string') setTimeout(() => router.push(route as never), 300);
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNative) {
    // Browsers may leave the prompt unanswered forever, so never block on it:
    // ask in the background and rely on in-app toasts until it's granted.
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    }
    return false;
  }
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export function activityStartUtc(trip: Trip, a: Activity): number {
  const tz = destinationById(trip.destinationId)?.tz ?? 'UTC';
  return zonedToUtc(a.date, a.time, tz);
}

export function reminderBody(trip: Trip, a: Activity, lead: number) {
  return {
    title: `⏰ ${a.title} in ${lead} min`,
    body: `${time12(a.time)} · ${a.location} — ${trip.name}`,
  };
}

/** Reschedules every reminder for the signed-in user's upcoming activities. */
export async function syncReminders(): Promise<number> {
  const s = useAppStore.getState();
  if (!isNative) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return 0;
  }
  if (!s.settings.notificationsEnabled || !s.session) return 0;
  const granted = (await Notifications.getPermissionsAsync().catch(() => null))?.granted;
  if (!granted) return 0;
  const lead = s.settings.reminderLeadMin;
  const now = Date.now();
  const due: { at: number; trip: Trip; a: Activity }[] = [];
  for (const trip of s.trips) {
    if (!trip.members.some((m) => m.id === s.session?.userId) || tripStatus(trip) === 'completed') continue;
    for (const a of trip.activities) {
      if (!a.reminder) continue;
      const at = activityStartUtc(trip, a) - lead * 60000;
      if (at > now + 5000 && at < now + 45 * 86400000) due.push({ at, trip, a });
    }
  }
  due.sort((x, y) => x.at - y.at);
  for (const { at, trip, a } of due.slice(0, 48)) {
    const { title, body } = reminderBody(trip, a, lead);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { route: '/(tabs)/itinerary', tripId: trip.id, activityId: a.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'reminders' },
    }).catch(() => {});
  }
  return Math.min(due.length, 48);
}

function browserNotify(title: string, body: string) {
  try {
    if (!isNative && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  } catch {
    // ignore
  }
}

/** Sends a sample reminder in a few seconds so the feature can be demoed live. */
export async function sendTestReminder(seconds = 5) {
  const s = useAppStore.getState();
  const trip = s.trips.find((x) => x.id === s.activeTripId);
  const a = trip?.activities.find((x) => x.reminder) ?? trip?.activities[0];
  const title = a ? `⏰ ${a.title} starts soon` : '⏰ Test reminder';
  const body = a && trip ? `${time12(a.time)} · ${a.location} — ${trip.name}` : 'Reminders are working!';
  await ensurePermission();
  if (isNative) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { route: '/(tabs)/itinerary' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'reminders' },
    }).catch(() => {});
  }
  setTimeout(() => {
    useAppStore.getState().pushNotification({ kind: 'reminder', title, body, tripId: trip?.id, route: '/(tabs)/itinerary' });
    if (!isNative) {
      toast(`${title} — ${body}`, { icon: 'alarm-outline', tone: 'info' });
      browserNotify(title, body);
    }
  }, seconds * 1000);
}

/** Called on an interval while the app is open: surfaces reminders that just came due. */
export function checkDueReminders() {
  const s = useAppStore.getState();
  if (!s.session || !s.settings.notificationsEnabled) return;
  const lead = s.settings.reminderLeadMin;
  const now = Date.now();
  for (const trip of s.trips) {
    if (!trip.members.some((m) => m.id === s.session?.userId)) continue;
    for (const a of trip.activities) {
      if (!a.reminder) continue;
      const start = activityStartUtc(trip, a);
      const fireAt = start - lead * 60000;
      const key = `${a.id}@${a.date}T${a.time}-${lead}`;
      if (now >= fireAt && now < start && !s.firedReminders[key]) {
        s.markReminderFired(key);
        const { title, body } = reminderBody(trip, a, Math.max(1, Math.round((start - now) / 60000)));
        s.pushNotification({ kind: 'reminder', title, body, tripId: trip.id, route: '/(tabs)/itinerary' });
        if (!isNative) {
          toast(`${title}`, { icon: 'alarm-outline', tone: 'info' });
          browserNotify(title, body);
        }
      }
    }
  }
}

/** The next upcoming reminder-enabled activity across the active trip (for the "live" banner). */
export function nextUpcoming(trip: Trip | undefined): { a: Activity; startUtc: number } | null {
  if (!trip) return null;
  const now = Date.now();
  let best: { a: Activity; startUtc: number } | null = null;
  for (const a of trip.activities) {
    const st = activityStartUtc(trip, a);
    if (st > now - 30 * 60000 && (!best || st < best.startUtc)) best = { a, startUtc: st };
  }
  return best;
}
