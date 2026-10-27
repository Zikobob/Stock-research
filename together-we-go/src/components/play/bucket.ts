/** How far each ticket on the bucket list is turned, in degrees: alternating left and right, a couple of degrees at most (like paper stuck on a board). */
const TILTS = [-2, 1.5, -1.2, 2, -1.8, 1];

export function tiltFor(index: number): number {
  return TILTS[((index % TILTS.length) + TILTS.length) % TILTS.length];
}
