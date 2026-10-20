/**
 * Offline reference data: currencies, emergency numbers, phrasebook, quiz,
 * survey and packing suggestions. Everything here works with zero connectivity.
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  /** Fallback rate per 1 USD, used when live rates can't be fetched. */
  perUsd: number;
}

export const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', perUsd: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', perUsd: 0.86 },
  { code: 'GBP', name: 'British Pound', symbol: '£', perUsd: 0.75 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', perUsd: 152.4 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', perUsd: 1.38 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', perUsd: 1.52 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', perUsd: 88.2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', perUsd: 7.12 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', perUsd: 1390 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', perUsd: 18.4 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', perUsd: 0.8 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', perUsd: 1.29 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', perUsd: 32.4 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', perUsd: 16400 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', perUsd: 26300 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', perUsd: 3.67 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', perUsd: 41.5 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', perUsd: 17.4 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', perUsd: 5.35 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', perUsd: 3.5 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', perUsd: 20.9 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', perUsd: 122 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', perUsd: 9.1 },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', perUsd: 15.4 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', perUsd: 1.7 },
];

export const currencyByCode = (code: string) => currencies.find((c) => c.code === code);

export interface EmergencyInfo {
  police: string;
  ambulance: string;
  fire: string;
  tips: string[];
}

export const emergencyByCountry: Record<string, EmergencyInfo> = {
  JP: { police: '110', ambulance: '119', fire: '119', tips: ['Japan Visitor Hotline (24h, English): 050-3816-2787', 'Koban (police boxes) are on most corners — staff help with directions too.', 'Carry your passport: foreigners must have ID at all times.'] },
  FR: { police: '17', ambulance: '15', fire: '18', tips: ['112 works from any phone in the EU.', 'Pharmacies (green cross) give free advice for minor issues.'] },
  IT: { police: '112', ambulance: '118', fire: '115', tips: ['112 is the single EU emergency number.'] },
  ES: { police: '112', ambulance: '112', fire: '112', tips: ['Tourist police offices help with lost passports.'] },
  GB: { police: '999', ambulance: '999', fire: '999', tips: ['Call 111 for non-emergency NHS medical advice.'] },
  US: { police: '911', ambulance: '911', fire: '911', tips: ['Text 911 is available in many counties.'] },
  TH: { police: '191', ambulance: '1669', fire: '199', tips: ['Tourist Police (English): 1155.'] },
  ID: { police: '110', ambulance: '118', fire: '113', tips: ['112 also works from mobiles.'] },
  SG: { police: '999', ambulance: '995', fire: '995', tips: ['Non-emergency ambulance: 1777.'] },
  AU: { police: '000', ambulance: '000', fire: '000', tips: ['112 also works on mobiles.'] },
  KR: { police: '112', ambulance: '119', fire: '119', tips: ['1330 — tourist helpline in English, Japanese and Chinese.'] },
  DEFAULT: { police: '112', ambulance: '112', fire: '112', tips: ['112 works on most mobile networks worldwide.', 'Save your country’s embassy number before you fly.'] },
};

export interface Phrase {
  en: string;
  local: string;
  roman?: string;
}

