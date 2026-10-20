import { SplitFlap } from './SplitFlap';
import type { TProps } from './T';

/** Older name for the departures-board number: use SplitFlap in new code. */
export function RollingNumber({ value }: { value: number | string; variant?: TProps['variant']; color?: string }) {
  return <SplitFlap value={value} size={56} />;
}
