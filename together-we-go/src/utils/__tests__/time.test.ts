import { addDays, daysBetween, formatInTz, hoursAhead, isValidYMD, partsInTz, tripDays, tzOffsetMinutes, zonedToUtc } from '../time';

const iso = (ms: number) => new Date(ms).toISOString();

describe('calendar dates', () => {
  it('adds days across months and leap years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between two dates', () => {
    expect(daysBetween('2026-06-10', '2026-06-16')).toBe(6);
    expect(daysBetween('2026-06-16', '2026-06-10')).toBe(-6);
    expect(tripDays('2026-06-10', '2026-06-12')).toEqual(['2026-06-10', '2026-06-11', '2026-06-12']);
  });

  it('rejects dates that do not exist', () => {
    expect(isValidYMD('2026-02-30')).toBe(false);
    expect(isValidYMD('2026-13-01')).toBe(false);
    expect(isValidYMD('2026-6-1')).toBe(false);
    expect(isValidYMD('2028-02-29')).toBe(true);
  });
});

describe('time zones', () => {
  it('knows summer time and winter time in Rome', () => {
    expect(tzOffsetMinutes('Europe/Rome', Date.parse('2026-07-01T12:00:00Z'))).toBe(120);
    expect(tzOffsetMinutes('Europe/Rome', Date.parse('2026-01-15T12:00:00Z'))).toBe(60);
  });

  it('turns a wall-clock time in a city into the exact moment', () => {
    expect(iso(zonedToUtc('2026-07-01', '12:00', 'Europe/Rome'))).toBe('2026-07-01T10:00:00.000Z');
    expect(iso(zonedToUtc('2026-01-15', '12:00', 'Europe/Rome'))).toBe('2026-01-15T11:00:00.000Z');
    expect(iso(zonedToUtc('2026-06-10', '18:30', 'America/New_York'))).toBe('2026-06-10T22:30:00.000Z');
  });

  it('a New York to Rome flight converts to the right arrival day and duration', () => {
    const depart = zonedToUtc('2026-06-10', '18:30', 'America/New_York');
    const arrive = zonedToUtc('2026-06-11', '08:45', 'Europe/Rome');
    expect((arrive - depart) / 60000).toBe(8 * 60 + 15);
    expect(partsInTz(arrive, 'America/New_York')).toEqual({ ymd: '2026-06-11', hhmm: '02:45' });
    expect(formatInTz(arrive, 'Europe/Rome')).toMatch(/08:45$/);
  });

  it('round-trips wall time to UTC and back', () => {
    for (const tz of ['Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles', 'Asia/Kolkata']) {
      const utc = zonedToUtc('2026-09-15', '07:05', tz);
      expect(partsInTz(utc, tz)).toEqual({ ymd: '2026-09-15', hhmm: '07:05' });
    }
  });

  it('hours ahead between cities', () => {
    const july = Date.parse('2026-07-01T12:00:00Z');
    expect(hoursAhead('Asia/Tokyo', 'America/New_York', july)).toBe(13);
    expect(hoursAhead('Europe/Rome', 'America/New_York', july)).toBe(6);
    expect(hoursAhead('Asia/Kolkata', 'UTC', july)).toBe(5.5);
  });
});
