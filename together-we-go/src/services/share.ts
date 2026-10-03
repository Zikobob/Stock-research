/**
 * Social media integration: native share sheet plus direct deep links into
 * WhatsApp, X, Facebook, Messenger, Telegram, Instagram, SMS and email.
 */
import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import { toast } from '@/components/ui/feedback';
import type { IconName } from '@/components/ui/bits';
import { photos, type PhotoKey } from '@/data/images';

export type SocialTarget = 'whatsapp' | 'x' | 'facebook' | 'messenger' | 'telegram' | 'instagram' | 'sms' | 'email';

export const socialTargets: { key: SocialTarget; label: string; icon: IconName; color: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { key: 'x', label: 'X', icon: 'logo-twitter', color: '#111111' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'messenger', label: 'Messenger', icon: 'chatbubble-ellipses-outline', color: '#0084FF' },
  { key: 'telegram', label: 'Telegram', icon: 'paper-plane', color: '#229ED9' },
  { key: 'sms', label: 'Messages', icon: 'chatbox-ellipses-outline', color: '#34C759' },
  { key: 'email', label: 'Email', icon: 'mail-outline', color: '#5F645A' },
];

export function inviteLink(code: string): string {
  return Linking.createURL('/join', { queryParams: { code } });
}

export function inviteMessage(tripName: string, code: string): string {
  return `Join my trip “${tripName}” on TogetherWeGo ✈️\nInvite code: ${code}\nOpen: ${inviteLink(code)}`;
}

export async function copy(text: string, label = 'Copied to clipboard') {
  await Clipboard.setStringAsync(text);
  toast(label, { icon: 'copy-outline' });
}

/** Opens the OS share sheet (Instagram, Snapchat, iMessage, Slack… whatever is installed). */
export async function shareText(message: string, title = 'TogetherWeGo') {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: object) => Promise<void> }) : undefined;
      if (nav?.share) {
        await nav.share({ title, text: message });
        return;
      }
      await copy(message, 'Share text copied — paste it anywhere');
      return;
    }
    await Share.share({ message, title });
  } catch {
    // user cancelled
  }
}

async function openFirst(urls: string[]) {
  for (const url of urls) {
    try {
      if (Platform.OS === 'web') {
        if (url.startsWith('http') || url.startsWith('mailto') || url.startsWith('sms')) {
          window.open(url, '_blank');
          return true;
        }
        continue;
      }
      if (url.startsWith('http') || (await Linking.canOpenURL(url))) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

/** Shares straight into a specific social app, falling back to its web intent. */
export async function shareTo(target: SocialTarget, text: string, url?: string) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url ?? '');
  const map: Record<SocialTarget, string[]> = {
    whatsapp: [`whatsapp://send?text=${t}`, `https://wa.me/?text=${t}`],
    x: [`twitter://post?message=${t}`, `https://x.com/intent/tweet?text=${t}`],
    facebook: [`https://www.facebook.com/sharer/sharer.php?u=${u || encodeURIComponent('https://expo.dev')}&quote=${t}`],
    messenger: [`fb-messenger://share?link=${u}`, `https://www.messenger.com/`],
    telegram: [`tg://msg?text=${t}`, `https://t.me/share/url?url=${u}&text=${t}`],
    instagram: ['instagram://story-camera', 'instagram://app', 'https://www.instagram.com/'],
    sms: [Platform.OS === 'ios' ? `sms:&body=${t}` : `sms:?body=${t}`],
    email: [`mailto:?subject=${encodeURIComponent('Join our trip on TogetherWeGo')}&body=${t}`],
  };
  if (target === 'instagram') {
    // Instagram has no text-share URL: copy the caption first, then open the app.
    await Clipboard.setStringAsync(text);
    toast('Caption copied — paste it in Instagram', { icon: 'logo-instagram' });
  }
  const ok = await openFirst(map[target]);
  if (!ok) await shareText(text);
}

/** Shares a photo file (bundled demo photo or one from the camera roll). */
export async function sharePhoto(uri: string, caption: string) {
  try {
    let fileUri = uri;
    if (uri in photos) {
      const asset = Asset.fromModule(photos[uri as PhotoKey]);
      await asset.downloadAsync();
      fileUri = asset.localUri ?? asset.uri;
    }
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(fileUri, { dialogTitle: caption, mimeType: 'image/jpeg' });
      return;
    }
    await shareText(`${caption} 📸 — shared from TogetherWeGo`);
  } catch {
    await shareText(`${caption} 📸 — shared from TogetherWeGo`);
  }
}
