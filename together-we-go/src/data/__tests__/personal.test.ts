import { photos } from '../images';
import { destinations } from '../destinations';
import { INTERESTS, INTEREST_GOAL, TRIVIA_REMINDER, interestHint } from '../personal';

describe('interests in Make it yours', () => {
  it('offers the eight tiles, each once', () => {
    expect(INTERESTS.map((i) => i.key)).toEqual(['food', 'nightlife', 'nature', 'culture', 'beach', 'adventure', 'shopping', 'chill']);
    expect(new Set(INTERESTS.map((i) => i.key)).size).toBe(INTERESTS.length);
  });

  it('gives every tile a real photo, a label and an emoji', () => {
    for (const i of INTERESTS) {
      expect(i.image in photos).toBe(true);
      expect(i.label.length).toBeGreaterThan(2);
      expect(i.emoji).toBeTruthy();
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

describe('the daily trivia reminder', () => {
  it('is a valid time of day with words for the notification', () => {
    expect(TRIVIA_REMINDER.hour).toBeGreaterThanOrEqual(0);
    expect(TRIVIA_REMINDER.hour).toBeLessThan(24);
    expect(TRIVIA_REMINDER.minute).toBeGreaterThanOrEqual(0);
    expect(TRIVIA_REMINDER.minute).toBeLessThan(60);
    expect(TRIVIA_REMINDER.title).toMatch(/trivia/i);
    expect(TRIVIA_REMINDER.body.length).toBeGreaterThan(10);
  });
});
