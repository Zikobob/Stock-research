import type { Poll } from '@/store/types';

export interface PollRow {
  id: string;
  text: string;
  count: number;
  /** Whole percent of all votes cast (0 when nobody has voted). */
  pct: number;
  /** Who voted for it, in the order of the trip's member list. */
  voters: string[];
  mine: boolean;
}

export interface PollView {
  rows: PollRow[];
  total: number;
  /** The option with the most votes, or null when nobody voted or two options are level. */
  winnerId: string | null;
  /** The first place is shared by two or more options. */
  tie: boolean;
  /** What the stamp says: OPEN while voting, LOCKED IN when closed with a winner, CLOSED when closed without one. */
  stamp: 'open' | 'locked' | 'closed';
}

/** The numbers a poll card draws: counts, percentages, who voted, who is ahead and what state it is in. */
export function pollView(poll: Poll, userId: string, memberIds: string[] = []): PollView {
  const total = poll.options.reduce((n, o) => n + o.votes.length, 0);
  const rows: PollRow[] = poll.options.map((o) => ({
    id: o.id,
    text: o.text,
    count: o.votes.length,
    pct: total ? Math.round((o.votes.length / total) * 100) : 0,
    voters: [...o.votes].sort((a, b) => memberIds.indexOf(a) - memberIds.indexOf(b)),
    mine: o.votes.includes(userId),
  }));
  const top = Math.max(0, ...rows.map((r) => r.count));
  const leaders = top > 0 ? rows.filter((r) => r.count === top) : [];
  const winnerId = leaders.length === 1 ? leaders[0].id : null;
  return {
    rows,
    total,
    winnerId,
    tie: leaders.length > 1,
    stamp: !poll.closed ? 'open' : winnerId ? 'locked' : 'closed',
  };
}
