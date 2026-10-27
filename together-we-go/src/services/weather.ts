/**
 * Weather via Open-Meteo (free, no API key). Results are cached in the store
 * so the last forecast stays visible offline; if the network is down on first
 * load we fall back to a typical-climate estimate and label it as such.
 */
import { destinationById, type Destination } from '@/data/destinations';
import type { IconName } from '@/components/ui/bits';
import { useAppStore } from '@/store/useAppStore';
import type { WeatherSnapshot } from '@/store/types';
import { addDays, todayInTz } from '@/utils/time';

const CACHE_MS = 30 * 60 * 1000;

export function weatherInfo(code: number): { label: string; icon: IconName } {
  if (code === 0) return { label: 'Clear sky', icon: 'sunny' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'partly-sunny' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud-outline' };
  if (code <= 48) return { label: 'Foggy', icon: 'cloud-outline' };
  if (code <= 57) return { label: 'Drizzle', icon: 'rainy-outline' };
  if (code <= 67) return { label: 'Rain', icon: 'rainy-outline' };
  if (code <= 77) return { label: 'Snow', icon: 'snow-outline' };
  if (code <= 82) return { label: 'Rain showers', icon: 'rainy-outline' };
  if (code <= 86) return { label: 'Snow showers', icon: 'snow-outline' };
  return { label: 'Thunderstorms', icon: 'thunderstorm-outline' };
}

function estimate(d: Destination): WeatherSnapshot {
  // Rough climate model: warmer near the equator, seasonal swing by hemisphere.
  const month = new Date().getUTCMonth();
  const north = d.lat >= 0;
  const season = Math.cos(((month - (north ? 6.5 : 0.5)) / 12) * 2 * Math.PI);
  const base = 27 - Math.abs(d.lat) * 0.42 + season * Math.min(12, Math.abs(d.lat) * 0.3);
  const today = todayInTz(d.tz);
  const codes = [1, 2, 3, 61, 2, 0, 80];
  return {
    destinationId: d.id,
    fetchedAt: Date.now(),
    live: false,
    current: { temp: Math.round(base), code: 2, wind: 11, humidity: 64 },
    daily: codes.map((code, i) => ({
      date: addDays(today, i),
      max: Math.round(base + 3 + ((i * 7) % 3)),
      min: Math.round(base - 5 + ((i * 5) % 3)),
      code,
      rain: code >= 61 ? 60 : code === 3 ? 25 : 10,
    })),
  };
}

export async function fetchWeather(destinationId: string, force = false): Promise<WeatherSnapshot | undefined> {
  const d = destinationById(destinationId);
  if (!d) return undefined;
  const cached = useAppStore.getState().weather[destinationId];
  if (!force && cached?.live && Date.now() - cached.fetchedAt < CACHE_MS) return cached;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lng}` +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const snap: WeatherSnapshot = {
      destinationId,
      fetchedAt: Date.now(),
      live: true,
      current: {
        temp: Math.round(j.current.temperature_2m),
        code: j.current.weather_code,
        wind: Math.round(j.current.wind_speed_10m),
        humidity: Math.round(j.current.relative_humidity_2m),
      },
      daily: (j.daily.time as string[]).map((date, i) => ({
        date,
        max: Math.round(j.daily.temperature_2m_max[i]),
        min: Math.round(j.daily.temperature_2m_min[i]),
        code: j.daily.weather_code[i],
        rain: j.daily.precipitation_probability_max?.[i] ?? 0,
      })),
    };
    useAppStore.getState().setWeather(snap);
    return snap;
  } catch {
    if (cached) return cached;
    const est = estimate(d);
    useAppStore.getState().setWeather(est);
    return est;
  }
}

export function weatherSummary(w: WeatherSnapshot | undefined): string {
  if (!w) return 'Loading forecast…';
  const today = w.daily[0];
  const later = today && today.rain >= 50 ? ' · rain likely later' : today && today.rain >= 30 ? ' · chance of showers' : '';
  return `${weatherInfo(w.current.code).label.toLowerCase()}${later}`;
}

export const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
