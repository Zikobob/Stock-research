import type { Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';

const nameOf = (trip: Trip, id: string) => trip.members.find((m) => m.id === id)?.name.split(' ')[0] ?? 'Someone';

/**
 * Turns changes that arrived from friends into entries in the in-app notification list (and the unread dot on the
 * Chat tab): new chat messages, polls, expenses and people joining.
 */
export function notifyRemoteChange(prev: Trip | undefined, next: Trip, me: string | undefined): void {
  if (!prev) return;
  const { pushNotification } = useAppStore.getState();
  const known = (list: { id: string }[]) => new Set(list.map((x) => x.id));

  const seenMessages = known(prev.messages);
  const messages = next.messages.filter((m) => !seenMessages.has(m.id) && m.authorId !== me && m.kind !== 'system' && !m.ai);
  if (messages.length === 1) {
    pushNotification({ kind: 'chat', title: `${nameOf(next, messages[0].authorId)} in ${next.name}`, body: messages[0].text, tripId: next.id, route: '/(tabs)/chat' });
  } else if (messages.length > 1) {
    pushNotification({ kind: 'chat', title: `${messages.length} new messages in ${next.name}`, body: messages.at(-1)!.text, tripId: next.id, route: '/(tabs)/chat' });
  }

  const seenPolls = known(prev.polls);
  for (const p of next.polls.filter((x) => !seenPolls.has(x.id) && x.createdBy !== me).slice(0, 2)) {
    pushNotification({ kind: 'vote', title: `New poll from ${nameOf(next, p.createdBy)}`, body: `${p.question} Cast your vote.`, tripId: next.id, route: '/crew' });
  }

  const seenExpenses = known(prev.expenses);
  for (const e of next.expenses.filter((x) => !seenExpenses.has(x.id) && x.paidBy !== me && !x.settlement).slice(0, 2)) {
    pushNotification({ kind: 'expense', title: `${nameOf(next, e.paidBy)} added an expense`, body: `${e.title} · $${Math.round(e.amount)} split ${e.splitBetween.length} ways`, tripId: next.id, route: '/(tabs)/budget' });
  }

  const seenMembers = known(prev.members);
  for (const m of next.members.filter((x) => !seenMembers.has(x.id) && x.id !== me).slice(0, 2)) {
    pushNotification({ kind: 'member', title: `${m.name.split(' ')[0]} joined ${next.name}`, body: 'Say hi in the trip chat 👋', tripId: next.id, route: '/(tabs)/chat' });
  }
}
