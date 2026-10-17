import { answerLocally, type AssistantContext } from '../assistant';
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
