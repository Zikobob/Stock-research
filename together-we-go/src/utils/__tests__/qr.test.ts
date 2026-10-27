import jsQR from 'jsqr';

import { qrMatrix, qrPath } from '../qr';

/** Draws the matrix the way a screen would (with the empty border a scanner needs) and reads it back with a QR decoder. */
function scan(matrix: boolean[][], scale = 6, quiet = 4): string | null {
  const size = (matrix.length + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const i = (((r + quiet) * scale + y) * size + (c + quiet) * scale + x) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }),
  );
  return jsQR(pixels, size, size)?.data ?? null;
}

describe('QR codes', () => {
  it('can be read back by a scanner', () => {
    for (const text of [
      'AML-2026',
      'togetherwego://join?code=AML-2026',
      'exp://192.168.1.20:8081/--/join?code=AML-2026&server=http%3A%2F%2F192.168.1.20%3A8787',
      'Join my trip “Amalfi Squad” ✈️ — code AML-2026',
      'x'.repeat(180),
    ]) {
      expect(scan(qrMatrix(text))).toBe(text);
    }
  });

  it('is square, bigger for longer text, and has the three corner markers', () => {
    const short = qrMatrix('AML-2026');
    const long = qrMatrix('x'.repeat(180));
    expect(short.every((row) => row.length === short.length)).toBe(true);
    expect(long.length).toBeGreaterThan(short.length);
    const n = short.length;
    // the 7x7 finder pattern: dark ring, light ring, dark 3x3 centre — top-left, top-right, bottom-left
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      expect(short[r0][c0]).toBe(true);
      expect(short[r0 + 1][c0 + 1]).toBe(false);
      expect(short[r0 + 3][c0 + 3]).toBe(true);
    }
  });

  it('draws the same squares as the grid says', () => {
    const matrix = qrMatrix('AML-2026');
    const path = qrPath(matrix);
    // every "M x y h len v1 h-len z" is a run of dark squares: counting their lengths gives the number of dark squares
    const dark = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)].reduce((sum, m) => sum + Number(m[3]), 0);
    expect(dark).toBe(matrix.flat().filter(Boolean).length);
    expect(qrPath([[false, false]])).toBe('');
    expect(qrPath([[true, true, false, true]])).toBe('M0 0h2v1h-2zM3 0h1v1h-1z');
  });
});
