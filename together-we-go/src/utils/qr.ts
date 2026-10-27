/** QR codes for invite links: friends point their phone camera at the screen and the link opens TogetherWeGo. */
import qrcode from 'qrcode-generator';

/** The library writes one byte per letter, which breaks accents and emoji; links with them need UTF-8. */
function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
}
qrcode.stringToBytes = utf8Bytes;

/** The code as a grid of squares: true is dark. Medium error correction keeps it readable with a smudged screen. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M'); // 0 = pick the smallest size that fits
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => qr.isDark(row, col)));
}

/** One SVG path that covers all dark squares (each row is drawn as a few long rectangles, not hundreds of tiny ones). */
export function qrPath(matrix: boolean[][]): string {
  let d = '';
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return d;
}
