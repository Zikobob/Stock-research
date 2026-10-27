import * as Notifications from 'expo-notifications';

import { TRIVIA_REMINDER } from '@/data/personal';

import { setTriviaReminder } from '../notifications';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const n = jest.mocked(Notifications);

describe('the daily trivia reminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules one notification a day at the same time when it is switched on', async () => {
    expect(await setTriviaReminder(true)).toBe(true);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = n.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe(TRIVIA_REMINDER.id);
    expect(arg.content.title).toBe(TRIVIA_REMINDER.title);
    expect(arg.trigger).toMatchObject({ type: 'daily', hour: TRIVIA_REMINDER.hour, minute: TRIVIA_REMINDER.minute });
  });

  it('replaces the old one instead of piling up a second', async () => {
    await setTriviaReminder(true);
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith(TRIVIA_REMINDER.id);
  });

  it('takes it off the calendar when it is switched off, without asking for permission', async () => {
    expect(await setTriviaReminder(false)).toBe(true);
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith(TRIVIA_REMINDER.id);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('says no, and schedules nothing, when the phone refuses notifications', async () => {
    n.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    n.requestPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    expect(await setTriviaReminder(true)).toBe(false);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('says no instead of crashing when scheduling fails', async () => {
    n.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
    expect(await setTriviaReminder(true)).toBe(false);
  });
});
