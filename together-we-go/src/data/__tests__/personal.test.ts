import { photos } from '../images';
import { destinations } from '../destinations';
import { INTERESTS, INTEREST_GOAL, TRIVIA_REMINDER, interestHint, interestNames } from '../personal';

describe('interests in Make it yours', () => {
  it('offers the eight tiles, each once', () => {
    expect(INTERESTS.map((i) => i.key)).toEqual(['food', 'nightlife', 'nature', 'culture', 'beach', 'adventure', 'shopping', 'chill']);
    expect(new Set(INTERESTS.map((i) => i.key)).size).toBe(INTERESTS.length);
  });

  it('gives every tile a real photo, a label and a line icon (no emoji)', () => {
    for (const i of INTERESTS) {
      expect(i.image in photos).toBe(true);
      expect(i.label.length).toBeGreaterThan(2);
      expect(i.icon).toMatch(/-outline$/);
      expect(Object.keys(i)).not.toContain('emoji');
    }
  });

  it.each(INTERESTS.map((i) => i.key))('"Picked for you" has enough places for %s', (key) => {
    expect(destinations.filter((d) => d.tags.includes(key)).length).toBeGreaterThanOrEqual(5);
  });

  it('says how far along the person is without ever blocking them', () => {
    expect(interestHint(0)).toBe('Pick 3 or more');
    expect(interestHint(1)).toContain('1 picked');
    expect(interestHint(INTEREST_GOAL)).toContain('nice');
    expect(interestHint(8)).toContain('8 picked');
  });
});

describe('naming the picks for a summary line', () => {
  it('lists them in the order of the tiles, and says so when nothing is picked', () => {
    expect(interestNames(['chill', 'food', 'beach'])).toBe('Food, Beaches, Chill');
    expect(interestNames([])).toBe('A bit of everything');
    expect(interestNames(['not-a-tag'])).toBe('A bit of everything');
  });
});

describe('the daily trivia reminder', () => {
  it('is a valid time of day with words for the notification', () => {
    expect(TRIVIA_REMINDER.hour).toBeGreaterThanOrEqual(0);
    expect(TRIVIA_REMINDER.hour).toBeLessThan(24);
    expect(TRIVIA_REMINDER.minute).toBeGreaterThanOrEqual(0);
    expect(TRIVIA_REMINDER.minute).toBeLessThan(60);
    expect(TRIVIA_REMINDER.title).toMatch(/trivia/i);
    expect(TRIVIA_REMINDER.body.length).toBeGreaterThan(10);
    // no emoji in the words (the look has none)
    expect(`${TRIVIA_REMINDER.title}${TRIVIA_REMINDER.body}`).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
