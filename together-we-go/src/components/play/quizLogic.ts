/**
 * The small decisions the travel quiz makes, with no React in them so they can be tested: how a round is scored,
 * what a result is called, who is on the crew board, and how the podium is laid out.
 */

/** Questions per round and seconds to answer each. */
export const ROUND = 8;
export const SECONDS = 20;

/** A shuffled copy (Fisher-Yates). `rnd` can be replaced in tests. */
export function shuffle<T>(a: T[], rnd: () => number = Math.random): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/** A right answer is worth 10, plus a bonus for the seconds left (one point per four seconds), plus 2 for every answer in a row before it. */
export function pointsFor(secondsLeft: number, streak: number): number {
  return 10 + Math.max(0, Math.round(secondsLeft / 4)) + streak * 2;
}

/** A good round is 70% right or better (6 of 8). */
export function isGoodRound(correct: number, total: number): boolean {
  return total > 0 && correct / total >= 0.7;
}

/** What the round is called, from how many were right. */
export function roundTitle(correct: number, total: number): string {
  const share = total > 0 ? correct / total : 0;
  if (share >= 0.9) return 'Legendary navigator';
  if (share >= 0.7) return 'Seasoned traveller';
  if (share >= 0.4) return 'Getting there';
  return 'Every expert was once a tourist';
}

/** Should the round celebrate? A good round, or a score that beats the best (a first round with at least one point counts as a new best). */
export function shouldCelebrate(correct: number, total: number, score: number, bestBefore: number): boolean {
  return isGoodRound(correct, total) || isNewBest(score, bestBefore);
}

export function isNewBest(score: number, bestBefore: number): boolean {
  return score > 0 && score > bestBefore;
}

export interface BoardRow {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  me?: boolean;
}

/** A friendly, stable score for a crew member who has not played on this phone (the same name always gives the same number). */
export function crewScore(name: string): number {
  return 60 + ((name.charCodeAt(0) * 7 + name.length * 13) % 90);
}

/** The crew board, best first: everyone else gets a stable score, you get your real one. */
export function crewBoard(members: { id: string; name: string; avatar?: string }[], me: { id?: string; name?: string; avatar?: string }, mine: number): BoardRow[] {
  const others: BoardRow[] = members.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, score: crewScore(m.name) }));
  const you: BoardRow = { id: me.id ?? 'me', name: me.name ?? 'You', avatar: me.avatar, score: mine, me: true };
  return [...others, you].sort((a, b) => b.score - a.score);
}

/** How tall each podium block is, by place. */
export const PODIUM_HEIGHT = { 1: 112, 2: 84, 3: 60 } as const;

export interface PodiumSlot extends BoardRow {
  rank: 1 | 2 | 3;
  height: number;
}

/** The top three left to right as on a real podium: second, first, third (just second and first when only two play). */
export function podiumSlots(rows: BoardRow[]): PodiumSlot[] {
  const top: PodiumSlot[] = rows.slice(0, 3).map((r, i) => ({ ...r, rank: (i + 1) as 1 | 2 | 3, height: PODIUM_HEIGHT[(i + 1) as 1 | 2 | 3] }));
  const [first, second, third] = top;
  return [second, first, third].filter((s) => !!s);
}

/**
 * The rows of the result podium. With a crew it is the crew board with this round as your score; on your own it is this round
 * against your best (the higher one stands first).
 */
export function resultRows(board: BoardRow[], me: { id?: string; name?: string; avatar?: string }, score: number, bestBefore: number): BoardRow[] {
  if (board.length >= 2) return board;
  const round: BoardRow = { id: 'round', name: 'This round', avatar: me.avatar, score, me: true };
  const best: BoardRow = { id: 'best', name: 'Your best', avatar: me.avatar, score: bestBefore };
  return bestBefore > 0 ? [round, best].sort((a, b) => b.score - a.score) : [round];
}
