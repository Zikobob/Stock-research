import {
  firstError, maxLen, normalizeInvite, parseAmount, passwordStrength, required, validateAmount, validateEmail, validateFlightNumber,
  validateIata, validateInvite, validateName, validatePassword, validateTime, validateTripDates,
} from '../validation';

describe('syntax checks (is it shaped right?)', () => {
  it('emails', () => {
    expect(validateEmail('maya@mail.com')).toBeNull();
    expect(validateEmail('  maya@mail.com  ')).toBeNull();
    expect(validateEmail('')).toMatch(/Enter/);
    expect(validateEmail('maya@mail')).toMatch(/doesn’t look right/);
    expect(validateEmail('maya mail@x.com')).not.toBeNull();
  });

  it('passwords need 8+ characters with a letter and a number', () => {
    expect(validatePassword('TravelTogether2026!')).toBeNull();
    expect(validatePassword('short1')).toMatch(/8 characters/);
    expect(validatePassword('onlyletters')).toMatch(/letter and one number/);
    expect(validatePassword('12345678')).toMatch(/letter and one number/);
  });

  it('password strength rises with length and variety', () => {
    expect(passwordStrength('abc').score).toBe(0);
    expect(passwordStrength('abcdefgh1').score).toBeLessThan(passwordStrength('Abcdefgh1234!').score);
    expect(passwordStrength('Abcdefgh1234!').label).toBe('Very strong');
  });

  it('names accept accents and apostrophes but not digits or symbols', () => {
    expect(validateName('José O’Brien-Müller')).toBeNull();
    expect(validateName('A')).toMatch(/too short/);
    expect(validateName('R2D2')).toMatch(/only contain letters/);
    expect(validateName('x'.repeat(41))).toMatch(/under 40/);
  });

  it('times are 24-hour HH:MM', () => {
    expect(validateTime('09:30')).toBeNull();
    expect(validateTime('23:59')).toBeNull();
    expect(validateTime('24:00')).not.toBeNull();
    expect(validateTime('9:30')).not.toBeNull();
    expect(validateTime('12:60')).not.toBeNull();
  });

  it('invite codes are normalised then checked', () => {
    expect(normalizeInvite('aml2026')).toBe('AML-2026');
    expect(normalizeInvite('  aml-2026 ')).toBe('AML-2026');
    expect(validateInvite('AML-2026')).toBeNull();
    expect(validateInvite('AML2026')).toMatch(/ABC-1234/);
    expect(validateInvite('')).toMatch(/Enter the code/);
  });

  it('flight numbers', () => {
    expect(validateFlightNumber('NH 175')).toBeNull();
    expect(validateFlightNumber('ua837')).toBeNull();
    expect(validateFlightNumber('FLIGHT')).not.toBeNull();
  });
});

describe('meaning checks (does it make sense for a trip?)', () => {
  it('amounts: positive, sensible, plain numbers', () => {
    expect(parseAmount('1,200.50')).toBe(1200.5);
    expect(parseAmount('12.345')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('12abc')).toBeNull();
    expect(validateAmount('0')).toMatch(/more than 0/);
    expect(validateAmount('2000000')).toMatch(/double-check/);
    expect(validateAmount('25.50')).toBeNull();
  });

  it('a trip cannot end before it starts, or run for months', () => {
    expect(validateTripDates('2026-06-10', '2026-06-16')).toEqual({});
    expect(validateTripDates('2026-06-10', '2026-06-09').end).toMatch(/on or after/);
    expect(validateTripDates('2026-06-10', '2026-09-01').end).toMatch(/at most 60 days/);
  });

  it('dates must exist on the calendar', () => {
    expect(validateTripDates('2026-02-30', '2026-03-02').start).toMatch(/valid start/);
    expect(validateTripDates('2028-02-29', '2028-03-02')).toEqual({}); // leap year
    expect(validateTripDates('2026-02-29', '2026-03-02').start).toBeDefined(); // not a leap year
  });

  it('airport codes must be real airports', () => {
    expect(validateIata('jfk', 'departure')).toBeNull();
    expect(validateIata('FCO', 'arrival')).toBeNull();
    expect(validateIata('XXX', 'arrival')).toMatch(/don’t recognise/);
    expect(validateIata('JF', 'arrival')).toMatch(/3 letters/);
    expect(validateIata('', 'arrival')).toMatch(/Enter the arrival/);
  });
});

describe('helpers', () => {
  it('firstError returns the first failing validator only', () => {
    expect(firstError('', required('a name'), maxLen(5))).toBe('Enter a name');
    expect(firstError('toolong', required('a name'), maxLen(5, 'Name'))).toBe('Name must be 5 characters or fewer');
    expect(firstError('ok', required('a name'), maxLen(5))).toBeNull();
  });
});
