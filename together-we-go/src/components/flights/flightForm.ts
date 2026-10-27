/**
 * The add-flight form as plain data, with no React in it so it can be tested: the blank form, the times the app works out for
 * the person, and the checks done before saving.
 */
import { airportByIata, type Airport } from '@/data/airports';
import { distanceKm } from '@/utils/geo';
import { addDays, partsInTz, zonedToUtc } from '@/utils/time';
import { maxLen, validateFlightNumber, validateIata } from '@/utils/validation';

export interface FlightForm {
  tripId: string;
  memberId: string;
  direction: 'arrival' | 'departure';
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  seat: string;
  conf: string;
  /** The person has chosen a date or a time by hand: the airports no longer rewrite them. */
  timesTouched: boolean;
}

/** The longest flight the form accepts without asking the person to check the dates. */
export const MAX_FLIGHT_HOURS = 22;

export function blankFlight(trip: { id: string; startDate: string }, destAirport: string, memberId: string): FlightForm {
  return {
    tripId: trip.id,
    memberId,
    direction: 'arrival',
    airline: '',
    flightNo: '',
    from: '',
    to: destAirport,
    depDate: addDays(trip.startDate, -1),
    depTime: '20:00',
    arrDate: trip.startDate,
    arrTime: '14:30',
    seat: '',
    conf: '',
    timesTouched: false,
  };
}

/** About how long a flight of this distance takes, door to door on the runway: 40 minutes plus the distance at 820 km/h. Between one and twenty hours. */
export function flightMinutes(km: number): number {
  return Math.min(20 * 60, Math.max(60, Math.round(40 + (km / 820) * 60)));
}

const round5 = (utc: number) => Math.round(utc / 300000) * 300000;

/**
 * The dates and times to suggest once both airports are known. An arriving flight lands on the first day of the trip at 14:30 and
 * leaves as long before as the distance takes; a departing flight leaves on the last day at 11:00 and lands as long after.
 * Each time is in its own airport's clock, because that is how the form asks for them.
 */
export function suggestTimes(direction: FlightForm['direction'], trip: { startDate: string; endDate: string }, from: Airport, to: Airport): Pick<FlightForm, 'depDate' | 'depTime' | 'arrDate' | 'arrTime'> {
  const minutes = flightMinutes(distanceKm(from, to));
  if (direction === 'arrival') {
    const arrive = zonedToUtc(trip.startDate, '14:30', to.tz);
    const dep = partsInTz(round5(arrive - minutes * 60000), from.tz);
    return { depDate: dep.ymd, depTime: dep.hhmm, arrDate: trip.startDate, arrTime: '14:30' };
  }
  const depart = zonedToUtc(trip.endDate, '11:00', from.tz);
  const arr = partsInTz(round5(depart + minutes * 60000), to.tz);
  return { depDate: trip.endDate, depTime: '11:00', arrDate: arr.ymd, arrTime: arr.hhmm };
}

/** Changes the airports and, unless the person has set the times by hand, lets the new airports set them. */
export function withAirports(form: FlightForm, trip: { startDate: string; endDate: string }, patch: Partial<Pick<FlightForm, 'from' | 'to'>>): FlightForm {
  const next = { ...form, ...patch };
  const A = airportByIata(next.from);
  const B = airportByIata(next.to);
  if (next.timesTouched || !A || !B || A.iata === B.iata) return next;
  return { ...next, ...suggestTimes(next.direction, trip, A, B) };
}

/** Switches between arriving and departing: the two airports swap places (you fly from home to the trip, and back), and the times start over. */
export function withDirection(form: FlightForm, trip: { startDate: string; endDate: string }, direction: FlightForm['direction']): FlightForm {
  if (direction === form.direction) return form;
  const base: FlightForm = { ...form, direction, from: form.to, to: form.from, timesTouched: false };
  const A = airportByIata(base.from);
  const B = airportByIata(base.to);
  if (A && B && A.iata !== B.iata) return { ...base, ...suggestTimes(direction, trip, A, B) };
  return direction === 'arrival'
    ? { ...base, depDate: addDays(trip.startDate, -1), depTime: '20:00', arrDate: trip.startDate, arrTime: '14:30' }
    : { ...base, depDate: trip.endDate, depTime: '11:00', arrDate: trip.endDate, arrTime: '14:30' };
}

export interface FlightCheck {
  errors: Record<string, string | null>;
  departUtc: number;
  arriveUtc: number;
  ok: boolean;
}

/** Checks the form the way the sheet does when you press Save: every field, then the two times against each other. */
export function checkFlight(f: FlightForm): FlightCheck {
  const A = airportByIata(f.from);
  const B = airportByIata(f.to);
  const errors: Record<string, string | null> = {
    airline: f.airline.trim() ? maxLen(30, 'Airline')(f.airline) : 'Enter the airline',
    flightNo: validateFlightNumber(f.flightNo),
    from: validateIata(f.from, 'departure'),
    to: validateIata(f.to, 'arrival') ?? (f.from.trim().toUpperCase() === f.to.trim().toUpperCase() ? 'Departure and arrival airports must differ' : null),
    seat: f.seat && !/^\d{1,3}[A-K]$/i.test(f.seat.trim()) ? 'Seats look like 32A' : null,
  };
  let departUtc = 0;
  let arriveUtc = 0;
  if (A && B && !errors.from && !errors.to) {
    departUtc = zonedToUtc(f.depDate, f.depTime, A.tz);
    arriveUtc = zonedToUtc(f.arrDate, f.arrTime, B.tz);
    const hrs = (arriveUtc - departUtc) / 3600000;
    if (hrs <= 0) errors.arr = 'Arrival must be after departure (times are local to each airport)';
    else if (hrs > MAX_FLIGHT_HOURS) errors.arr = `That’s a ${Math.round(hrs)}h flight — double-check the dates`;
  }
  return { errors, departUtc, arriveUtc, ok: !Object.values(errors).some(Boolean) };
}
