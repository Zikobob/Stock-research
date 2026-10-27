import { Appearance as OsAppearance } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { appearance, applyAppearance, resolvedMode } from '@/theme';

import { lookNeedsReload, type Look } from './look';

/** A look that was saved without a restart (nothing visible changed), so screens opened later start from it, not from the one the app was drawn with. */
let saved: Look | null = null;

/** The look the person has chosen: the last one saved, or else the one the app was drawn with. */
export function currentLook(): Look {
  return saved ?? { theme: appearance.theme, mode: appearance.mode, corners: appearance.corners };
}

/** What happened when a look was put on: nothing visible changed, the app is restarting to show it, or the restart did not work. */
export type LookResult = 'same' | 'reloading' | 'failed';

/**
 * Saves a look and, if it changes what is on screen, restarts the app so every screen is drawn again with it.
 * Before a restart it sets the "restyled" flag (the root layout then says the new look is live, and the session survives the restart)
 * and waits a moment for the store to save to disk.
 */
export function commitLook(look: Look): Promise<LookResult> {
  const reload = lookNeedsReload(look, { theme: appearance.theme, mode: appearance.mode, corners: appearance.corners, resolved: resolvedMode }, OsAppearance.getColorScheme() === 'dark');
  if (!reload) {
    applyAppearance(look); // only remembers the choice ("light" on a light phone and the like)
    saved = look;
    return Promise.resolve('same');
  }
  const { setRestyled } = useAppStore.getState();
  setRestyled(true);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (applyAppearance(look)) return resolve('reloading');
      setRestyled(false);
      resolve('failed');
    }, 450);
  });
}
