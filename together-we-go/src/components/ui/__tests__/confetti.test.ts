import { PIECES, confettiPieces } from '../Confetti';

describe('confetti', () => {
  it('throws the same pieces every time for the same count', () => {
    expect(confettiPieces(40)).toEqual(confettiPieces(40));
  });

  it('keeps every piece inside the screen and in sensible ranges', () => {
    for (const p of confettiPieces(PIECES.max)) {
      expect(p.x).toBeGreaterThanOrEqual(0.1);
      expect(p.x).toBeLessThanOrEqual(0.9);
      expect(p.delay).toBeLessThanOrEqual(0.2);
      expect(p.size).toBeGreaterThanOrEqual(7);
      expect(p.color).toBeGreaterThanOrEqual(0);
      expect(p.color).toBeLessThan(5);
      expect(p.fall).toBeGreaterThan(p.rise);
    }
  });

  it('throws nothing on Chill, a little on Lively and a lot on Max', () => {
    expect(PIECES.chill).toBe(0);
    expect(PIECES.lively).toBeGreaterThan(0);
    expect(PIECES.max).toBeGreaterThan(PIECES.lively);
  });
});
