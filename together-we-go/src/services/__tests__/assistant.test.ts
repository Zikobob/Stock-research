import { CLAUDE_MODEL, answerLocally, askClaude, type AssistantContext } from '../assistant';
import type { ChatMessage } from '@/store/types';
import { buildDemoTrip, DEMO_USER_ID } from '@/store/seed';
import { settlePlan } from '@/utils/money';

const trip = buildDemoTrip('upcoming');
const ctx: AssistantContext = { trip, userId: DEMO_USER_ID, rates: null, homeCurrency: 'USD' };
const ask = (q: string) => answerLocally(q, ctx);

describe('offline Trip Assistant', () => {
  it('answers budget questions from the real trip data', () => {
    const a = ask('How’s the budget?');
    expect(a).toMatch(/\$2,086 of \$4,000/);
    expect(a).toMatch(/per person/);
  });

  it('lists the fewest payments to settle up and matches the app’s own plan', () => {
    const plan = settlePlan(trip);
    const a = ask('who owes who?');
    expect(a).toContain(`${plan.length} transfer`);
    expect(a).toMatch(/→/);
  });

  it('converts currency with an honest label when offline', () => {
    const a = ask('convert 50 usd to eur');
    expect(a).toMatch(/\$50\.00 ≈ /);
    expect(a).toMatch(/offline reference rate/);
  });

  it('knows local emergency numbers', () => {
    expect(ask('emergency, I need an ambulance')).toMatch(/Police \d+/);
  });

  it('suggests places that are not already on the itinerary', () => {
    expect(ask('what should we do?')).toMatch(/Ideas not on your itinerary yet|already planned/);
  });

  it('says what it can do when it does not understand', () => {
    expect(ask('zzzz qqqq')).toMatch(/I can help with/);
  });

  it('greets by trip name', () => {
    expect(ask('hello')).toContain(trip.name);
  });
});

describe('Claude mode', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  const reply = (body: unknown, status = 200) => jest.fn(async (_url: string, _init?: RequestInit) => ({ ok: status < 400, status, json: async () => body }) as Response);
  const sentBody = (fetchMock: ReturnType<typeof reply>) => JSON.parse(fetchMock.mock.calls[0][1]?.body as string);

  it('sends the question, the recent chat and the trip to the Messages API', async () => {
    const fetchMock = reply({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Take the ferry from Amalfi.' }] });
    global.fetch = fetchMock as unknown as typeof fetch;
    const history: ChatMessage[] = [
      { id: 'a', authorId: 'assistant', text: 'old answer that starts the thread', ts: 1, ai: true },
      { id: 'b', authorId: DEMO_USER_ID, text: 'Where do we eat?', ts: 2 },
      { id: 'c', authorId: 'assistant', text: 'Try Da Vincenzo.', ts: 3, ai: true },
      { id: 'd', authorId: 'system', text: 'someone joined', ts: 4, kind: 'system' },
    ];
    const text = await askClaude('sk-ant-test', 'How do we get to Capri?', history, ctx);
    expect(text).toBe('Take the ferry from Amalfi.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'x-api-key': 'sk-ant-test', 'anthropic-version': '2023-06-01' });
    const body = sentBody(fetchMock);
    expect(body.model).toBe(CLAUDE_MODEL);
    expect(body.system).toContain(trip.name);
    // the thread must start with a user message, system notes are left out, and the question comes last
    expect(body.messages[0].role).toBe('user');
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(body.messages[0].content).toMatch(/Maya Chen: Where do we eat\?/);
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'How do we get to Capri?' });
    expect(JSON.stringify(body.messages)).not.toContain('someone joined');
  });

  it('only sends the last 12 messages of the chat', async () => {
    const fetchMock = reply({ content: [{ type: 'text', text: 'ok' }] });
    global.fetch = fetchMock as unknown as typeof fetch;
    const history: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, authorId: DEMO_USER_ID, text: `message ${i}`, ts: i }));
    await askClaude('sk-ant-test', 'And now?', history, ctx);
    expect(sentBody(fetchMock).messages).toHaveLength(13);
    expect(sentBody(fetchMock).messages[0].content).toContain('message 18');
  });

  it('joins several text blocks and ignores the rest', async () => {
    global.fetch = reply({ content: [{ type: 'text', text: 'First.' }, { type: 'tool_use' }, { type: 'text', text: 'Second.' }] }) as unknown as typeof fetch;
    expect(await askClaude('k', 'q', [], ctx)).toBe('First.\nSecond.');
  });

  it('fails clearly when the key is wrong, the model refuses or the answer is empty', async () => {
    global.fetch = reply({ error: { message: 'invalid x-api-key' } }, 401) as unknown as typeof fetch;
    await expect(askClaude('bad', 'q', [], ctx)).rejects.toThrow('Claude 401');
    global.fetch = reply({ stop_reason: 'refusal', content: [] }) as unknown as typeof fetch;
    await expect(askClaude('k', 'q', [], ctx)).rejects.toThrow('refused');
    global.fetch = reply({ content: [{ type: 'text', text: '   ' }] }) as unknown as typeof fetch;
    await expect(askClaude('k', 'q', [], ctx)).rejects.toThrow('empty');
  });

  it('gives up after 45 seconds instead of waiting forever', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => (init as RequestInit).signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    const pending = askClaude('k', 'q', [], ctx);
    const outcome = expect(pending).rejects.toThrow('aborted');
    await jest.advanceTimersByTimeAsync(45_000);
    await outcome;
  });
});
