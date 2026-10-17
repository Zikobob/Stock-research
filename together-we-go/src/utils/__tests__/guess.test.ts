import { guessExpenseCategory } from '../guess';

describe('guessExpenseCategory', () => {
  it.each([
    ['Taxi to the pier', 'Transport'],
    ['Gelato', 'Food'],
    ['Pizza & wine', 'Food'],
    ['Villa deposit', 'Stays'],
    ['Museum tickets', 'Activities'],
    ['Boat tour to Capri', 'Activities'],
    ['Delta flight', 'Flights'],
    ['Souvenirs for mum', 'Shopping'],
    ['Something else', 'Other'],
    ['', 'Other'],
  ])('%s -> %s', (text, expected) => {
    expect(guessExpenseCategory(text)).toBe(expected);
  });
});
