/**
 * Chat messages and the photo dump.
 */
import { uid } from '@/utils/format';

import type { ChatMessage, Photo } from '../types';
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export interface SocialSlice {
  sendMessage: (tripId: string, msg: Omit<ChatMessage, 'id' | 'ts'> & { ts?: number }) => void;
  clearChat: (tripId: string) => void;
  addPhoto: (tripId: string, p: Omit<Photo, 'id' | 'ts' | 'likes' | 'by'>) => void;
  toggleLikePhoto: (tripId: string, id: string) => void;
  deletePhoto: (tripId: string, id: string) => void;
}

export const createSocialSlice: Slice<SocialSlice> = (set, get) => {
  const { withTrip, me } = tripHelpers(set, get);
  return {
    sendMessage: (tripId, msg) =>
      withTrip(tripId, (t) => {
        t.messages.push({ ...msg, id: uid('c-'), ts: msg.ts ?? Date.now() });
        if (t.messages.length > 400) t.messages.splice(0, t.messages.length - 400);
      }),

    clearChat: (tripId) =>
      withTrip(tripId, (t) => {
        t.messages = [];
      }),

    addPhoto: (tripId, p) =>
      withTrip(tripId, (t) => {
        t.photos.unshift({ ...p, id: uid('ph-'), ts: Date.now(), likes: [], by: me() });
      }),

    toggleLikePhoto: (tripId, id) =>
      withTrip(tripId, (t) => {
        const p = t.photos.find((x) => x.id === id);
        if (!p) return;
        const user = me();
        p.likes = p.likes.includes(user) ? p.likes.filter((x) => x !== user) : [...p.likes, user];
      }),

    deletePhoto: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.photos = t.photos.filter((x) => x.id !== id);
      }),
  };
};
