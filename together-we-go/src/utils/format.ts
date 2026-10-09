import { currencyByCode } from '@/data/reference';

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Formats money with the right symbol and sensible decimals for the currency. */
export function money(amount: number, code = 'USD', opts: { decimals?: boolean } = {}): string {
  const cur = currencyByCode(code);
  const bigUnit = ['JPY', 'KRW', 'IDR', 'VND', 'ISK'].includes(code);
  const decimals = opts.decimals && !bigUnit ? 2 : 0;
  const n = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = amount < 0 ? '−' : '';
  const sym = cur?.symbol ?? `${code} `;
  return sym.length > 2 ? `${sign}${n} ${code}` : `${sign}${sym}${n}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type LengthFilter = 'any' | 'u1' | '1-2' | '2-4' | 'half' | 'full';

export const LENGTH_FILTERS: { key: LengthFilter; labelKey: string }[] = [
  { key: 'any', labelKey: 'len.any' },
  { key: 'u1', labelKey: 'len.u1' },
  { key: '1-2', labelKey: 'len.1-2' },
  { key: '2-4', labelKey: 'len.2-4' },
  { key: 'half', labelKey: 'len.half' },
  { key: 'full', labelKey: 'len.full' },
];

/** Buckets match the brief: under 1h, 1–2h, 2–4h, half day (4–6h), full day (6h+). */
export function matchesLength(min: number, f: LengthFilter): boolean {
  switch (f) {
    case 'any':
      return true;
    case 'u1':
      return min < 60;
    case '1-2':
      return min >= 60 && min <= 120;
    case '2-4':
      return min > 120 && min <= 240;
    case 'half':
      return min > 240 && min <= 360;
    case 'full':
      return min > 360;
  }
}

export function lengthBucketLabel(min: number): string {
  if (min < 60) return 'Under 1 hour';
  if (min <= 120) return '1–2 hours';
  if (min <= 240) return '2–4 hours';
  if (min <= 360) return 'Half day';
  return 'Full day';
}

export function priceTier(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 15) return '$';
  if (cost < 40) return '$$';
  return '$$$';
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function countdownLabel(ms: number): string {
  if (ms <= 0) return 'now';
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