export const phrasebook: Record<string, { lang: string; speechCode: string; phrases: Phrase[] }> = {
  Japanese: {
    lang: 'Japanese', speechCode: 'ja-JP', phrases: [
      { en: 'Hello', local: 'こんにちは', roman: 'Konnichiwa' },
      { en: 'Thank you', local: 'ありがとうございます', roman: 'Arigatou gozaimasu' },
      { en: 'Excuse me / Sorry', local: 'すみません', roman: 'Sumimasen' },
      { en: 'How much is this?', local: 'これはいくらですか？', roman: 'Kore wa ikura desu ka?' },
      { en: 'Where is the station?', local: '駅はどこですか？', roman: 'Eki wa doko desu ka?' },
      { en: 'Table for six, please', local: '六人です', roman: 'Roku-nin desu' },
      { en: 'The bill, please', local: 'お会計お願いします', roman: 'Okaikei onegaishimasu' },
      { en: 'I have an allergy', local: 'アレルギーがあります', roman: 'Arerugī ga arimasu' },
      { en: 'Help!', local: '助けて！', roman: 'Tasukete!' },
      { en: 'Delicious!', local: 'おいしい！', roman: 'Oishii!' },
    ],
  },
  French: {
    lang: 'French', speechCode: 'fr-FR', phrases: [
      { en: 'Hello', local: 'Bonjour' }, { en: 'Thank you', local: 'Merci beaucoup' },
      { en: 'Excuse me', local: 'Excusez-moi' }, { en: 'How much is this?', local: 'Combien ça coûte ?' },
      { en: 'Where is the metro?', local: 'Où est le métro ?' }, { en: 'The bill, please', local: 'L’addition, s’il vous plaît' },
      { en: 'Help!', local: 'Au secours !' },
    ],
  },
  Spanish: {
    lang: 'Spanish', speechCode: 'es-ES', phrases: [
      { en: 'Hello', local: 'Hola' }, { en: 'Thank you', local: 'Muchas gracias' },
      { en: 'Excuse me', local: 'Perdón' }, { en: 'How much is this?', local: '¿Cuánto cuesta?' },
      { en: 'Where is the bathroom?', local: '¿Dónde está el baño?' }, { en: 'The bill, please', local: 'La cuenta, por favor' },
      { en: 'Help!', local: '¡Ayuda!' },
    ],
  },
  Italian: {
    lang: 'Italian', speechCode: 'it-IT', phrases: [
      { en: 'Hello', local: 'Ciao / Buongiorno' }, { en: 'Thank you', local: 'Grazie mille' },
      { en: 'How much is this?', local: 'Quanto costa?' }, { en: 'The bill, please', local: 'Il conto, per favore' },
      { en: 'Help!', local: 'Aiuto!' },
    ],
  },
  Korean: {
    lang: 'Korean', speechCode: 'ko-KR', phrases: [
      { en: 'Hello', local: '안녕하세요', roman: 'Annyeonghaseyo' }, { en: 'Thank you', local: '감사합니다', roman: 'Gamsahamnida' },
      { en: 'How much is this?', local: '이거 얼마예요?', roman: 'Igeo eolmayeyo?' }, { en: 'Help!', local: '도와주세요!', roman: 'Dowajuseyo!' },
    ],
  },
  Thai: {
    lang: 'Thai', speechCode: 'th-TH', phrases: [
      { en: 'Hello', local: 'สวัสดี', roman: 'Sawasdee' }, { en: 'Thank you', local: 'ขอบคุณ', roman: 'Khob khun' },
      { en: 'How much?', local: 'เท่าไหร่', roman: 'Tao rai?' }, { en: 'Not spicy', local: 'ไม่เผ็ด', roman: 'Mai phet' },
    ],
  },
  Portuguese: {
    lang: 'Portuguese', speechCode: 'pt-PT', phrases: [
      { en: 'Hello', local: 'Olá' }, { en: 'Thank you', local: 'Obrigado / Obrigada' },
      { en: 'How much is this?', local: 'Quanto custa?' }, { en: 'Help!', local: 'Socorro!' },
    ],
  },
};

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  fact: string;
}

export const quizQuestions: QuizQuestion[] = [
  { q: 'Which city has the busiest pedestrian scramble crossing in the world?', options: ['Osaka', 'Tokyo', 'Seoul', 'Hong Kong'], answer: 1, fact: 'Up to 3,000 people cross Shibuya Crossing every time the lights change.' },
  { q: 'How many torii gates line the trails of Fushimi Inari in Kyoto (approx.)?', options: ['500', '1,000', '10,000', '50,000'], answer: 2, fact: 'Around 10,000 gates — each donated by a business or individual.' },
  { q: 'What does “itadakimasu” express before a meal in Japan?', options: ['Cheers', 'Gratitude for the food', 'The bill please', 'Good morning'], answer: 1, fact: 'It thanks everyone (and everything) that made the meal possible.' },
  { q: 'Which currency is used in Switzerland?', options: ['Euro', 'Swiss franc', 'Krone', 'Pound'], answer: 1, fact: 'Switzerland kept the franc (CHF) and is not in the eurozone.' },
  { q: 'The Eiffel Tower was originally built for which event?', options: ['1889 World’s Fair', 'The 1900 Olympics', 'A royal wedding', 'WWI victory'], answer: 0, fact: 'It was meant to stand for only 20 years!' },
  { q: 'Machu Picchu was built by which civilisation?', options: ['Maya', 'Aztec', 'Inca', 'Olmec'], answer: 2, fact: 'Built around 1450 for the Inca emperor Pachacuti.' },
  { q: 'Which country has the most time zones (including territories)?', options: ['Russia', 'USA', 'France', 'China'], answer: 2, fact: 'France spans 12 time zones thanks to its overseas territories.' },
  { q: 'In which city would you ride a vaporetto?', options: ['Amsterdam', 'Venice', 'Lisbon', 'Istanbul'], answer: 1, fact: 'Vaporetti are Venice’s water buses.' },
  { q: 'What is the tallest building in the world (2026)?', options: ['Shanghai Tower', 'Burj Khalifa', 'Merdeka 118', 'Tokyo Skytree'], answer: 1, fact: 'Dubai’s Burj Khalifa stands 828 m tall.' },
  { q: 'Tipping at restaurants in Japan is…', options: ['Expected (15%)', 'Expected (10%)', 'Not customary', 'Only in cash'], answer: 2, fact: 'Great service is included — a sincere thank-you is enough.' },
  { q: 'Which airport code belongs to Tokyo Haneda?', options: ['TYO', 'NRT', 'HND', 'HAN'], answer: 2, fact: 'HAN is Hanoi — a classic mix-up when booking!' },
  { q: 'Which of these is a UNESCO World Heritage site in Vietnam?', options: ['Ha Long Bay', 'Phi Phi Islands', 'Komodo', 'Boracay'], answer: 0, fact: 'Ha Long Bay has ~1,600 limestone islands and islets.' },
];

