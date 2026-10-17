/**
 * A hybrid logical clock. Every change gets a stamp that is unique and sortable as plain text:
 *   "<13-digit milliseconds>-<4-char counter>-<device id>"
 * Two phones with slightly different clocks still agree on the order of changes, because a phone that sees a
 * newer stamp from a friend moves its own clock forward before it makes the next change.
 */
export interface ClockState {
  ms: number;
  counter: number;
}

export class HybridClock {
  private last: ClockState = { ms: 0, counter: 0 };

  constructor(
    private readonly node: string,
    private readonly now: () => number = Date.now,
  ) {}

  /** A new stamp, always bigger than every stamp this clock has made or seen. */
  next(): string {
    const ms = Math.max(this.now(), this.last.ms);
    const counter = ms === this.last.ms ? this.last.counter + 1 : 0;
    this.last = { ms, counter };
    return format(ms, counter, this.node);
  }

  /** Call with every stamp received from another phone so our next stamp is newer. */
  observe(stamp: string): void {
    const parsed = parseStamp(stamp);
    if (!parsed) return;
    if (parsed.ms > this.last.ms || (parsed.ms === this.last.ms && parsed.counter > this.last.counter)) {
      this.last = { ms: parsed.ms, counter: parsed.counter };
    }
  }

  /** The latest stamp state, saved so the clock never goes backwards after a restart. */
  snapshot(): ClockState {
    return { ...this.last };
  }

  restore(state: ClockState | undefined): void {
    if (state && state.ms > this.last.ms) this.last = { ...state };
  }
}

function format(ms: number, counter: number, node: string): string {
  return `${String(ms).padStart(13, '0')}-${counter.toString(36).padStart(4, '0')}-${node}`;
}

export function parseStamp(stamp: string): { ms: number; counter: number; node: string } | null {
  const m = /^(\d{13})-([0-9a-z]{4})-([\w]+)$/.exec(stamp);
  return m ? { ms: Number(m[1]), counter: parseInt(m[2], 36), node: m[3] } : null;
}

/** Stamp comparison: -1, 0 or 1. Plain string order is the right order by design. */
export const compareStamps = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** A short random device id (letters and numbers only). */
export function newNodeId(random: () => number = Math.random): string {
  let id = '';
  while (id.length < 8) id += Math.floor(random() * 36).toString(36);
  return id;
}
