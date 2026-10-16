/**
 * Shared group tools: polls, the checklist, the packing list and the document vault.
 */
import { uid } from '@/utils/format';

import type { PackingItem, Poll, TripDoc } from '../types';
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export interface GroupToolsSlice {
  createPoll: (tripId: string, question: string, options: string[]) => void;
  votePoll: (tripId: string, pollId: string, optionId: string) => void;
  closePoll: (tripId: string, pollId: string) => void;
  deletePoll: (tripId: string, pollId: string) => void;
  addTask: (tripId: string, text: string, assignee?: string) => void;
  toggleTask: (tripId: string, id: string) => void;
  deleteTask: (tripId: string, id: string) => void;
  assignTask: (tripId: string, id: string, memberId?: string) => void;
  addDoc: (tripId: string, d: Omit<TripDoc, 'id' | 'addedAt' | 'addedBy'>) => void;
  deleteDoc: (tripId: string, id: string) => void;
  togglePacked: (tripId: string, id: string) => void;
  assignPacking: (tripId: string, id: string, memberId?: string) => void;
  addPackingItems: (tripId: string, items: Omit<PackingItem, 'id' | 'packed'>[]) => void;
  deletePackingItem: (tripId: string, id: string) => void;
}

export const createGroupToolsSlice: Slice<GroupToolsSlice> = (set, get) => {
  const { withTrip, me } = tripHelpers(set, get);
  return {
    createPoll: (tripId, question, options) =>
      withTrip(tripId, (t) => {
        t.polls.unshift({
          id: uid('poll-'), question: question.trim(), createdBy: me(), createdAt: Date.now(),
          options: options.map((text, i) => ({ id: `o${i + 1}`, text: text.trim(), votes: [] })),
        } satisfies Poll);
        t.messages.push({ id: uid('c-'), authorId: 'system', kind: 'system', text: `New poll: ${question.trim()}`, ts: Date.now() });
      }),

    votePoll: (tripId, pollId, optionId) =>
      withTrip(tripId, (t) => {
        const p = t.polls.find((x) => x.id === pollId);
        if (!p || p.closed) return;
        const user = me();
        const already = p.options.find((o) => o.id === optionId)?.votes.includes(user);
        p.options.forEach((o) => (o.votes = o.votes.filter((v) => v !== user)));
        if (!already) p.options.find((o) => o.id === optionId)?.votes.push(user);
      }),

    closePoll: (tripId, pollId) =>
      withTrip(tripId, (t) => {
        const p = t.polls.find((x) => x.id === pollId);
        if (p) p.closed = !p.closed;
      }),

    deletePoll: (tripId, pollId) =>
      withTrip(tripId, (t) => {
        t.polls = t.polls.filter((x) => x.id !== pollId);
      }),

    addTask: (tripId, text, assignee) =>
      withTrip(tripId, (t) => {
        t.tasks.push({ id: uid('t-'), text: text.trim(), done: false, assignee });
      }),

    toggleTask: (tripId, id) =>
      withTrip(tripId, (t) => {
        const k = t.tasks.find((x) => x.id === id);
        if (k) k.done = !k.done;
      }),

    deleteTask: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.tasks = t.tasks.filter((x) => x.id !== id);
      }),

    assignTask: (tripId, id, memberId) =>
      withTrip(tripId, (t) => {
        const k = t.tasks.find((x) => x.id === id);
        if (k) k.assignee = memberId;
      }),

    addDoc: (tripId, d) =>
      withTrip(tripId, (t) => {
        t.docs.unshift({ ...d, id: uid('d-'), addedAt: Date.now(), addedBy: me() });
      }),

    deleteDoc: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.docs = t.docs.filter((x) => x.id !== id);
      }),

    togglePacked: (tripId, id) =>
      withTrip(tripId, (t) => {
        const p = t.packing.find((x) => x.id === id);
        if (p) p.packed = !p.packed;
      }),

    assignPacking: (tripId, id, memberId) =>
      withTrip(tripId, (t) => {
        const p = t.packing.find((x) => x.id === id);
        if (p) p.broughtBy = memberId;
      }),

    addPackingItems: (tripId, items) =>
      withTrip(tripId, (t) => {
        const have = new Set(t.packing.map((p) => p.text.toLowerCase()));
        items.forEach((i) => {
          const key = i.text.toLowerCase();
          if (have.has(key)) return;
          have.add(key); // also skips duplicates inside this same batch
          t.packing.push({ ...i, id: uid('p-'), packed: false });
        });
      }),

    deletePackingItem: (tripId, id) =>
      withTrip(tripId, (t) => {
        t.packing = t.packing.filter((x) => x.id !== id);
      }),
  };
};
