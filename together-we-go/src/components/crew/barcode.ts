/**
 * The strip of bars on the stub of the invitation. It is decoration only (hidden from screen readers), but it is made from the
 * invite code, so every trip prints its own strip and the same code always prints the same one.
 *
 * Returns a list of weights that alternate bar, gap, bar, gap... Each weight is 1 to 4. The strip always starts and ends on a bar,
 * and the first and last two bars are the same thin pair, like the guard bars of a real barcode.
 */
export function barcodeBars(code: string, count = 41): number[] {
  const n = count % 2 === 0 ? count + 1 : count; // bar, gap, bar ... bar: an odd number of parts
  let seed = 17;
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647;
    out.push(1 + (seed % 4));
  }
  // guard bars: thin, thin, gap, ... gap, thin, thin
  out[0] = 1;
  out[1] = 1;
  out[2] = 1;
  out[n - 1] = 1;
  out[n - 2] = 1;
  out[n - 3] = 1;
  return out;
}
