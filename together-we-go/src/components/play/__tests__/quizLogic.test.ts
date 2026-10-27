import { ROUND, SECONDS, crewBoard, crewScore, isGoodRound, isNewBest, podiumSlots, pointsFor, resultRows, roundTitle, shouldCelebrate, shuffle } from '../quizLogic';

describe('quiz scoring', () => {
  it('pays 10, a speed bonus and a streak bonus', () => {
    expect(pointsFor(0, 0)).toBe(10);
    expect(pointsFor(20, 0)).toBe(15);
    expect(pointsFor(20, 3)).toBe(21);
    expect(pointsFor(-4, 0)).toBe(10);
  });

  it('counts 70% right as a good round', () => {
    expect(isGoodRound(6, 8)).toBe(true);
    expect(isGoodRound(5, 8)).toBe(false);
    expect(isGoodRound(0, 0)).toBe(false);
  });

  it('names the round from how many were right', () => {
    expect(roundTitle(8, ROUND)).toBe('Legendary navigator');
    expect(roundTitle(6, ROUND)).toBe('Seasoned traveller');
    expect(roundTitle(4, ROUND)).toBe('Getting there');
    expect(roundTitle(1, ROUND)).toBe('Every expert was once a tourist');
  });

  it('knows a new best only when the score really beats it', () => {
    expect(isNewBest(80, 60)).toBe(true);
    expect(isNewBest(60, 60)).toBe(false);
    expect(isNewBest(0, 0)).toBe(false);
  });

  it('celebrates a good round or a new best, and nothing else', () => {
    expect(shouldCelebrate(6, 8, 50, 100)).toBe(true);
    expect(shouldCelebrate(3, 8, 50, 40)).toBe(true);
    expect(shouldCelebrate(3, 8, 30, 40)).toBe(false);
  });
});

describe('shuffle', () => {
  it('keeps every item and does not change the original', () => {
    const a = [1, 2, 3, 4, 5, 6];
    const s = shuffle(a);
    expect(s.slice().sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('is repeatable with a fixed generator', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual(shuffle([1, 2, 3, 4], () => 0));
  });
  it('a round fits the clock', () => {
    expect(ROUND * SECONDS).toBeLessThan(600);
  });
});

describe('the crew board and the podium', () => {
  const members = [
    { id: 'm', name: 'Maya Chen' },
    { id: 'd', name: 'Diego Alvarez' },
    { id: 'p', name: 'Priya Patel' },
    { id: 's', name: 'Sam Okafor' },
  ];

  it('gives the same crew score to the same name', () => {
    expect(crewScore('Diego Alvarez')).toBe(crewScore('Diego Alvarez'));
    expect(crewScore('Diego Alvarez')).toBeGreaterThanOrEqual(60);
    expect(crewScore('Diego Alvarez')).toBeLessThan(150);
  });

  it('sorts best first and marks you', () => {
    const board = crewBoard(members, { id: 'm', name: 'Maya Chen' }, 1000);
    expect(board).toHaveLength(4);
    expect(board[0]).toMatchObject({ id: 'm', me: true, score: 1000 });
    const low = crewBoard(members, { id: 'm', name: 'Maya Chen' }, 0);
    expect(low[low.length - 1]).toMatchObject({ id: 'm', score: 0 });
  });

  it('lays the podium out second, first, third', () => {
    const slots = podiumSlots(crewBoard(members, { id: 'm', name: 'Maya Chen' }, 1000));
    expect(slots.map((s) => s.rank)).toEqual([2, 1, 3]);
    expect(slots[1].height).toBeGreaterThan(slots[0].height);
    expect(slots[0].height).toBeGreaterThan(slots[2].height);
  });

  it('shows two blocks when only two play', () => {
    const slots = podiumSlots(crewBoard([members[0], members[1]], { id: 'm', name: 'Maya Chen' }, 1000));
    expect(slots.map((s) => s.rank)).toEqual([2, 1]);
  });

  it('on your own, the result is this round against your best', () => {
    const solo = crewBoard([members[0]], { id: 'm', name: 'Maya Chen' }, 90);
    const rows = resultRows(solo, { id: 'm', name: 'Maya Chen' }, 90, 120);
    expect(rows.map((r) => r.name)).toEqual(['Your best', 'This round']);
    expect(resultRows(solo, { id: 'm' }, 90, 0).map((r) => r.name)).toEqual(['This round']);
  });

  it('with a crew, the result is the crew board', () => {
    const board = crewBoard(members, { id: 'm', name: 'Maya Chen' }, 90);
    expect(resultRows(board, { id: 'm' }, 90, 10)).toBe(board);
  });
});
