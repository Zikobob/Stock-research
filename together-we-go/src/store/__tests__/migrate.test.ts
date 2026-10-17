import { defaultPersonal } from '../slices/app';
import { useAppStore } from '../useAppStore';

const migrate = (state: object, version: number) => useAppStore.persist.getOptions().migrate!(state, version) as { personal?: { sections: Record<string, boolean> }; trips?: unknown[] };

describe('saved data from an older version', () => {
  it('starts new people with the Nearby block off on Home', () => {
    expect(defaultPersonal.sections.nearby).toBe(false);
    expect(defaultPersonal.sections.upnext).toBe(true);
  });

  it('switches Nearby off once for people who never changed the Home sections', () => {
    const everythingOn = { ...defaultPersonal, sections: { glance: true, budget: true, upnext: true, quick: true, forYou: true, nearby: true, discover: true } };
    expect(migrate({ personal: everythingOn, trips: [] }, 2).personal?.sections.nearby).toBe(false);
  });

  it('leaves a Home that the person set up themselves alone', () => {
    const custom = { ...defaultPersonal, sections: { glance: true, budget: false, upnext: true, quick: true, forYou: true, nearby: true, discover: true } };
    expect(migrate({ personal: custom, trips: [] }, 2).personal?.sections.nearby).toBe(true);
  });

  it('does nothing once the data is already on the current version', () => {
    const everythingOn = { ...defaultPersonal, sections: { glance: true, budget: true, upnext: true, quick: true, forYou: true, nearby: true, discover: true } };
    expect(migrate({ personal: everythingOn }, 3).personal?.sections.nearby).toBe(true);
  });

  it('still re-seeds the sample trips for data from before version 2', () => {
    const out = migrate({ trips: [{ id: 'own-trip' }], personal: { ...defaultPersonal } }, 1) as { trips: { id: string }[]; seeded?: boolean };
    expect(out.seeded).toBe(false);
    expect(out.trips.map((t) => t.id)).toContain('own-trip');
  });
});
