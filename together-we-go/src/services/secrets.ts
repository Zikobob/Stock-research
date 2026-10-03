/**
 * Sensitive values (the optional Anthropic API key) live in the OS keychain /
 * keystore via expo-secure-store — never in the regular app database.
 * Web has no secure enclave, so the preview keeps it in session storage only.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'twg_anthropic_key';

export async function getApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage === 'undefined') return;
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
}

export const looksLikeApiKey = (v: string) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(v.trim());
