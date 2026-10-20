import { defaultPersonal } from '../slices/app';
import { useAppStore } from '../useAppStore';

type Saved = { personal?: { sections: Record<string, boolean>; order?: string[]; layout?: string; effects?: string }; trips?: unknown[] };
const migrate = (state: object, version: number) => useAppStore.persist.getOptions().migrate!(state, version) as Saved;

// What the Home sections looked like before version 4
const OLD_SECTIONS = { glance: true, budget: true, upnext: true, quick: true, forYou: true, nearby: false, discover: true };
const oldPersonal = (sections: Record<string, boolean>) => ({ ...defaultPersonal, sections });

describe('saved data from an older version', () => {
  it('starts new people on the Planner layout with the Nearby block off', () => {
    expect(defaultPersonal.layout).toBe('planner');
    expect(defaultPersonal.sections.nearby).toBe(false);
    expect(defaultPersonal.sections.upnext).toBe(true);
    expect(defaultPersonal.order[0]).toBe('upnext');
    expect(defaultPersonal.effects).toBe('lively');
  });

  it('switches Nearby off once for people who never changed the Home sections (version 2 data)', () => {
    const everythingOn = oldPersonal({ ...OLD_SECTIONS, nearby: true });
    expect(migrate({ personal: everythingOn, trips: [] }, 2).personal?.sections.nearby).toBe(false);
  });

  it('keeps what a person had switched on or off when Home gets its new blocks', () => {
    const custom = oldPersonal({ ...OLD_SECTIONS, budget: false, nearby: true, glance: false });
    const out = migrate({ personal: custom, trips: [] }, 3).personal!;
    expect(out.sections.budget).toBe(false);
    expect(out.sections.weather).toBe(false); // "glance" became "weather"
    expect(out.sections.nearby).toBe(true);
    expect(out.sections.crew).toBe(true); // new blocks start on
    expect(out.sections.play).toBe(true);
    expect('quick' in out.sections).toBe(false);
    expect('glance' in out.sections).toBe(false);
    expect(out.layout).toBe('custom');
    expect(out.order).toHaveLength(8);
  });

  it('gives people who never changed Home the Planner layout', () => {
    const out = migrate({ personal: oldPersonal(OLD_SECTIONS), trips: [] }, 3).personal!;
    expect(out.layout).toBe('planner');
    expect(out.effects).toBe('lively');
  });

  it('does nothing once the data is already on the current version', () => {
    const current = { ...defaultPersonal, sections: { ...defaultPersonal.sections, nearby: true } };
    expect(migrate({ personal: current }, 4).personal?.sections.nearby).toBe(true);
  });

  it('still re-seeds the sample trips for data from before version 2', () => {
    const out = migrate({ trips: [{ id: 'own-trip' }], personal: oldPersonal(OLD_SECTIONS) }, 1) as { trips: { id: string }[]; seeded?: boolean };
    expect(out.seeded).toBe(false);
    expect(out.trips.map((t) => t.id)).toContain('own-trip');
  });
});

describe('daily trivia in the store', () => {
  beforeEach(() => useAppStore.setState({ trivia: { day: null, picked: null, streak: 0, lastCorrectDay: null } }));

  it('counts only the first answer of a day and builds a streak over days', () => {
    const { answerTrivia } = useAppStore.getState();
    answerTrivia('2026-10-23', 2, true);
    answerTrivia('2026-10-23', 0, false); // a second try the same day changes nothing
    expect(useAppStore.getState().trivia).toMatchObject({ day: '2026-10-23', picked: 2, streak: 1 });
    answerTrivia('2026-10-24', 1, true);
    expect(useAppStore.getState().trivia.streak).toBe(2);
    answerTrivia('2026-10-25', 3, false);
    expect(useAppStore.getState().trivia.streak).toBe(0);
  });
});
