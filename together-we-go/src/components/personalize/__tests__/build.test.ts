import { BUILD_DURATION, buildPercent, linesDone } from '../build';
import { BUILD_LINES } from '../options';

describe('the "Building your trip HQ" numbers', () => {
  it('starts at 0, ends at exactly 100 and never goes backwards', () => {
    expect(buildPercent(0)).toBe(0);
    expect(buildPercent(BUILD_DURATION)).toBe(100);
    expect(buildPercent(BUILD_DURATION * 5)).toBe(100);
    expect(buildPercent(-50)).toBe(0);
    let last = 0;
    for (let ms = 0; ms <= BUILD_DURATION; ms += 100) {
      const v = buildPercent(ms);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it('ticks the status lines one third at a time, the last one only at 100', () => {
    expect(linesDone(0)).toBe(0);
    expect(linesDone(33)).toBe(1);
    expect(linesDone(66)).toBe(1);
    expect(linesDone(67)).toBe(2);
    expect(linesDone(99)).toBe(2);
    expect(linesDone(100)).toBe(BUILD_LINES.length);
  });
});
