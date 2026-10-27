import type { Activity } from '@/store/types';

import { placesVisited, shortName, yesVotes } from '../recapLogic';

const act = (title: string, type: Activity['type'], date: string, time = '10:00'): Pick<Activity, 'title' | 'type' | 'date' | 'time'> => ({ title, type, date, time });

describe('placesVisited', () => {
  it('leaves out getting there and sleeping, keeps the order of the trip, and names each place once', () => {
    const list = [
      act('Villa Margherita', 'stay', '2026-10-30'),
      act('Path of the Gods', 'adventure', '2026-10-31'),
      act('Da Adolfo', 'food', '2026-10-30', '13:00'),
      act('Ferry to Capri', 'transport', '2026-11-01'),
      act('da adolfo ', 'food', '2026-11-02'),
    ];
    expect(placesVisited(list)).toEqual(['Da Adolfo', 'Path of the Gods']);
  });
  it('is empty for an empty trip', () => {
    expect(placesVisited([])).toEqual([]);
  });
});

describe('shortName', () => {
  it('keeps short names and cuts long ones at a word', () => {
    expect(shortName('Da Adolfo')).toBe('Da Adolfo');
    expect(shortName('Path of the Gods hiking trail')).toBe('Path of the…');
    expect(shortName('Supercalifragilisticexpialidocious')).toHaveLength(16);
  });
});

describe('yesVotes', () => {
  it('counts only the yes votes', () => {
    expect(yesVotes({ votes: { a: 1, b: -1, c: 1 } })).toBe(2);
  });
});
