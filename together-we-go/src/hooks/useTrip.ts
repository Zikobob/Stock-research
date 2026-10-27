import { useEffect, useState } from 'react';

import { destinationById } from '@/data/destinations';
import { fetchRates } from '@/services/currency';
import { fetchWeather } from '@/services/weather';
import { useAppStore } from '@/store/useAppStore';
import type { Trip, WeatherSnapshot } from '@/store/types';

/** Cached weather for a destination; refreshes in the background when online. */
export function useWeather(destinationId: string | undefined): WeatherSnapshot | undefined {
  const snap = useAppStore((s) => (destinationId ? s.weather[destinationId] : undefined));
  useEffect(() => {
    if (destinationId) fetchWeather(destinationId).catch(() => {});
  }, [destinationId]);
  return snap;
}

export function useTripDestination(trip: Trip | undefined) {
  return trip ? destinationById(trip.destinationId) : undefined;
}

/** Re-renders every `ms` so countdowns and "time ago" labels stay live. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useRatesLoader() {
  useEffect(() => {
    fetchRates().catch(() => {});
  }, []);
}
