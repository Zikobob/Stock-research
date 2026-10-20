import type { ExpenseCategory } from '@/store/types';

const GUESSES: [RegExp, ExpenseCategory][] = [
  [/\b(flight|flights|airline|baggage|luggage)\b/, 'Flights'],
  [/\b(hotel|hostel|villa|airbnb|apartment|rent|rooms?|accommodation|stay|resort)\b/, 'Stays'],
  [/\b(taxi|uber|lyft|train|bus|ferry|metro|fuel|gas|petrol|parking|toll|scooter|car hire|rental|transfer)\b/, 'Transport'],
  [/\b(ticket|tickets|tour|museum|entry|entrance|excursion|boat|show|concert|park|guide|activity)\b/, 'Activities'],
  [/\b(dinner|lunch|breakfast|brunch|pizza|pasta|gelato|coffee|cafe|café|restaurant|food|drinks?|snacks?|groceries|bar|beer|wine|tacos|sushi|ramen|bakery)\b/, 'Food'],
  [/\b(shop|shopping|souvenirs?|gift|gifts|clothes|market|store)\b/, 'Shopping'],
];

/** The likeliest expense category for words typed by hand ("Taxi to the pier" is Transport), or Other when nothing fits. */
export function guessExpenseCategory(text: string): ExpenseCategory {
  const t = text.toLowerCase();
  return GUESSES.find(([re]) => re.test(t))?.[1] ?? 'Other';
}
