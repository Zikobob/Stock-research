import { showDialog } from '@/components/ui/feedback';

/** The short Terms / Privacy notes shown from the sign-in and sign-up screens. */
export function showLegal(title: 'Terms of Service' | 'Privacy Policy') {
  showDialog(
    title,
    title === 'Privacy Policy'
      ? 'TogetherWeGo stores your trips on this device. Passwords are salted and hashed (PBKDF2); API keys go in the secure keychain. We never sell data. Location is only used when you tap a nearby/airport feature.'
      : 'TogetherWeGo is a student project built for FBLA Mobile Application Development. Use it to plan trips with friends — be kind in chats and only upload documents you own.',
    [{ label: 'Got it' }],
    'shield-checkmark-outline',
  );
}
