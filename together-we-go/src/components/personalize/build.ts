/** The numbers behind the "Building your trip HQ" moment. Pure, so tests can check them. */
import { BUILD_LINES } from './options';

/** The number climbs for this long (ms), then holds briefly before the app is put on. The whole moment is about two seconds. */
export const BUILD_DURATION = 1800;
export const BUILD_TICK = 200;
export const BUILD_HOLD = 450;

/** How far along the build is after `ms`: quick at first, slowing toward 100 (a whole number from 0 to 100). */
export function buildPercent(ms: number): number {
  const t = Math.max(0, Math.min(1, ms / BUILD_DURATION));
  return Math.round(100 * (1 - (1 - t) ** 2));
}

/** How many of the status lines are ticked at a given percentage (a third each; the last one only at 100). */
export function linesDone(pct: number): number {
  return BUILD_LINES.filter((_, i) => pct >= Math.round(((i + 1) * 100) / BUILD_LINES.length)).length;
}
