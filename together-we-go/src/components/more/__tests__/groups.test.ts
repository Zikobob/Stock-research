import { groupByDay } from '../groups';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const now = at(2026, 10, 27, 15);

describe('groupByDay', () => {
  it('puts what happened since midnight under Today and the rest under Earlier, newest first', () => {
    const list = [
      { id: 'old', ts: at(2026, 10, 25, 9) },
      { id: 'late', ts: at(2026, 10, 27, 14, 30) },
      { id: 'early', ts: at(2026, 10, 27, 0, 5) },
      { id: 'yesterday', ts: at(2026, 10, 26, 23, 59) },
    ];
    const groups = groupByDay(list, now);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Earlier']);
    expect(groups[0].items.map((n) => n.id)).toEqual(['late', 'early']);
    expect(groups[1].items.map((n) => n.id)).toEqual(['yesterday', 'old']);
  });

  it('leaves out a group with nothing in it', () => {
    expect(groupByDay([{ ts: at(2026, 10, 27, 9) }], now).map((g) => g.label)).toEqual(['Today']);
    expect(groupByDay([{ ts: at(2026, 10, 1, 9) }], now).map((g) => g.label)).toEqual(['Earlier']);
    expect(groupByDay([], now)).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const list = [{ ts: 1 }, { ts: 3 }, { ts: 2 }];
    groupByDay(list, 10);
    expect(list.map((n) => n.ts)).toEqual([1, 3, 2]);
  });
});
