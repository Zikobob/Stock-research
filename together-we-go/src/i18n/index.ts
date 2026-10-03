import { useCallback } from 'react';

import { useAppStore } from '@/store/useAppStore';

import { dictionaries, english, type LangCode, type StringKey } from './strings';

export { LANGUAGES } from './strings';
export type { LangCode, StringKey } from './strings';

export function translate(lang: LangCode, key: StringKey | string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[lang] ?? {};
  let s: string = (dict as Record<string, string>)[key] ?? (english as Record<string, string>)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return s;
}

/** `const t = useT(); t('nav.explore')` — re-renders when the language changes. */
export function useT() {
  const lang = useAppStore((s) => s.settings.language);
  return useCallback((key: StringKey | string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}
