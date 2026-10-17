import { NetworkError, ServerError, createHttpTransport, normalizeServerUrl } from '../transport';

/** A fetch that never answers on its own but stops when told to (like a wifi that drops packets). */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });

const jsonFetch = (status: number, body: unknown): typeof fetch => async () => ({ status, json: async () => body }) as Response;

// The phone's own URL class (React Native's) is a simple text matcher, much looser than Node's or a browser's.
// Run the address checks against both, so a typo is rejected on the phone too.
const PHONE_URL = jest.requireActual('react-native/Libraries/Blob/URL').URL as typeof URL;
describe.each([
  ['Node', URL],
  ['the phone', PHONE_URL],
])('normalizeServerUrl with the URL class of %s', (_name, UrlClass) => {
  const original = globalThis.URL;
  beforeAll(() => {
    globalThis.URL = UrlClass;
  });
  afterAll(() => {
    globalThis.URL = original;
  });

  it('adds http:// and drops paths and trailing slashes', () => {
    expect(normalizeServerUrl('192.168.1.20:8787')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl(' http://192.168.1.20:8787/ ')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl('https://sync.example.org/path?x=1')).toBe('https://sync.example.org');
    expect(normalizeServerUrl('HTTP://Laptop.local:8787')).toBe('http://laptop.local:8787');
    expect(normalizeServerUrl('localhost:8787')).toBe('http://localhost:8787');
  });

  it('rejects things that are not addresses', () => {
    for (const bad of ['', '   ', 'http://', 'not an address at all', 'my laptop', 'ftp://192.168.1.2', 'http://192.168.1.2 :8787', 'http://-bad-.com', 'http://[::1]:8787', 'http://host:99999999']) {
      expect(normalizeServerUrl(bad)).toBeNull();
    }
  });
});

describe('normalizeServerUrl', () => {
  it('adds http:// and drops paths and trailing slashes', () => {
    expect(normalizeServerUrl('192.168.1.20:8787')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl(' http://192.168.1.20:8787/ ')).toBe('http://192.168.1.20:8787');
    expect(normalizeServerUrl('https://sync.example.org/path?x=1')).toBe('https://sync.example.org');
  });
  it('rejects empty and nonsense input', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
    expect(normalizeServerUrl('http://')).toBeNull();
  });
});

describe('http transport', () => {
  it('gives up on a server that never answers instead of waiting forever', async () => {
    const t = createHttpTransport('http://10.0.0.9:8787', hangingFetch, { timeoutMs: 40 });
    const started = Date.now();
    await expect(t.push('r1', 'AML-2026', 'phone001', [])).rejects.toThrow(NetworkError);
    await expect(t.pull('r1', 0, 'phone001', 0)).rejects.toThrow(/too long/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('looks up invite codes with a shorter limit than other requests', async () => {
    const t = createHttpTransport('http://10.0.0.9:8787', hangingFetch, { timeoutMs: 5000, lookupTimeoutMs: 40 });
    const started = Date.now();
    await expect(t.lookup('AML-2026')).rejects.toThrow(/too long/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('gives waiting requests extra time on top of the limit', async () => {
    const t = createHttpTransport('http://10.0.0.9:8787', hangingFetch, { timeoutMs: 20 });
    const started = Date.now();
    await expect(t.pull('r1', 0, 'me', 150)).rejects.toThrow(NetworkError);
    expect(Date.now() - started).toBeGreaterThanOrEqual(150);
  });

  it('lets the app cancel a request without calling it a network problem', async () => {
    const t = createHttpTransport('http://10.0.0.9:8787', hangingFetch, { timeoutMs: 5000 });
    const stop = new AbortController();
    const pending = t.pull('r1', 0, 'me', 1000, stop.signal);
    stop.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(NetworkError);
  });

  it('turns a refused connection into a NetworkError', async () => {
    const refused: typeof fetch = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(createHttpTransport('http://10.0.0.9:8787', refused).lookup('AML-2026')).rejects.toThrow(NetworkError);
  });

  it('treats 404 on a code lookup as "no such trip" and other errors as server errors', async () => {
    expect(await createHttpTransport('http://x:1', jsonFetch(404, { error: 'No trip with that code' })).lookup('ZZZ-0000')).toBeNull();
    expect(await createHttpTransport('http://x:1', jsonFetch(200, { tripId: 'rabc' })).lookup('AML-2026')).toBe('rabc');
    const err = await createHttpTransport('http://x:1', jsonFetch(429, { error: 'Too many tries. Wait a minute.' })).lookup('AML-2026').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).status).toBe(429);
    expect((err as ServerError).message).toMatch(/Too many tries/);
  });
});
