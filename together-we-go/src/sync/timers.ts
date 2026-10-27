/** In Node (the tests) a waiting timer would keep the program alive; in the app, timers have no such method. */
export function quiet<T>(timer: T): T {
  (timer as { unref?: () => void }).unref?.();
  return timer;
}
