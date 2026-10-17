import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrMatrix, qrPath } from '@/utils/qr';

const QUIET = 4; // squares of empty border all around; scanners need it to find the code

/** A QR code drawn with SVG. Always black on white, whatever the app theme, because that is what scanners read best. */
export function QrCode({ value, size = 220, accessibilityLabel }: { value: string; size?: number; accessibilityLabel?: string }) {
  const { total, path } = useMemo(() => {
    const matrix = qrMatrix(value);
    return { total: matrix.length + QUIET * 2, path: qrPath(matrix) };
  }, [value]);
  const px = Math.max(1, Math.floor(size / total)) * total; // a whole number of screen points per square keeps the edges sharp
  return (
    <Svg width={px} height={px} viewBox={`${-QUIET} ${-QUIET} ${total} ${total}`} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Rect x={-QUIET} y={-QUIET} width={total} height={total} fill="#FFFFFF" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
