import { layoutAnswers } from '@/data/layouts';

import { allBlocks, movedBlock, shownCount, switchedBlock } from '../blocks';

describe('the Home blocks list in Settings', () => {
  it('lists every block once, in the saved order, adding one a later version brought and dropping unknown names', () => {
    const planner = layoutAnswers('planner');
    expect(allBlocks(planner.order)).toEqual(planner.order);
    const without = planner.order.filter((k) => k !== 'crew');
    expect(allBlocks(without)).toEqual([...without, 'crew']);
    expect(allBlocks(['nonsense', ...planner.order])).toEqual(planner.order);
  });

  it('becomes Custom as soon as a block is moved or switched by hand', () => {
    const a = layoutAnswers('planner');
    expect(movedBlock(a, 'weather', -1).layout).toBe('custom');
    expect(switchedBlock(a, 'discover', false).layout).toBe('custom');
  });

  it('goes back to a ready-made layout when the changes are undone', () => {
    const a = layoutAnswers('money');
    const moved = movedBlock(a, 'upnext', 1);
    expect(moved.layout).toBe('custom');
    expect(movedBlock(moved, 'upnext', -1).layout).toBe('money');
    const off = switchedBlock(a, 'weather', false);
    expect(switchedBlock(off, 'weather', true).layout).toBe('money');
  });

  it('keeps the order when a block is only switched, and the switches when a block is only moved', () => {
    const a = layoutAnswers('planner');
    expect(switchedBlock(a, 'play', false).order).toEqual(a.order);
    expect(movedBlock(a, 'play', -1).sections).toEqual(a.sections);
  });

  it('stops at the ends of the list', () => {
    const a = layoutAnswers('planner');
    expect(movedBlock(a, a.order[0], -1).order).toEqual(a.order);
    expect(movedBlock(a, a.order[a.order.length - 1], 1).order).toEqual(a.order);
  });

  it('counts the blocks that are showing', () => {
    expect(shownCount(layoutAnswers('planner'))).toBe(7);
    expect(shownCount(layoutAnswers('money'))).toBe(6);
  });
});
