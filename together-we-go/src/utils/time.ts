/**
 * Date & time-zone helpers. Trip dates are stored as plain 'YYYY-MM-DD' strings
 * in the destination's local time, flights as absolute UTC timestamps. Uses Intl
 * when available and falls back to a fixed-offset table.
 */

const FALLBACK_OFFSETS: Record<string, number> = {
  'Asia/Tokyo': 540, 'Asia/Seoul': 540, 'Asia/Shanghai': 480, 'Asia/Hong_Kong': 480, 'Asia/Taipei': 480,
  'Asia/Singapore': 480, 'Asia/Makassar': 480, 'Asia/Kuala_Lumpur': 480, 'Asia/Manila': 480,
  'Asia/Bangkok': 420, 'Asia/Jakarta': 420, 'Asia/Ho_Chi_Minh': 420, 'Asia/Kolkata': 330,
  'Indian/Maldives': 300, 'Asia/Dubai': 240, 'Asia/Qatar': 180, 'Europe/Istanbul': 180,
  'Europe/London': 0, 'Europe/Dublin': 0, 'Europe/Lisbon': 0, 'Atlantic/Reykjavik': 0,
  'Europe/Paris': 60, 'Europe/Rome': 60, 'Europe/Madrid': 60, 'Europe/Berlin': 60, 'Europe/Amsterdam': 60,
  'Europe/Zurich': 60, 'Europe/Prague': 60, 'Europe/Vienna': 60, 'Africa/Casablanca': 60,
  'Europe/Athens': 120, 'Africa/Johannesburg': 120, 'Africa/Cairo': 120, 'Africa/Nairobi': 180,
  'Australia/Sydney': 600, 'Australia/Melbourne': 600, 'Pacific/Auckland': 720,
  'America/New_York': -300, 'America/Toronto': -300, 'America/Detroit': -300, 'America/Chicago': -360,
  'America/Denver': -420, 'America/Edmonton': -420, 'America/Phoenix': -420,
  'America/Los_Angeles': -480, 'America/Vancouver': -480, 'Pacific/Honolulu': -600,
  'America/Mexico_City': -360, 'America/Cancun': -300, 'America/Lima': -300, 'America/Bogota': -300,
  'America/Sao_Paulo': -180, 'America/Argentina/Buenos_Aires': -180, 'America/Santiago': -240, UTC: 0,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}

export function ymdFromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function isValidYMD(ymd: string): boolean {
  if (!YMD_RE.test(ymd)) return false;
  const { y, m, d } = parseYMD(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(ymd: string, n: number): string {
  const { y, m, d } = parseYMD(ymd);
  return ymdFromUtcDate(new Date(Date.UTC(y, m - 1, d + n)));
}

export function daysBetween(a: string, b: string): number {
  const pa = parseYMD(a);
  const pb = parseYMD(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function tripDays(start: string, end: string): string[] {
  const n = Math.max(0, daysBetween(start, end));
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export function weekdayShort(ymd: string): string {
  const { y, m, d } = parseYMD(ymd);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function dayLabel(ymd: string): string {
  const { m, d } = parseYMD(ymd);
  return `${MONTHS[m - 1]} ${d}`;
}

export function rangeLabel(start: string, end: string): string {
  const a = parseYMD(start);
  const b = parseYMD(end);
  if (a.y === b.y) return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
  return `${MONTHS[a.m - 1]} ${a.d}, ${a.y} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}

export function time12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Minutes east of UTC for `tz` at the given instant. */
export function tzOffsetMinutes(tz: string, utcMs: number): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    const off = Math.round((asUtc - utcMs) / 60000);
    if (Number.isFinite(off)) return off;
  } catch {
    // fall through to table
  }
  if (tz === deviceTimeZone()) return -new Date(utcMs).getTimezoneOffset();
  return FALLBACK_OFFSETS[tz] ?? 0;
}

/** Converts a wall-clock time in `tz` to a UTC epoch (ms). */
export function zonedToUtc(ymd: string, hhmm: string, tz: string): number {
  const { y, m, d } = parseYMD(ymd);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = tzOffsetMinutes(tz, guess);
  let result = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(tz, result);
  if (off2 !== off1) result = guess - off2 * 60000;
  return result;
}

/** Wall-clock parts of a UTC instant in a given zone. */
export function partsInTz(utcMs: number, tz: string) {
  const local = new Date(utcMs + tzOffsetMinutes(tz, utcMs) * 60000);
  return {
    ymd: ymdFromUtcDate(local),
    hhmm: `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export function formatInTz(utcMs: number, tz: string): string {
  const p = partsInTz(utcMs, tz);
  return `${dayLabel(p.ymd)} · ${p.hhmm}`;
}

export function utcOffsetLabel(tz: string, at = Date.now()): string {
  const off = tzOffsetMinutes(tz, at);
  const sign = off >= 0 ? '+' : '−';
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

const ABBREV: Record<string, string> = {
  'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
  'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT', 'America/Los_Angeles': 'PT',
  'Asia/Singapore': 'SGT', 'Asia/Bangkok': 'ICT', 'Australia/Sydney': 'AET', 'Asia/Kolkata': 'IST',
};

export function tzAbbrev(tz: string): string {
  return ABBREV[tz] ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

/** Signed hour difference: positive when `tzA` is ahead of `tzB`. */
export function hoursAhead(tzA: string, tzB: string, at = Date.now()): number {
  return (tzOffsetMinutes(tzA, at) - tzOffsetMinutes(tzB, at)) / 60;
}

export function todayInTz(tz: string): string {
  return partsInTz(Date.now(), tz).ymd;
}

export function greetingFor(hour: number): string {
  if (hour < 5) return 'greet.night';
  if (hour < 12) return 'greet.morning';
  if (hour < 18) return 'greet.afternoon';
  return 'greet.evening';
}
