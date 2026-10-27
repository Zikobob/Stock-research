import { completesList, needsSomeone, splitFairly } from '../packingLogic';

const item = (id: string, broughtBy?: string, packed = false) => ({ id, broughtBy, packed });

describe('packing list', () => {
  it('finds what nobody is bringing', () => {
    const list = [item('a'), item('b', 'm1'), item('c', 'gone'), item('d', undefined, true)];
    expect(needsSomeone(list, ['m1', 'm2']).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('hands out the rest so that everybody carries about the same', () => {
    const list = [item('a', 'm1'), item('b', 'm1'), item('c'), item('d'), item('e'), item('f')];
    const plan = splitFairly(list, ['m1', 'm2']);
    expect(plan).toHaveLength(4);
    const m1 = 2 + plan.filter((p) => p.memberId === 'm1').length;
    const m2 = plan.filter((p) => p.memberId === 'm2').length;
    expect(Math.abs(m1 - m2)).toBeLessThanOrEqual(1);
  });

  it('does nothing without a crew', () => {
    expect(splitFairly([item('a')], [])).toEqual([]);
  });

  it('knows when the last item is packed', () => {
    expect(completesList(4, 5, false)).toBe(true);
    expect(completesList(3, 5, false)).toBe(false);
    expect(completesList(4, 5, true)).toBe(false);
    expect(completesList(0, 1, false)).toBe(false);
  });
});