export interface SurveyQuestion {
  id: string;
  q: string;
  options: { label: string; emoji: string; tags: string[] }[];
}

export const surveyQuestions: SurveyQuestion[] = [
  { id: 'vibe', q: 'Pick your ideal trip vibe', options: [
    { label: 'City lights', emoji: '🌃', tags: ['city', 'nightlife'] },
    { label: 'Beach & sun', emoji: '🏖️', tags: ['beach', 'romantic'] },
    { label: 'Mountains & trails', emoji: '🏔️', tags: ['adventure', 'nature'] },
    { label: 'History & culture', emoji: '🏛️', tags: ['culture'] },
  ] },
  { id: 'food', q: 'How important is food on this trip?', options: [
    { label: 'It’s the whole point', emoji: '🍜', tags: ['food', 'food'] },
    { label: 'Love a good meal', emoji: '🍝', tags: ['food'] },
    { label: 'Fuel for adventures', emoji: '🥪', tags: ['adventure'] },
    { label: 'Not fussed', emoji: '🤷', tags: [] },
  ] },
  { id: 'budget', q: 'Daily budget per person?', options: [
    { label: 'Under $90', emoji: '🪙', tags: ['$1'] },
    { label: '$90 – $160', emoji: '💵', tags: ['$2'] },
    { label: '$160 – $230', emoji: '💳', tags: ['$3'] },
    { label: 'Treat ourselves', emoji: '💎', tags: ['$4'] },
  ] },
  { id: 'pace', q: 'What pace does your group like?', options: [
    { label: 'Packed schedule', emoji: '⚡', tags: ['city', 'adventure'] },
    { label: 'Balanced', emoji: '⚖️', tags: ['culture', 'food'] },
    { label: 'Slow & relaxed', emoji: '🧘', tags: ['beach', 'romantic', 'nature'] },
    { label: 'Spontaneous', emoji: '🎲', tags: ['nightlife'] },
  ] },
  { id: 'who', q: 'Who’s coming?', options: [
    { label: 'Friends', emoji: '👯', tags: ['nightlife', 'adventure'] },
    { label: 'Family with kids', emoji: '👨‍👩‍👧', tags: ['family'] },
    { label: 'Partner', emoji: '💞', tags: ['romantic'] },
    { label: 'Classmates / club', emoji: '🎒', tags: ['culture', 'city'] },
  ] },
];

export const packingBase: { category: string; items: string[] }[] = [
  { category: 'Documents', items: ['Passport', 'Visa / entry form', 'Travel insurance card', 'Printed itinerary', 'Driver’s licence'] },
  { category: 'Tech', items: ['Phone charger', 'Universal adapter', 'Power bank', 'Headphones', 'eSIM / SIM card'] },
  { category: 'Clothing', items: ['Comfortable walking shoes', 'Light jacket', 'Socks & underwear', 'Sleepwear', 'Swimsuit'] },
  { category: 'Toiletries', items: ['Toothbrush & paste', 'Sunscreen', 'Medication', 'Deodorant', 'Hand sanitiser'] },
  { category: 'Extras', items: ['Reusable water bottle', 'Day backpack', 'Snacks for the flight', 'Coin purse (cash-heavy countries)'] },
];

export const ROLE_OPTIONS = [
  'Organizer',
  'Treasurer',
  'Navigator',
  'Food Lead',
  'Photographer',
  'Planner',
  'Activities Lead',
  'Packing Lead',
  'DJ',
  'Member',
] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

export const roleDescriptions: Record<Role, string> = {
  Organizer: 'Owns the trip, invites people and has the final say.',
  Treasurer: 'Tracks the budget and settles up who owes what.',
  Navigator: 'Gets everyone from A to B — maps, trains and transfers.',
  'Food Lead': 'Finds the best places to eat and books tables.',
  Photographer: 'Captures memories and curates the photo dump.',
  Planner: 'Builds the itinerary and keeps the schedule on track.',
  'Activities Lead': 'Researches activities and runs the group votes.',
  'Packing Lead': 'Owns the checklist and shared packing list.',
  DJ: 'In charge of road-trip playlists and karaoke picks.',
  Member: 'Along for the ride — votes, chats and has fun.',
};
