/**
 * The small decisions Home makes, with no React in them so they can be tested: what the big countdown says,
 * whether the budget is fine, who owes whom, which activity is next, what is up for a vote, the podium,
 * which weather to show (and whether to call it a forecast or "typical").
 */
import type { Activity, HomeSection, Member, Trip, WeatherSnapshot } from '@/store/types';
import { money, countdownLabel } from '@/utils/format';
import { settlePlan } from '@/utils/money';
import type { Standing } from '@/utils/points';
import { daysBetween, partsInTz, time12, tripDays, zonedToUtc } from '@/utils/time';

export type HeroStatus = 'planning' | 'active' | 'completed' | null;

// ---------------------------------------------------------------------------------------------
// The headline

export interface CountdownView {
  kind: 'days' | 'today' | 'day' | 'complete' | 'none';
  /** The big rolling number: days to go, or the day of the trip. */
  number?: number;
  /** Display-type words after the number (or alone): ["Days", "to go"], ["of 6"], ["Today"]. */
  words: string[];
  /** A word before the number ("Day" in DAY 2 OF 6). */
  prefix?: string;
  /** What a screen reader says. */
  sentence: string;
}

/**
 * What the big headline says. Planning: the days left ("1 DAY TO GO" in the singular). The first day of the trip:
 * "TODAY". After that: "DAY 2" with "OF 5". Finished: "TRIP COMPLETE". No trip yet: "WHERE TO NEXT?".
 */
export function countdownView(status: HeroStatus, daysToGo: number, dayNo: number, tripLen: number): CountdownView {
  if (status === null) return { kind: 'none', words: ['Where to next?'], sentence: 'Where to next?' };
  if (status === 'completed') return { kind: 'complete', words: ['Trip complete'], sentence: 'Trip complete' };
  if (status === 'planning' && daysToGo >= 1) {
    return { kind: 'days', number: daysToGo, words: [daysToGo === 1 ? 'Day' : 'Days', 'to go'], sentence: `${daysToGo} ${daysToGo === 1 ? 'day' : 'days'} to go` };
  }
  if (status === 'active' && dayNo > 1) {
    return { kind: 'day', number: dayNo, prefix: 'Day', words: [`of ${tripLen}`], sentence: `Day ${dayNo} of ${tripLen}` };
  }
  return { kind: 'today', words: ['Today'], sentence: tripLen > 1 ? `Today is the first day of your ${tripLen} day trip` : 'Today is the day' };
}

/** The key that remembers "1 day to go" was already celebrated for this trip on this day. */
export const celebrateKey = (tripId: string, day: string) => `celebrate:${tripId}:${day}`;

/** True once: on the last day before the trip, and not yet celebrated. */
export function shouldCelebrateOneDay(status: HeroStatus, daysToGo: number, fired: Record<string, number>, tripId: string, today: string): boolean {
  return status === 'planning' && daysToGo === 1 && !(celebrateKey(tripId, today) in fired);
}

// ---------------------------------------------------------------------------------------------
// Which blocks have something to show

export interface BlockContext {
  hasTrip: boolean;
  status: HeroStatus;
  hasPicks: boolean;
  hasDestination: boolean;
}

/** A block with nothing to show is left out completely, so there is no empty gap on the page. */
export function blockHasContent(section: HomeSection, c: BlockContext): boolean {
  switch (section) {
    case 'upnext':
    case 'weather':
      return c.hasTrip && c.status !== 'completed';
    case 'budget':
    case 'crew':
      return c.hasTrip;
    case 'forYou':
      return c.hasPicks;
    case 'nearby':
      return c.hasTrip && c.hasDestination;
    case 'play':
    case 'discover':
      return true;
  }
}

// ---------------------------------------------------------------------------------------------
// Up next

/** The next activity that is really planned (not one still being voted on, not one already ticked off). */
export function nextPlanned(activities: Activity[], tz: string, now: number): { a: Activity; startUtc: number } | null {
  let best: { a: Activity; startUtc: number } | null = null;
  for (const a of activities) {
    if (a.status === 'voting' || a.done) continue;
    const startUtc = zonedToUtc(a.date, a.time, tz);
    if (startUtc > now - 30 * 60000 && (!best || startUtc < best.startUtc)) best = { a, startUtc };
  }
  return best;
}

/** "in 3d 13h", or "Now" once it has begun. */
export function startsIn(ms: number): string {
  if (ms <= 0) return 'Now';
  if (ms < 60000) return 'in 1m';
  return `in ${countdownLabel(ms)}`;
}

