import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';

/** Whether the phone's own "Reduce Motion" accessibility setting is on. */
export const useOsReduceMotion = create<{ on: boolean }>(() => ({ on: false }));

/** Animations run only when the person wants them AND the phone is not asking apps to calm down. */
export const effectiveMotion = (wanted: boolean, osReduce: boolean) => wanted && !osReduce;

/** Call once near the root: reads the setting and follows changes while the app is open. */
export function useWatchOsReduceMotion() {
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && useOsReduceMotion.setState({ on }))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => useOsReduceMotion.setState({ on }));
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
}
