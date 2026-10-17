import { effectiveMotion } from '../useReduceMotion';

describe('animations', () => {
  it('run only when wanted and the phone does not ask for reduced motion', () => {
    expect(effectiveMotion(true, false)).toBe(true);
    expect(effectiveMotion(true, true)).toBe(false); // the phone's setting wins
    expect(effectiveMotion(false, false)).toBe(false);
    expect(effectiveMotion(false, true)).toBe(false);
  });
});
