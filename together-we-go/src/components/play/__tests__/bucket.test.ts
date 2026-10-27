import { tiltFor } from '../bucket';

describe('bucket list tilt', () => {
  it('alternates left and right', () => {
    for (let i = 0; i < 12; i++) expect(Math.sign(tiltFor(i))).toBe(i % 2 === 0 ? -1 : 1);
  });
  it('never turns a ticket more than two degrees', () => {
    for (let i = -3; i < 20; i++) expect(Math.abs(tiltFor(i))).toBeLessThanOrEqual(2);
  });
});
