import { airportByIata } from '@/data/airports';

import { blankFlight, checkFlight, flightMinutes, suggestTimes, withAirports, withDirection, type FlightForm } from '../flightForm';

const trip = { id: 't1', startDate: '2026-10-30', endDate: '2026-11-04' };
const filled = (over: Partial<FlightForm> = {}): FlightForm => ({ ...blankFlight(trip, 'NAP', 'maya'), airline: 'Delta', flightNo: 'DL 99', ...over });

describe('how long a flight takes', () => {
  it('is between one and twenty hours', () => {
    expect(flightMinutes(10)).toBe(60);
    expect(flightMinutes(40000)).toBe(20 * 60);
  });
  it('gives about 8 to 9 hours from New York to Naples', () => {
    const km = 6400;
    expect(flightMinutes(km)).toBeGreaterThan(7.5 * 60);
    expect(flightMinutes(km)).toBeLessThan(10 * 60);
  });
});

describe('suggested times', () => {
  const BOS = airportByIata('BOS')!;
  const NAP = airportByIata('NAP')!;

  it('an arriving flight lands on the first day at 14:30 and leaves earlier, in the clock of the airport it leaves', () => {
    const s = suggestTimes('arrival', trip, BOS, NAP);
    expect(s.arrDate).toBe('2026-10-30');
    expect(s.arrTime).toBe('14:30');
    expect(s.depDate <= '2026-10-30').toBe(true);
    expect(s.depTime).toMatch(/^\d\d:\d[05]$/);
  });

  it('a departing flight leaves on the last day at 11:00', () => {
    const s = suggestTimes('departure', trip, NAP, BOS);
    expect(s.depDate).toBe('2026-11-04');
    expect(s.depTime).toBe('11:00');
  });

  it('always passes the checks, whatever the clocks do (the week the US and Europe change clocks on different days)', () => {
    for (const from of ['BOS', 'JFK', 'LAX', 'HND', 'SYD', 'LHR']) {
      const f = withAirports(filled({ from: '', to: 'NAP' }), trip, { from });
      expect(checkFlight(f).errors.arr).toBeUndefined();
    }
  });
});

describe('the form changes the times for you, until you change them yourself', () => {
  it('sets them when the second airport is known', () => {
    const f = withAirports(filled({ from: '' }), trip, { from: 'BOS' });
    expect(f.from).toBe('BOS');
    expect(f.depTime).not.toBe('20:00');
  });
  it('leaves them alone when they were set by hand', () => {
    const f = withAirports(filled({ timesTouched: true, depTime: '09:15' }), trip, { from: 'BOS' });
    expect(f.depTime).toBe('09:15');
  });
  it('waits while an airport code is unknown', () => {
    const f = withAirports(filled(), trip, { from: 'XXX' });
    expect(f.depTime).toBe('20:00');
  });
  it('swaps the airports when you switch to departing', () => {
    const f = withDirection(filled({ from: 'BOS', to: 'NAP' }), trip, 'departure');
    expect(f.direction).toBe('departure');
    expect(f.from).toBe('NAP');
    expect(f.to).toBe('BOS');
    expect(f.depDate).toBe('2026-11-04');
    expect(withDirection(f, trip, 'departure')).toBe(f);
  });
});

describe('checking a flight', () => {
  it('asks for what is missing', () => {
    const c = checkFlight(blankFlight(trip, 'NAP', 'maya'));
    expect(c.ok).toBe(false);
    expect(c.errors.airline).toBe('Enter the airline');
    expect(c.errors.flightNo).toBeTruthy();
    expect(c.errors.from).toBeTruthy();
  });
  it('rejects an airport it does not know and two airports that are the same', () => {
    expect(checkFlight(filled({ from: 'XXX' })).errors.from).toMatch(/recognise/);
    expect(checkFlight(filled({ from: 'NAP', to: 'NAP' })).errors.to).toMatch(/differ/);
  });
  it('rejects a bad seat', () => {
    expect(checkFlight(filled({ from: 'BOS', seat: '9' })).errors.seat).toBe('Seats look like 32A');
  });
  it('rejects a landing before the take-off and a flight that is far too long', () => {
    const early = checkFlight(filled({ from: 'BOS', depDate: '2026-10-30', depTime: '20:00', arrDate: '2026-10-30', arrTime: '08:00' }));
    expect(early.errors.arr).toMatch(/after departure/);
    const long = checkFlight(filled({ from: 'BOS', depDate: '2026-10-27', depTime: '08:00', arrDate: '2026-10-30', arrTime: '14:30' }));
    expect(long.errors.arr).toMatch(/double-check/);
  });
  it('accepts a good flight and works out both instants', () => {
    const f = withAirports(filled({ from: '' }), trip, { from: 'BOS' });
    const c = checkFlight({ ...f, seat: '32A' });
    expect(c.ok).toBe(true);
    expect(c.arriveUtc).toBeGreaterThan(c.departUtc);
  });
});
