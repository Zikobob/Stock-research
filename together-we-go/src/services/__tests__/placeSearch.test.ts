import { boxAround, guessType, mergeHits, normalizeQuery, searchOnline, searchSaved, typeFromOsm, type PlaceHit } from '../placeSearch';

/** What Photon answers for "Da Vincenzo" near Positano (trimmed to the fields we read). */
const photon = (features: unknown[]): typeof fetch => (async () => ({ ok: true, status: 200, json: async () => ({ features }) })) as unknown as typeof fetch;
const feature = (props: Record<string, unknown>, lng = 14.4849, lat = 40.6277) => ({ geometry: { coordinates: [lng, lat] }, properties: props });

const DA_VINCENZO = feature({ osm_type: 'N', osm_id: 1, osm_key: 'amenity', osm_value: 'restaurant', name: 'Da Vincenzo 1958', street: 'Via Pasitea', housenumber: '172', city: 'Positano', country: 'Italy' });
const BUS_STOP = feature({ osm_type: 'N', osm_id: 2, osm_key: 'highway', osm_value: 'bus_stop', name: 'Positano (Sponda)', city: 'Positano' });

describe('normalizeQuery', () => {
  it('drops leading articles and extra spaces', () => {
    expect(normalizeQuery('The museum')).toBe('museum');
    expect(normalizeQuery('  a   Pizza place ')).toBe('Pizza place');
    expect(normalizeQuery('An Evening Walk')).toBe('Evening Walk');
  });
  it('leaves nothing for a lone article', () => {
    expect(normalizeQuery('the')).toBe('');
    expect(normalizeQuery('  ')).toBe('');
  });
});

describe('searchSaved (the trip’s own places, no connection needed)', () => {
  it('finds a place by the start of its name, then by a word in it', () => {
    expect(searchSaved('da vinc', ['positano'])[0].name).toBe('Da Vincenzo');
    expect(searchSaved('assunta', ['positano'])[0].name).toBe('Santa Maria Assunta');
  });
  it('carries what the form needs: where it is, what kind it is, how long and how much', () => {
    const [hit] = searchSaved('Path of the Gods', ['positano']);
    expect(hit).toMatchObject({ source: 'saved', type: 'adventure', durationMin: 300, costPerPerson: 0, placeId: 'path-of-gods' });
    expect(hit.lat).toBeCloseTo(40.619, 2);
    expect(hit.detail).toContain('Positano');
  });
  it('returns nothing for one letter or no match, and never the same place twice', () => {
    expect(searchSaved('d', ['positano'])).toEqual([]);
    expect(searchSaved('zzzzqqqq', ['positano'])).toEqual([]);
    const twice = searchSaved('vincenzo', ['positano', 'positano']);
    expect(twice.filter((h) => h.name === 'Da Vincenzo')).toHaveLength(1);
  });
});

