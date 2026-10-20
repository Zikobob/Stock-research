import { ALL_SECTIONS, LAYOUTS, layoutAnswers, layoutOf, moveSection, visibleSections, type Preset } from '../layouts';

describe('Home layouts', () => {
  it.each(Object.keys(LAYOUTS) as Preset[])('%s lists every block exactly once', (key) => {
    expect([...LAYOUTS[key].order].sort()).toEqual([...ALL_SECTIONS].sort());
  });

  it('puts a different block first in each layout', () => {
    expect(LAYOUTS.planner.order[0]).toBe('upnext');
    expect(LAYOUTS.money.order[0]).toBe('budget');
    expect(LAYOUTS.party.order[0]).toBe('play');
  });

  it('shows only the blocks that are switched on, in order', () => {
    const a = layoutAnswers('money');
    expect(visibleSections(a)).toEqual(['budget', 'upnext', 'crew', 'weather', 'play', 'forYou']);
  });

  it('still shows a block a later version adds, at the end', () => {
    const a = layoutAnswers('planner');
    expect(visibleSections({ order: a.order.filter((k) => k !== 'crew'), sections: a.sections })).toContain('crew');
  });

  it('recognises a ready-made layout, and calls anything else custom', () => {
    expect(layoutOf(layoutAnswers('party'))).toBe('party');
    const a = layoutAnswers('party');
    expect(layoutOf({ order: a.order, sections: { ...a.sections, weather: false } })).toBe('custom');
    expect(layoutOf({ order: moveSection(a.order, 'crew', 1), sections: a.sections })).toBe('custom');
  });

  it('moves a block up or down and stops at the ends', () => {
    expect(moveSection(['upnext', 'weather', 'budget'] as never, 'weather', -1)).toEqual(['weather', 'upnext', 'budget']);
    expect(moveSection(['upnext', 'weather', 'budget'] as never, 'upnext', -1)).toEqual(['upnext', 'weather', 'budget']);
    expect(moveSection(['upnext', 'weather', 'budget'] as never, 'budget', 1)).toEqual(['upnext', 'weather', 'budget']);
  });
});
