/**
 * Exchange rates from open.er-api.com (free, no key), cached for 6 hours and
 * persisted for offline use. Falls back to bundled reference rates.
 */
import { currencies } from '@/data/reference';
import { useAppStore } from '@/store/useAppStore';
import type { RatesSnapshot } from '@/store/types';

const CACHE_MS = 6 * 60 * 60 * 1000;

export function fallbackRates(): RatesSnapshot {
  const rates: Record<string, number> = {};
  currencies.forEach((c) => (rates[c.code] = c.perUsd));
  return { base: 'USD', rates, fetchedAt: 0, live: false };
}

export async function fetchRates(force = false): Promise<RatesSnapshot> {
  const cached = useAppStore.getState().rates;
  if (!force && cached?.live && Date.now() - cached.fetchedAt < CACHE_MS) return cached;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await res.json();
    if (j.result !== 'success' || !j.rates) throw new Error('bad response');
    const snap: RatesSnapshot = { base: 'USD', rates: j.rates, fetchedAt: Date.now(), live: true };
    useAppStore.getState().setRates(snap);
    return snap;
  } catch {
    return cached ?? fallbackRates();
  }
}

export function convert(amount: number, from: string, to: string, rates: RatesSnapshot | null): number {
  const r = rates?.rates ?? fallbackRates().rates;
  const f = r[from] ?? fallbackRates().rates[from] ?? 1;
  const t = r[to] ?? fallbackRates().rates[to] ?? 1;
  return (amount / f) * t;
}

export function useRates(): RatesSnapshot {
  return useAppStore((s) => s.rates) ?? fallbackRates();
}
