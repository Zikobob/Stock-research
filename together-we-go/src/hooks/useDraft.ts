import { useState } from 'react';

/** Half-finished forms, kept for as long as the app is open, so closing a sheet by accident or switching tab loses nothing. */
const drafts = new Map<string, unknown>();

/**
 * Like `useState`, but the value is remembered under `key` after the form closes.
 * Call `clear()` when the form is submitted. Not saved to disk on purpose: a draft from last week is clutter.
 */
export function useDraft<T>(key: string, initial: T): [T, (next: T | ((cur: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : initial));
  const set = (next: T | ((cur: T) => T)) =>
    setValue((cur) => {
      const v = typeof next === 'function' ? (next as (c: T) => T)(cur) : next;
      drafts.set(key, v);
      return v;
    });
  const clear = () => {
    drafts.delete(key);
    setValue(initial);
  };
  return [value, set, clear];
}

/** For tests. */
export const resetDrafts = () => drafts.clear();
