import { newNodeId } from '../hlc';
import { secureRandom } from '../secureRandom';

describe('secureRandom', () => {
  it('gives numbers from 0 up to (not including) 1', () => {
    for (let i = 0; i < 1000; i++) {
      const n = secureRandom();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('does not repeat itself, and makes distinct ids', () => {
    expect(new Set(Array.from({ length: 500 }, secureRandom)).size).toBe(500);
    const ids = new Set(Array.from({ length: 500 }, () => newNodeId(secureRandom)));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-z]{8}$/);
  });
});
