import type { ChatMessage } from '@/store/types';
import { dayLabel, time12, weekdayShort } from '@/utils/time';

/** Messages from one person within five minutes of each other share one name and one clock time. */
export const GROUP_MS = 5 * 60000;

const pad = (n: number) => String(n).padStart(2, '0');

/** A moment as the phone's own calendar date, like "2026-10-27". */
export function localYmd(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "3:42 PM" in the phone's own time zone. */
export function clock(ts: number): string {
  const d = new Date(ts);
  return time12(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

/** The label over a new day in the chat: Today, Yesterday, or "Fri Oct 30". */
export function dayHeading(ts: number, now: number = Date.now()): string {
  const ymd = localYmd(ts);
  if (ymd === localYmd(now)) return 'Today';
  if (ymd === localYmd(now - 86400000)) return 'Yesterday';
  return `${weekdayShort(ymd)} ${dayLabel(ymd)}`;
}

/** Does this message start a new day compared with the one before it? */
export const startsDay = (m: ChatMessage, prev: ChatMessage | undefined): boolean => !prev || localYmd(m.ts) !== localYmd(prev.ts);

/** The same person speaking again straight away: the second bubble hangs under the first. */
export const continues = (m: ChatMessage, prev: ChatMessage | undefined): boolean =>
  !!prev && prev.kind !== 'system' && m.kind !== 'system' && prev.authorId === m.authorId && m.ts - prev.ts < GROUP_MS && !startsDay(m, prev);

/** The last bubble of a run: the one that carries the clock time. */
export const endsRun = (m: ChatMessage, next: ChatMessage | undefined): boolean => !next || !continues(next, m);

/** System lines are written by the app, not typed by a person, so any emoji in them is dropped ("Sam joined the trip"). */
export function systemLine(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