/** The "open in maps" link for an activity: exact coordinates when it has them, otherwise a search for its name. */
export function mapsUrl(a: Pick<Activity, 'lat' | 'lng' | 'title' | 'location'>): string {
  const q = a.lat && a.lng ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.title} ${a.location}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Today's checklist: the planned things on `today`, earliest first (things still being voted on are not part of the plan yet). */
export function todaysChecklist(activities: Activity[], today: string): Activity[] {
  return activities.filter((a) => a.date === today && a.status !== 'voting').sort((a, b) => a.time.localeCompare(b.time));
}

// ---------------------------------------------------------------------------------------------
// Budget

export type BudgetTone = 'ok' | 'warn' | 'over';

export interface BudgetView {
  /** 0 to well over 1. */
  ratio: number;
  pct: number;
  tone: BudgetTone;
  /** The state in words (a colour alone is never the signal). */
  word: string;
  detail: string;
  left: number;
}

/** Under 80% is fine, 80 to 100% is close, above 100% is over. */
export function budgetView(spent: number, budget: number): BudgetView {
  if (budget <= 0) return { ratio: 0, pct: 0, tone: 'ok', word: 'No limit set', detail: 'Add a group budget to track it', left: 0 };
  const ratio = spent / budget;
  const pct = Math.round(ratio * 100);
  const left = budget - spent;
  if (ratio > 1) return { ratio, pct, tone: 'over', word: 'Over budget', detail: `${money(spent - budget)} over`, left };
  if (ratio >= 0.8) return { ratio, pct, tone: 'warn', word: 'Getting close', detail: `${pct}% used · ${money(left)} left`, left };
  return { ratio, pct, tone: 'ok', word: 'On track', detail: `${pct}% used · ${money(left)} left`, left };
}

export interface OweLine {
  tone: 'owe' | 'owed' | 'square' | 'other';
  text: string;
}

const firstName = (members: Member[], id: string) => members.find((m) => m.id === id)?.name.split(' ')[0] ?? 'Someone';

/** One line about the money between friends: "You owe Priya $382", "Diego owes you $90", "Everyone is square". */
export function oweLine(trip: Pick<Trip, 'members' | 'expenses'>, userId: string): OweLine {
  if (!trip.expenses.some((e) => !e.settlement)) return { tone: 'square', text: 'Nothing to split yet' };
  const plan = settlePlan(trip);
  if (!plan.length) return { tone: 'square', text: 'Everyone is square' };
  const out = plan.filter((p) => p.from === userId);
  const into = plan.filter((p) => p.to === userId);
  const sum = (xs: typeof plan) => xs.reduce((n, p) => n + p.amount, 0);
  if (out.length === 1) return { tone: 'owe', text: `You owe ${firstName(trip.members, out[0].to)} ${money(out[0].amount)}` };
  if (out.length > 1) return { tone: 'owe', text: `You owe ${money(sum(out))} in ${out.length} payments` };
  if (into.length === 1) return { tone: 'owed', text: `${firstName(trip.members, into[0].from)} owes you ${money(into[0].amount)}` };
  if (into.length > 1) return { tone: 'owed', text: `You’re owed ${money(sum(into))} by ${into.length} people` };
  return { tone: 'other', text: `${plan.length} ${plan.length === 1 ? 'payment settles' : 'payments settle'} everyone up` };
}

// ---------------------------------------------------------------------------------------------
// Crew, podium, vote

export const crewCue = (m: Pick<Member, 'invited'>): 'Going' | 'Invited' => (m.invited ? 'Invited' : 'Going');

export function crewCounts(members: Pick<Member, 'invited'>[]): { going: number; invited: number } {
  const invited = members.filter((m) => m.invited).length;
  return { going: members.length - invited, invited };
}

export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

export interface Ranked extends Standing {
  rank: number;
}

export interface PodiumView {
  /** The top three, best first. */
  top: Ranked[];
  /** The signed-in person when they are not on the podium. */
  me: Ranked | null;
}

/** The podium needs at least two people and some points; otherwise there is nothing to show yet. */
export function podiumView(standings: Standing[], userId: string): PodiumView | null {
  if (standings.length < 2 || !standings.some((s) => s.points > 0)) return null;
  const ranked = standings.map((s, i) => ({ ...s, rank: i + 1 }));
  const mine = ranked.find((s) => s.memberId === userId);
  return { top: ranked.slice(0, 3), me: mine && mine.rank > 3 ? mine : null };
}