describe('searchOnline (OpenStreetMap through Photon)', () => {
  const center = { lat: 40.6287, lng: 14.4855 };

  it('turns features into places and leaves out streets and bus stops', async () => {
    const hits = await searchOnline('da vincenzo online', center, { fetchFn: photon([DA_VINCENZO, BUS_STOP]) });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ name: 'Da Vincenzo 1958', detail: 'Via Pasitea 172, Positano', type: 'food', source: 'online', lat: 40.6277, lng: 14.4849 });
  });

  it('looks around the trip first (rounded point and a box) and sends the words without the leading "the"', async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ features: [DA_VINCENZO] }) };
    }) as unknown as typeof fetch;
    await searchOnline('The Trattoria box', center, { fetchFn });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('q=Trattoria%20box');
    expect(urls[0]).toContain('lat=40.63&lon=14.49');
    expect(urls[0]).toMatch(/bbox=14\.\d+,40\.\d+,14\.\d+,40\.\d+/);
  });

  it('tries again anywhere when nothing is near the trip', async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ features: urls.length === 1 ? [] : [DA_VINCENZO] }) };
    }) as unknown as typeof fetch;
    const hits = await searchOnline('faraway fallback', center, { fetchFn });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('bbox=');
    expect(urls[1]).not.toContain('bbox=');
    expect(hits).toHaveLength(1);
  });

  it('searches everywhere when the trip has no known place', async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ features: [DA_VINCENZO] }) };
    }) as unknown as typeof fetch;
    await searchOnline('nowhere in particular', null, { fetchFn });
    expect(urls).toHaveLength(1);
    expect(urls[0]).not.toMatch(/lat=|bbox=/);
  });

  it('remembers an answer instead of asking again', async () => {
    const fetchFn = jest.fn(photon([DA_VINCENZO]));
    await searchOnline('remember me', center, { fetchFn });
    await searchOnline('Remember me', center, { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects when the service is down or the phone is offline', async () => {
    const down = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(searchOnline('service down', center, { fetchFn: down })).rejects.toThrow(/503/);
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(searchOnline('no network', center, { fetchFn: offline })).rejects.toThrow(/Network/);
  });

  it('gives up on a service that never answers', async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    const started = Date.now();
    await expect(searchOnline('very slow', center, { fetchFn: hang, timeoutMs: 40 })).rejects.toThrow(/abort/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('stops when the caller cancels', async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    const stop = new AbortController();
    const pending = searchOnline('cancel me', center, { fetchFn: hang, signal: stop.signal });
    stop.abort();
    await expect(pending).rejects.toThrow(/abort/);
  });

  it('does not ask for one letter', async () => {
    const fetchFn = jest.fn(photon([]));
    expect(await searchOnline('d', center, { fetchFn })).toEqual([]);
    expect(await searchOnline('the', center, { fetchFn })).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('typeFromOsm and guessType', () => {
  it('maps OpenStreetMap tags to activity types', () => {
    expect(typeFromOsm('tourism', 'museum')).toBe('culture');
    expect(typeFromOsm('tourism', 'hotel')).toBe('stay');
    expect(typeFromOsm('amenity', 'restaurant')).toBe('food');
    expect(typeFromOsm('amenity', 'bar')).toBe('nightlife');
    expect(typeFromOsm('shop', 'gift')).toBe('shopping');
    expect(typeFromOsm('natural', 'beach')).toBe('sightseeing');
    expect(typeFromOsm('railway', 'station')).toBe('transport');
    expect(typeFromOsm('something', 'else')).toBe('sightseeing');
  });
  it('guesses the type of words typed by hand', () => {
    expect(guessType('Dinner at 7')).toBe('food');
    expect(guessType('Sunset aperitivo')).toBe('nightlife');
    expect(guessType('Pompeii museum visit')).toBe('culture');
    expect(guessType('Morning hike')).toBe('adventure');
    expect(guessType('Transfer to the airport')).toBe('transport');
    expect(guessType('Check-in')).toBe('stay');
    expect(guessType('Wander around')).toBe('sightseeing');
  });
});

describe('mergeHits and boxAround', () => {
  const hit = (id: string, name: string, lat: number, lng: number, source: PlaceHit['source']): PlaceHit => ({ id, name, detail: '', lat, lng, type: 'food', source });
  it('shows saved places first and drops an online copy of the same place', () => {
    const saved = [hit('saved:1', 'Da Vincenzo', 40.6295, 14.488, 'saved')];
    const online = [hit('online:a', 'Da Vincenzo 1958', 40.6277, 14.4849, 'online'), hit('online:b', 'Max Restaurant', 40.6296, 14.486, 'online')];
    const merged = mergeHits(saved, online);
    expect(merged.map((h) => h.name)).toEqual(['Da Vincenzo', 'Max Restaurant']);
  });
  it('keeps two places with the same name when they are far apart', () => {
    const merged = mergeHits([hit('saved:1', 'Museum', 40.6, 14.4, 'saved')], [hit('online:a', 'Museum', 50.08, 14.43, 'online')]);
    expect(merged).toHaveLength(2);
  });
  it('shows at most seven', () => {
    const online = Array.from({ length: 12 }, (_, i) => hit(`online:${i}`, `Place ${i}`, 40 + i, 14, 'online'));
    expect(mergeHits([], online)).toHaveLength(7);
  });
  it('draws a box around the trip that is wider than it is tall in degrees at higher latitudes', () => {
    const [w, s, e, n] = boxAround({ lat: 60, lng: 10 }, 40);
    expect(n - s).toBeCloseTo(0.724, 2);
    expect(e - w).toBeGreaterThan(n - s);
    expect((w + e) / 2).toBeCloseTo(10, 5);
  });
});
