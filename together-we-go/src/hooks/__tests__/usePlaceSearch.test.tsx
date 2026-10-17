import { act, create } from 'react-test-renderer';

import { searchOnline, type PlaceHit } from '@/services/placeSearch';

import { usePlaceSearch, type PlaceSearchState } from '../usePlaceSearch';

jest.mock('@/services/placeSearch', () => ({ ...jest.requireActual('@/services/placeSearch'), searchOnline: jest.fn() }));
const ask = searchOnline as jest.MockedFunction<typeof searchOnline>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const online = (name: string, lat = 40.6288, lng = 14.3809): PlaceHit => ({ id: `online:${name}`, name, detail: 'Sorrento', lat, lng, type: 'culture', source: 'online' });

/** Renders the hook and keeps the latest answer in `latest.current`. */
function setup(text: string, enabled = true) {
  const latest: { current: PlaceSearchState } = { current: { hits: [], loading: false, offline: false } };
  function Probe(props: { text: string; enabled: boolean }) {
    latest.current = usePlaceSearch(props.text, { destinationIds: ['positano'], around: { lat: 40.63, lng: 14.49 }, enabled: props.enabled });
    return null;
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Probe text={text} enabled={enabled} />);
  });
  const set = (t: string, on = true) => act(() => tree.update(<Probe text={t} enabled={on} />));
  return { latest, set };
}

describe('usePlaceSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    ask.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('shows saved places at once and the online ones when they arrive', async () => {
    ask.mockResolvedValue([online('Museo Correale')]);
    const { latest, set } = setup('');
    await set('da vincenzo');
    expect(latest.current.hits.map((h) => h.name)).toContain('Da Vincenzo'); // no waiting for the network
    expect(latest.current.loading).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(latest.current.loading).toBe(false);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('asks once after typing stops, not once per letter', async () => {
    ask.mockResolvedValue([]);
    const { set } = setup('');
    for (const t of ['mu', 'mus', 'muse', 'museu', 'museum']) {
      await set(t);
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
    expect(ask).not.toHaveBeenCalled(); // still typing
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0]).toBe('museum');
  });

  it('merges the online answer after the saved places, without duplicates', async () => {
    ask.mockResolvedValue([online('Museo Correale'), online('Da Vincenzo 1958', 40.6277, 14.4849)]); // the second one is the saved Da Vincenzo, 200 m away
    const { latest, set } = setup('');
    await set('vincenzo');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    const names = latest.current.hits.map((h) => h.name);
    expect(names[0]).toBe('Da Vincenzo');
    expect(names.filter((n) => n === 'Da Vincenzo')).toHaveLength(1); // the online copy is the same place
    expect(names).toContain('Museo Correale');
  });

  it('says so when the online search cannot be reached, and keeps the saved places', async () => {
    ask.mockRejectedValue(new TypeError('Network request failed'));
    const { latest, set } = setup('');
    await set('santa maria');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(latest.current.offline).toBe(true);
    expect(latest.current.loading).toBe(false);
    expect(latest.current.hits[0].name).toBe('Santa Maria Assunta');
  });

  it('does nothing for one letter or while switched off', async () => {
    const { latest, set } = setup('');
    await set('d');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(ask).not.toHaveBeenCalled();
    expect(latest.current).toEqual({ hits: [], loading: false, offline: false });
    await set('vincenzo', false);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(ask).not.toHaveBeenCalled();
    expect(latest.current.hits).toEqual([]);
  });

  it('forgets an answer that comes back after the words changed', async () => {
    let finish: (hits: PlaceHit[]) => void = () => {};
    ask.mockImplementationOnce((_q, _c, o) => new Promise((resolve) => { finish = resolve; o?.signal?.addEventListener('abort', () => resolve([])); }));
    ask.mockResolvedValue([online('Museum of Something Else')]);
    const { latest, set } = setup('');
    await set('first words');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await set('second words');
    await act(async () => {
      finish([online('Stale answer')]);
      jest.advanceTimersByTime(400);
    });
    expect(latest.current.hits.map((h) => h.name)).not.toContain('Stale answer');
  });
});