/** The first activity still being voted on that this person has not voted on, earliest first. */
export function nextToVote(activities: Activity[], userId: string): Activity | undefined {
  return activities
    .filter((a) => a.status === 'voting' && !(userId in a.votes))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
}

export function votingCount(activities: Activity[]): number {
  return activities.filter((a) => a.status === 'voting').length;
}

export function voteTally(a: Pick<Activity, 'votes'>, memberCount: number) {
  const ups = Object.values(a.votes).filter((v) => v === 1).length;
  const downs = Object.values(a.votes).filter((v) => v === -1).length;
  return { ups, downs, needed: Math.floor(memberCount / 2) + 1 };
}

/** How an answer button looks once today's question is answered. */
export function answerState(index: number, answer: number, picked: number | null): 'open' | 'right' | 'wrong' | 'reveal' | 'dim' {
  if (picked === null) return 'open';
  if (index === answer) return index === picked ? 'right' : 'reveal';
  return index === picked ? 'wrong' : 'dim';
}

// ---------------------------------------------------------------------------------------------
// Weather

export interface WeatherDay {
  date: string;
  max: number;
  min: number;
  /** A weather code from the forecast; typical days have none and pick an icon from the temperature. */
  code: number | null;
}

export interface WeatherView {
  kind: 'forecast' | 'typical';
  title: string;
  note: string;
  days: WeatherDay[];
}

/** How many days ahead the free forecast reaches in practice: past this the card says "Typical weather". */
export const FORECAST_HORIZON_DAYS = 10;

/**
 * A rough climate for a place and month: the yearly average falls with latitude, the seasons swing more far from the equator,
 * and the warmest month comes after the summer solstice. Close enough to say "usual temperatures" and not to call a forecast.
 */
export function typicalDay(lat: number, date: string): WeatherDay {
  const month = Number(date.slice(5, 7)) - 1;
  const mean = 28 - 0.0072 * lat * lat;
  const swing = Math.min(12, Math.abs(lat) * 0.22);
  const peak = lat >= 0 ? 6.8 : 0.8;
  const t = mean + swing * Math.cos(((month + 0.5 - peak) / 12) * 2 * Math.PI);
  return { date, max: Math.round(t + 4), min: Math.round(t - 4), code: null };
}

export function monthName(date: string): string {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(date.slice(5, 7)) - 1] ?? '';
}

/**
 * What the weather card shows. A real forecast only for trip days the forecast really covers and only when it is live;
 * a trip further away than {@link FORECAST_HORIZON_DAYS}, or no connection, shows typical temperatures for the month, labelled as such.
 */
export function weatherView(input: { startDate: string; endDate: string; today: string; lat: number; snapshot: WeatherSnapshot | undefined }): WeatherView {
  const { startDate, endDate, today, lat, snapshot } = input;
  const daysToGo = daysBetween(today, startDate);
  const days = tripDays(startDate, endDate).filter((d) => d >= today);
  if (daysToGo <= FORECAST_HORIZON_DAYS && snapshot?.live) {
    const covered = snapshot.daily.filter((d) => days.includes(d.date)).map((d) => ({ date: d.date, max: d.max, min: d.min, code: d.code }));
    if (covered.length) return { kind: 'forecast', title: 'Forecast', note: 'Live forecast for your trip days', days: covered.slice(0, 7) };
  }
  const first = days[0] ?? startDate;
  const note =
    daysToGo > FORECAST_HORIZON_DAYS
      ? `Usual temperatures for ${monthName(first)}. The real forecast appears ${FORECAST_HORIZON_DAYS} days before you go.`
      : `Usual temperatures for ${monthName(first)}. The live forecast is not available right now.`;
  return { kind: 'typical', title: 'Typical weather', note, days: days.slice(0, 7).map((d) => typicalDay(lat, d)) };
}

/** An icon for a typical day (a real forecast has a weather code and uses that). */
export function typicalIcon(max: number): 'sunny' | 'partly-sunny' | 'cloud-outline' {
  if (max >= 28) return 'sunny';
  if (max >= 12) return 'partly-sunny';
  return 'cloud-outline';
}

/** "3:41 PM in Positano · 9:41 AM at home". */
export function timeLine(now: number, tz: string, homeTz: string, city: string): string {
  const there = time12(partsInTz(now, tz).hhmm);
  const home = time12(partsInTz(now, homeTz).hhmm);
  return there === home ? `${there} in ${city}, same as at home` : `${there} in ${city} · ${home} at home`;
}
