/**
 * Demo content. Dates are generated relative to "today" so the sample trip is
 * always fresh — whether the app is opened today or at the competition months
 * later. Settings → Demo timeline can re-seed it as upcoming, in-progress or
 * completed to show the whole trip lifecycle.
 */
import { packingBase } from '@/data/reference';
import { uid } from '@/utils/format';
import { addDays, todayInTz, zonedToUtc } from '@/utils/time';

import type { Activity, Expense, Flight, Member, PackingItem, Photo, Trip } from './types';

export const DEMO_EMAIL = 'maya.chen@togetherwego.app';
export const DEMO_PASSWORD = 'TravelTogether2026!';
export const DEMO_USER_ID = 'u-maya';

export type DemoTimeline = 'upcoming' | 'active' | 'completed';

const TOKYO_TZ = 'Asia/Tokyo';
const AMALFI_TZ = 'Europe/Rome';

/** The 6 members of the Tokyo & Kyoto trip. */
export const demoMembers: Member[] = [
  { id: DEMO_USER_ID, name: 'Maya Chen', email: DEMO_EMAIL, avatar: 'avatar-maya', role: 'Navigator', homeCity: 'New York' },
  { id: 'm-diego', name: 'Diego Alvarez', avatar: 'avatar-diego', role: 'Food Lead', homeCity: 'New York' },
  { id: 'm-priya', name: 'Priya Patel', avatar: 'avatar-priya', role: 'Treasurer', homeCity: 'San Francisco' },
  { id: 'm-sam', name: 'Sam Okafor', avatar: 'avatar-sam', role: 'Photographer', homeCity: 'New York' },
  { id: 'm-ana', name: 'Ana Silva', avatar: 'avatar-ana', role: 'Planner', homeCity: 'Boston' },
  { id: 'm-noah', name: 'Noah Kim', avatar: 'avatar-noah', role: 'Activities Lead', homeCity: 'Chicago' },
];

const ALL = demoMembers.map((m) => m.id);
const votesFrom = (ids: string[], down: string[] = []): Record<string, 1 | -1> => {
  const v: Record<string, 1 | -1> = {};
  ids.forEach((id) => (v[id] = 1));
  down.forEach((id) => (v[id] = -1));
  return v;
};

function act(start: string, day: number, a: Omit<Activity, 'id' | 'date' | 'createdBy' | 'reminder'> & { reminder?: boolean }): Activity {
  return { id: uid('a-'), date: addDays(start, day), createdBy: DEMO_USER_ID, reminder: a.reminder ?? a.status === 'confirmed', ...a };
}

function demoActivities(start: string): Activity[] {
  return [
    // Day 1
    act(start, 0, { time: '14:30', title: 'Arrive at Haneda Airport (HND)', location: 'Ōta, Tokyo', type: 'transport', durationMin: 150, costPerPerson: 0, status: 'confirmed', assigned: [DEMO_USER_ID, 'm-sam'], votes: votesFrom(ALL), lat: 35.5494, lng: 139.7798, notes: 'Meet at the Keikyu Line ticket gates, Terminal 3 arrivals.' }),
    act(start, 0, { time: '17:30', title: 'Check-in — Shinjuku Grand Hotel', location: 'Shinjuku, Tokyo', type: 'stay', durationMin: 30, costPerPerson: 180, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(ALL), lat: 35.6938, lng: 139.7034 }),
    act(start, 0, { time: '19:30', title: 'Welcome Dinner — Omoide Yokocho', location: 'Shinjuku, Tokyo', type: 'food', durationMin: 120, costPerPerson: 30, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(ALL.slice(0, 5)), lat: 35.6929, lng: 139.6996, placeId: 'omoide' }),
    // Day 2
    act(start, 1, { time: '08:00', title: 'Tsukiji Outer Market Breakfast', location: 'Tsukiji, Tokyo', type: 'food', durationMin: 90, costPerPerson: 25, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(ALL.slice(0, 4)), lat: 35.6655, lng: 139.7707, placeId: 'tsukiji' }),
    act(start, 1, { time: '10:30', title: 'Senso-ji Temple & Asakusa', location: 'Asakusa, Tokyo', type: 'culture', durationMin: 120, costPerPerson: 0, status: 'voting', assigned: ['m-ana', 'm-noah'], votes: votesFrom(['m-ana', 'm-noah', 'm-priya'], ['m-sam']), lat: 35.7148, lng: 139.7967, placeId: 'sensoji' }),
    act(start, 1, { time: '14:00', title: 'teamLab Planets Digital Art Museum', location: 'Toyosu, Tokyo', type: 'culture', durationMin: 150, costPerPerson: 30, status: 'pending', assigned: ['m-ana', 'm-priya', 'm-noah'], votes: votesFrom(ALL.slice(0, 5)), lat: 35.6492, lng: 139.7898, placeId: 'teamlab', notes: 'Wear shorts — you walk through knee-deep water!' }),
    act(start, 1, { time: '20:00', title: 'Shibuya Crossing & Rooftop Bar', location: 'Shibuya, Tokyo', type: 'nightlife', durationMin: 180, costPerPerson: 40, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(ALL), lat: 35.6595, lng: 139.7005, placeId: 'shibuya-crossing' }),
    // Day 3
    act(start, 2, { time: '09:00', title: 'Meiji Jingu & Harajuku stroll', location: 'Harajuku, Tokyo', type: 'culture', durationMin: 150, costPerPerson: 0, status: 'confirmed', assigned: ['m-ana'], votes: votesFrom(ALL), lat: 35.6764, lng: 139.6993, placeId: 'meiji' }),
    act(start, 2, { time: '13:30', title: 'Akihabara arcades & retro games', location: 'Akihabara, Tokyo', type: 'shopping', durationMin: 120, costPerPerson: 15, status: 'confirmed', assigned: ['m-noah'], votes: votesFrom(ALL.slice(1)), lat: 35.6984, lng: 139.7731, placeId: 'akihabara' }),
    act(start, 2, { time: '19:00', title: 'Karaoke night in Shibuya', location: 'Shibuya, Tokyo', type: 'nightlife', durationMin: 120, costPerPerson: 20, status: 'voting', assigned: ['m-noah'], votes: votesFrom(['m-noah', 'm-diego', 'm-sam']), lat: 35.66, lng: 139.6985, placeId: 'karaoke' }),
    // Day 4
    act(start, 3, { time: '07:30', title: 'Day trip: Mt Fuji & Chureito Pagoda', location: 'Fujiyoshida, Yamanashi', type: 'adventure', durationMin: 540, costPerPerson: 45, status: 'confirmed', assigned: [DEMO_USER_ID, 'm-sam'], votes: votesFrom(ALL), lat: 35.5016, lng: 138.8013, notes: 'Bus from Shinjuku Expressway Bus Terminal, gate B.' }),
    // Day 5
    act(start, 4, { time: '08:30', title: 'Shinkansen to Kyoto', location: 'Tokyo Station', type: 'transport', durationMin: 135, costPerPerson: 0, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(ALL), lat: 35.6812, lng: 139.7671, notes: 'Covered by JR Pass. Sit on the right (seat E) for Fuji views.' }),
    act(start, 4, { time: '13:00', title: 'Check-in — Gion ryokan', location: 'Gion, Kyoto', type: 'stay', durationMin: 30, costPerPerson: 140, status: 'confirmed', assigned: ['m-priya'], votes: votesFrom(ALL), lat: 35.0037, lng: 135.7788 }),
    act(start, 4, { time: '17:00', title: 'Gion evening walk', location: 'Gion, Kyoto', type: 'culture', durationMin: 90, costPerPerson: 0, status: 'confirmed', assigned: ['m-ana'], votes: votesFrom(ALL.slice(0, 5)), lat: 35.0037, lng: 135.7788, placeId: 'gion' }),
    // Day 6
    act(start, 5, { time: '06:30', title: 'Fushimi Inari sunrise hike', location: 'Fushimi, Kyoto', type: 'culture', durationMin: 150, costPerPerson: 0, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(ALL.slice(0, 4)), lat: 34.9671, lng: 135.7727, placeId: 'inari' }),
    act(start, 5, { time: '11:00', title: 'Nishiki Market lunch crawl', location: 'Nakagyo, Kyoto', type: 'food', durationMin: 90, costPerPerson: 20, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(ALL), lat: 35.005, lng: 135.7649, placeId: 'nishiki' }),
    act(start, 5, { time: '15:00', title: 'Tea ceremony experience', location: 'Higashiyama, Kyoto', type: 'culture', durationMin: 60, costPerPerson: 40, status: 'voting', assigned: ['m-priya'], votes: votesFrom(['m-priya', 'm-ana'], ['m-noah']), lat: 34.9986, lng: 135.7809, placeId: 'tea' }),
    // Day 7
    act(start, 6, { time: '07:30', title: 'Arashiyama Bamboo Grove', location: 'Arashiyama, Kyoto', type: 'sightseeing', durationMin: 60, costPerPerson: 0, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(ALL), lat: 35.017, lng: 135.6713, placeId: 'bamboo' }),
    act(start, 6, { time: '13:00', title: 'Hozugawa river boat ride', location: 'Kameoka, Kyoto', type: 'adventure', durationMin: 120, costPerPerson: 35, status: 'pending', assigned: ['m-noah'], votes: votesFrom(['m-noah', 'm-diego', 'm-sam', DEMO_USER_ID]), lat: 35.0128, lng: 135.6744, placeId: 'hozugawa' }),
    // Day 8 left empty on purpose (free day)
    // Day 9
    act(start, 8, { time: '10:00', title: 'Shinkansen back to Tokyo', location: 'Kyoto Station', type: 'transport', durationMin: 135, costPerPerson: 0, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(ALL), lat: 34.9858, lng: 135.7588 }),
    act(start, 8, { time: '19:00', title: 'Farewell dinner — Gonpachi', location: 'Nishi-Azabu, Tokyo', type: 'food', durationMin: 120, costPerPerson: 35, status: 'voting', assigned: ['m-diego'], votes: votesFrom(['m-diego', 'm-ana', 'm-priya']), lat: 35.6563, lng: 139.724, placeId: 'gonpachi' }),
    // Day 10
    act(start, 9, { time: '06:30', title: 'Head to Haneda for departures', location: 'Haneda Airport, Tokyo', type: 'transport', durationMin: 60, costPerPerson: 6, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(ALL), lat: 35.5494, lng: 139.7798 }),
  ];
}

interface Airfield {
  tz: string;
  code: string;
}
const HND: Airfield = { tz: TOKYO_TZ, code: 'HND' };
const NAP: Airfield = { tz: AMALFI_TZ, code: 'NAP' };

function flightPair(at: Airfield, memberId: string, airline: string, outNo: string, inNo: string, from: string, start: string, end: string, arr: string, dep: string, hoursOut: number, hoursBack: number, arrDayOffset = 0): Flight[] {
  const arriveUtc = zonedToUtc(addDays(start, arrDayOffset), arr, at.tz);
  const departUtc = zonedToUtc(end, dep, at.tz);
  const confirmation = 'TWG' + memberId.slice(-3).toUpperCase();
  return [
    { id: uid('f-'), memberId, airline, flightNo: outNo, from, to: at.code, departUtc: arriveUtc - hoursOut * 3600000, arriveUtc, direction: 'arrival', seat: '32A', confirmation },
    { id: uid('f-'), memberId, airline, flightNo: inNo, from: at.code, to: from, departUtc, arriveUtc: departUtc + hoursBack * 3600000, direction: 'departure', seat: '41C', confirmation },
  ];
}

function demoExpenses(start: string): Expense[] {
  const before = addDays(start, -20);
  return [
    { id: uid('e-'), title: 'Round-trip flights', amount: 1840, category: 'Flights', paidBy: 'm-priya', splitBetween: ALL, date: before },
    { id: uid('e-'), title: 'Shinjuku apartment', amount: 960, category: 'Stays', paidBy: DEMO_USER_ID, splitBetween: ALL, date: addDays(before, 2) },
    { id: uid('e-'), title: 'JR Rail passes', amount: 420, category: 'Transport', paidBy: 'm-sam', splitBetween: ALL, date: addDays(before, 5) },
    { id: uid('e-'), title: 'Group dinners', amount: 265, category: 'Food', paidBy: 'm-diego', splitBetween: ALL, date: addDays(before, 8), original: { amount: 40386, currency: 'JPY' } },
    { id: uid('e-'), title: 'teamLab tickets', amount: 132, category: 'Activities', paidBy: 'm-ana', splitBetween: ALL, date: addDays(before, 9) },
  ];
}

function demoPacking(): PackingItem[] {
  const done = new Set(['Passport', 'Phone charger', 'Universal adapter', 'Comfortable walking shoes']);
  return packingBase.flatMap((g) => g.items.map((text) => ({ id: uid('p-'), text, category: g.category, packed: done.has(text) })));
}

function demoPhotos(start: string, now: number): Photo[] {
  const list: [string, string, string, number][] = [
    ['shibuya', 'Shibuya after dark 🌃', 'm-sam', 1],
    ['ramen', 'Diego’s 2am ramen find 🍜', 'm-diego', 0],
    ['fushimi-inari', '10,000 gates and counting ⛩️', 'm-sam', 5],
    ['lantern-alley', 'Lantern alley vibes', 'm-ana', 2],
    ['sushi', 'Omakase at the market', 'm-priya', 1],
    ['tokyo-skyline', 'View from the tower', DEMO_USER_ID, 2],
    ['fuji-blossom', 'Fuji finally showed up 🗻', 'm-noah', 3],
    ['omoide-yokocho', 'Yakitori alley', 'm-diego', 0],
    ['akihabara', 'Akiba arcade crew', 'm-noah', 2],
    ['kyoto-skyline', 'Kyoto from Kiyomizu', 'm-ana', 5],
  ];
  return list.map(([uri, caption, by, day], i) => ({
    id: uid('ph-'), uri, caption, by, day: addDays(start, day), ts: now - i * 3600000,
    likes: ALL.filter((_, j) => (i + j) % 3 !== 0),
  }));
}

export function inviteCodeFor(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
  return `${letters}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** The big 10-day Tokyo & Kyoto trip — kept as a second trip so multi-trip management has something to show. */
export function buildTokyoTrip(now = Date.now()): Trip {
  const today = todayInTz(TOKYO_TZ);
  const start = addDays(today, 45);
  const end = addDays(start, 9);
  const flights = [
    ...flightPair(HND, DEMO_USER_ID, 'ANA', 'NH 175', 'NH 176', 'JFK', start, end, '14:20', '09:05', 14, 13),
    ...flightPair(HND, 'm-diego', 'Japan Airlines', 'JL 006', 'JL 005', 'JFK', start, end, '16:40', '11:30', 14, 13),
    ...flightPair(HND, 'm-priya', 'United', 'UA 837', 'UA 838', 'SFO', start, end, '07:15', '09:05', 11, 10, 1),
    ...flightPair(HND, 'm-sam', 'ANA', 'NH 175', 'NH 176', 'JFK', start, addDays(end, -1), '14:20', '18:00', 14, 13),
  ];
  const t = (mins: number) => now - mins * 60000;
  return {
    id: 'trip-tokyo',
    name: 'Tokyo & Kyoto Explorer',
    destinationId: 'tokyo',
    extraDestinationIds: ['kyoto', 'mount-fuji'],
    startDate: start,
    endDate: end,
    cover: 'tokyo',
    budget: 4200,
    inviteCode: 'TKY-2481',
    ownerId: DEMO_USER_ID,
    members: demoMembers.map((m) => ({ ...m })),
    activities: demoActivities(start),
    expenses: demoExpenses(start),
    flights,
    polls: [
      {
        id: uid('poll-'), question: 'Day 4 evening — what are we doing?', createdBy: 'm-noah', createdAt: t(600),
        options: [
          { id: 'o1', text: 'Robot show in Shinjuku', votes: ['m-noah'] },
          { id: 'o2', text: 'Sumida river cruise', votes: ['m-priya'] },
          { id: 'o3', text: 'Karaoke night', votes: ['m-diego', 'm-ana', 'm-sam'] },
        ],
      },
      {
        id: uid('poll-'), question: 'Farewell dinner: where should we go?', createdBy: 'm-diego', createdAt: t(300),
        options: [
          { id: 'o1', text: 'Gonpachi izakaya (Kill Bill vibes)', votes: ['m-diego', 'm-ana'] },
          { id: 'o2', text: 'Sushi omakase splurge', votes: ['m-priya'] },
          { id: 'o3', text: 'Ramen crawl in Ebisu', votes: ['m-noah'] },
        ],
      },
    ],
    tasks: [
      { id: uid('t-'), text: 'Passports valid 6+ months', done: true },
      { id: uid('t-'), text: 'Book airport transfer', done: false, assignee: DEMO_USER_ID },
      { id: uid('t-'), text: 'Travel insurance', done: false, assignee: 'm-priya' },
      { id: uid('t-'), text: 'Download offline maps', done: true, assignee: 'm-sam' },
      { id: uid('t-'), text: 'Pocket wifi pickup code', done: false, assignee: 'm-diego' },
    ],
    docs: [
      {
        id: uid('d-'), name: 'Flight tickets (all members)', kind: 'note', addedBy: 'm-priya', addedAt: t(4000), offline: true,
        note: 'Maya — ANA NH 175 · JFK → HND · Conf. TWGAYA\nSam — ANA NH 175 · JFK → HND · Conf. TWGSAM\nDiego — JAL JL 006 · JFK → HND · Conf. TWGEGO\nPriya — United UA 837 · SFO → HND · Conf. TWGIYA\n\nCheck-in opens 24h before departure. Bring the passport used for booking.',
      },
      {
        id: uid('d-'), name: 'Apartment booking', kind: 'note', addedBy: DEMO_USER_ID, addedAt: t(3800), offline: true,
        note: 'Shinjuku Grand Hotel — 3 rooms, 4 nights\nCheck-in from 15:00 · Check-out 11:00\nBooking ref: SGH-55120\n\nShow the taxi driver:\n新宿駅までお願いします (To Shinjuku Station, please)',
      },
      {
        id: uid('d-'), name: 'Passport scans', kind: 'note', addedBy: DEMO_USER_ID, addedAt: t(3600), offline: true,
        note: 'Encrypted copies stored on each member’s phone.\nIf a passport is lost: report at the nearest koban (police box), then contact your embassy.\nUS Embassy Tokyo: +81 3-3224-5000',
      },
      {
        id: uid('d-'), name: 'Emergency contacts', kind: 'note', addedBy: 'm-ana', addedAt: t(3000), offline: true,
        note: 'Police 110 · Ambulance/Fire 119\nJapan Visitor Hotline (24h, English): 050-3816-2787\nTravel insurance: TravelSafe +1 800 555 0199, policy TS-88213',
      },
    ],
    messages: [
      { id: uid('c-'), authorId: 'm-priya', text: 'JR passes are booked 🎉 picking them up at Haneda', ts: t(320) },
      { id: uid('c-'), authorId: 'm-ana', text: 'Can we lock in teamLab for Day 2 afternoon? Tickets sell out', ts: t(260) },
      { id: uid('c-'), authorId: 'm-noah', text: 'Voted! Also started a poll for Day 4 evening 👀', ts: t(200) },
      { id: uid('c-'), authorId: 'm-diego', text: 'Found a ramen spot 4 min from the apartment, open till 2am 🍜', ts: t(42) },
      { id: uid('c-'), authorId: DEMO_USER_ID, text: 'Adding it to Day 1 after Shibuya!', ts: t(40) },
      { id: uid('c-'), authorId: 'assistant', ai: true, aiSource: 'local', text: 'Heads up: Priya lands at 07:15 on Day 2 — the morning after everyone else. Want me to move Tsukiji breakfast to 09:30 so she can join?', ts: t(38) },
    ],
    photos: demoPhotos(start, now),
    packing: demoPacking(),
    completed: false,
    createdAt: t(60 * 24 * 30),
  };
}


// ---------------------------------------------------------------------------
// Amalfi Squad — the main demo trip (4 friends, 6 days, Positano)
// ---------------------------------------------------------------------------
const squad: Member[] = [
  { id: DEMO_USER_ID, name: 'Maya Chen', email: DEMO_EMAIL, avatar: 'avatar-maya', role: 'Navigator', homeCity: 'New York' },
  { id: 'm-diego', name: 'Diego Alvarez', avatar: 'avatar-diego', role: 'Food Lead', homeCity: 'New York' },
  { id: 'm-priya', name: 'Priya Patel', avatar: 'avatar-priya', role: 'Treasurer', homeCity: 'San Francisco' },
  { id: 'm-sam', name: 'Sam Okafor', avatar: 'avatar-sam', role: 'Photographer', homeCity: 'New York' },
];
const SQUAD = squad.map((m) => m.id);

function amalfiActivities(start: string): Activity[] {
  return [
    act(start, 0, { time: '15:40', title: 'Arrive at Naples Airport (NAP)', location: 'Naples Airport', type: 'transport', durationMin: 90, costPerPerson: 0, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(SQUAD), lat: 40.886, lng: 14.2908, notes: 'Private transfer to Positano, about 1h 30m. Driver holds a TogetherWeGo sign.' }),
    act(start, 0, { time: '17:45', title: 'Check-in — Villa Margherita', location: 'Positano', type: 'stay', durationMin: 30, costPerPerson: 410, status: 'confirmed', assigned: ['m-priya'], votes: votesFrom(SQUAD), lat: 40.6283, lng: 14.4853, notes: 'Keys in the lockbox, code in the Docs folder.' }),
    act(start, 0, { time: '19:00', title: 'Dinner at Da Vincenzo', location: 'Viale Pasitea', type: 'food', durationMin: 120, costPerPerson: 64, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(SQUAD), lat: 40.6295, lng: 14.488, placeId: 'da-vincenzo' }),
    act(start, 1, { time: '08:00', title: 'Path of the Gods hike', location: 'Bomerano', type: 'adventure', durationMin: 300, costPerPerson: 0, status: 'confirmed', assigned: [DEMO_USER_ID, 'm-sam'], votes: votesFrom([DEMO_USER_ID, 'm-diego', 'm-sam']), lat: 40.619, lng: 14.5176, placeId: 'path-of-gods', notes: 'Bring water, sun hat and sturdy shoes. Bus from Amalfi to Bomerano at 07:15.' }),
    act(start, 1, { time: '20:00', title: 'Sunset aperitivo at Le Sirenuse', location: 'Positano', type: 'nightlife', durationMin: 90, costPerPerson: 40, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(SQUAD.slice(0, 3)), lat: 40.6293, lng: 14.4868, placeId: 'sunset-bar' }),
    act(start, 2, { time: '10:00', title: 'Boat tour to Capri', location: 'Positano Marina', type: 'adventure', durationMin: 540, costPerPerson: 140, status: 'confirmed', assigned: [DEMO_USER_ID, 'm-priya'], votes: votesFrom([DEMO_USER_ID, 'm-priya']), lat: 40.6272, lng: 14.4868, placeId: 'capri-boat' }),
    act(start, 3, { time: '11:00', title: 'Beach day at Fornillo Beach', location: 'Fornillo Beach', type: 'sightseeing', durationMin: 180, costPerPerson: 35, status: 'voting', assigned: [], votes: {}, reminder: false, lat: 40.6255, lng: 14.4795, placeId: 'fornillo' }),
    act(start, 3, { time: '16:00', title: 'Limoncello tasting', location: 'Amalfi', type: 'food', durationMin: 45, costPerPerson: 23, status: 'voting', assigned: ['m-priya'], votes: votesFrom(['m-priya']), reminder: false, lat: 40.634, lng: 14.6027, placeId: 'limoncello' }),
    act(start, 4, { time: '10:00', title: 'Villa Rufolo gardens in Ravello', location: 'Ravello', type: 'sightseeing', durationMin: 150, costPerPerson: 8, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(SQUAD), lat: 40.649, lng: 14.6118, placeId: 'villa-rufolo' }),
    act(start, 4, { time: '19:30', title: 'Farewell dinner — Trattoria da Adolfo', location: 'Laurito Beach', type: 'food', durationMin: 150, costPerPerson: 55, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(SQUAD.slice(0, 3)), lat: 40.6224, lng: 14.4731, placeId: 'trattoria-chitarrella' }),
    act(start, 5, { time: '14:30', title: 'Transfer to Naples Airport', location: 'Positano', type: 'transport', durationMin: 100, costPerPerson: 35, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(SQUAD), lat: 40.628, lng: 14.485 }),
  ];
}

export function buildDemoTrip(timeline: DemoTimeline = 'upcoming', now = Date.now()): Trip {
  const today = todayInTz(AMALFI_TZ);
  const offset = timeline === 'upcoming' ? 3 : timeline === 'active' ? -1 : -14;
  const start = addDays(today, offset);
  const end = addDays(start, 5);
  const t = (mins: number) => now - mins * 60000;
  const before = addDays(start, -20);
  return {
    id: 'trip-amalfi',
    name: 'Amalfi Squad',
    destinationId: 'positano',
    extraDestinationIds: [],
    startDate: start,
    endDate: end,
    cover: 'amalfi',
    budget: 4000,
    inviteCode: 'AML-2026',
    ownerId: DEMO_USER_ID,
    members: squad.map((m) => ({ ...m })),
    activities: amalfiActivities(start),
    expenses: [
      { id: uid('e-'), title: 'Villa Margherita (6 nights)', amount: 1650, category: 'Stays', paidBy: 'm-priya', splitBetween: SQUAD, date: before },
      { id: uid('e-'), title: 'Airport transfers', amount: 140, category: 'Transport', paidBy: DEMO_USER_ID, splitBetween: SQUAD, date: addDays(before, 4) },
      { id: uid('e-'), title: 'Scooters & ferry tickets', amount: 210, category: 'Transport', paidBy: 'm-sam', splitBetween: SQUAD, date: addDays(before, 6) },
      { id: uid('e-'), title: 'Dinner deposits & groceries', amount: 86, category: 'Food', paidBy: 'm-diego', splitBetween: SQUAD, date: addDays(before, 8), original: { amount: 74, currency: 'EUR' } },
    ],
    flights: [
      ...flightPair(NAP, DEMO_USER_ID, 'Delta', 'DL 184', 'DL 185', 'JFK', start, end, '15:40', '19:15', 9.5, 10),
      ...flightPair(NAP, 'm-priya', 'ITA Airways', 'AZ 609', 'AZ 610', 'JFK', start, end, '17:05', '21:30', 9.5, 10),
    ],
    polls: [
      {
        id: uid('poll-'), question: 'Beach day — which beach?', createdBy: 'm-sam', createdAt: t(600),
        options: [
          { id: 'o1', text: 'Fornillo (quiet, pebbles)', votes: ['m-sam', 'm-diego'] },
          { id: 'o2', text: 'Spiaggia Grande (lively)', votes: ['m-priya'] },
          { id: 'o3', text: 'Fiordo di Furore (jump in!)', votes: [DEMO_USER_ID] },
        ],
      },
    ],
    tasks: [
      { id: uid('t-'), text: 'Passports valid 6+ months', done: true },
      { id: uid('t-'), text: 'Book airport transfers', done: true, assignee: DEMO_USER_ID },
      { id: uid('t-'), text: 'Travel insurance', done: false, assignee: 'm-priya' },
      { id: uid('t-'), text: 'Rent scooters (licences!)', done: false, assignee: 'm-sam' },
      { id: uid('t-'), text: 'Reserve Da Vincenzo for 4', done: true, assignee: 'm-diego' },
      { id: uid('t-'), text: 'Download offline maps', done: false, assignee: DEMO_USER_ID },
    ],
    docs: [
      {
        id: uid('d-'), name: 'Flight tickets', kind: 'note', addedBy: 'm-priya', addedAt: t(4000), offline: true,
        note: 'Maya — Delta DL 184 · JFK → NAP · Conf. TWGAYA\nPriya — ITA Airways AZ 609 · JFK → NAP · Conf. TWGIYA\n\nCheck-in opens 24h before departure. Bring the passport used for booking.',
      },
      {
        id: uid('d-'), name: 'Villa Margherita booking', kind: 'note', addedBy: 'm-priya', addedAt: t(3800), offline: true,
        note: 'Villa Margherita, Via Chiesa Nuova, Positano\nCheck-in from 15:00 · Check-out 10:00\nBooking ref: VMG-48213\nDoor code arrives by message on the day.\n\nTaxi phrase:\nVilla Margherita, per favore (Villa Margherita, please)',
      },
      {
        id: uid('d-'), name: 'Passport scans', kind: 'note', addedBy: DEMO_USER_ID, addedAt: t(3600), offline: true,
        note: 'Copies are stored on each member’s phone.\nIf a passport is lost: report it to the Carabinieri, then contact your embassy.\nUS Consulate Naples: +39 081 583 8111',
      },
      {
        id: uid('d-'), name: 'Emergency contacts', kind: 'note', addedBy: 'm-diego', addedAt: t(3000), offline: true,
        note: 'EU emergency 112 · Ambulance 118 · Fire 115\nTravel insurance: TravelSafe +1 800 555 0199, policy TS-88213\nNearest hospital: Ospedale Costa d’Amalfi, Castiglione di Ravello',
      },
    ],
    messages: [
      { id: uid('c-'), authorId: 'm-priya', text: 'Villa is booked! 🏡 Paid the deposit.', ts: t(320) },
      { id: uid('c-'), authorId: 'm-sam', text: 'I’ll handle maps & the scooter rental.', ts: t(260) },
      { id: uid('c-'), authorId: 'm-diego', text: 'Dinner tonight at 7, I reserved for 4 🍝', ts: t(200) },
    ],
    photos: [
      { id: uid('ph-'), uri: 'amalfi', caption: 'First look at the coast 😍', by: 'm-sam', day: start, ts: t(120), likes: [DEMO_USER_ID, 'm-priya'] },
      { id: uid('ph-'), uri: 'cinque-terre', caption: 'Cinque Terre next time?', by: 'm-priya', day: start, ts: t(90), likes: ['m-diego'] },
    ],
    packing: demoPacking(),
    completed: timeline === 'completed',
    createdAt: t(60 * 24 * 30),
  };
}

export function buildSecondaryTrips(now = Date.now()): Trip[] {
  const today = todayInTz('UTC');
  const baliStart = addDays(today, 120);
  const bcnStart = addDays(today, -160);
  const four = demoMembers.slice(0, 4).map((m) => ({ ...m }));
  return [
    buildTokyoTrip(now),
    {
      id: 'trip-bali', name: 'Bali Surf & Chill', destinationId: 'bali', extraDestinationIds: [], startDate: baliStart, endDate: addDays(baliStart, 6),
      cover: 'bali', budget: 3000, inviteCode: 'BAL-7316', ownerId: 'm-priya', members: four,
      activities: [
        { id: uid('a-'), date: addDays(baliStart, 1), time: '04:00', title: 'Mount Batur sunrise trek', location: 'Kintamani, Bali', type: 'adventure', durationMin: 360, costPerPerson: 45, status: 'voting', assigned: ['m-priya'], votes: votesFrom(['m-priya', DEMO_USER_ID]), reminder: false, createdBy: 'm-priya' },
        { id: uid('a-'), date: addDays(baliStart, 2), time: '09:00', title: 'Surf lesson at Kuta', location: 'Kuta, Bali', type: 'adventure', durationMin: 150, costPerPerson: 30, status: 'pending', assigned: ['m-sam'], votes: votesFrom(['m-sam']), reminder: false, createdBy: 'm-sam' },
      ],
      expenses: [{ id: uid('e-'), title: 'Villa deposit', amount: 600, category: 'Stays', paidBy: 'm-priya', splitBetween: four.map((m) => m.id), date: today }],
      flights: [], polls: [], tasks: [{ id: uid('t-'), text: 'Decide villa vs. hostel', done: false, assignee: 'm-priya' }], docs: [],
      messages: [{ id: uid('c-'), authorId: 'm-priya', text: 'Started planning Bali for next year 🌴 who’s in?', ts: now - 86400000 }],
      photos: [], packing: [], createdAt: now - 86400000 * 2,
    },
    {
      id: 'trip-bcn', name: 'Barcelona Spring Break', destinationId: 'barcelona', extraDestinationIds: [], startDate: bcnStart, endDate: addDays(bcnStart, 5),
      cover: 'barcelona', budget: 2400, inviteCode: 'BCN-4402', ownerId: DEMO_USER_ID, members: four, completed: true,
      activities: [
        { id: uid('a-'), date: addDays(bcnStart, 1), time: '10:00', title: 'Sagrada Família tour', location: 'Eixample', type: 'culture', durationMin: 120, costPerPerson: 34, status: 'confirmed', assigned: [DEMO_USER_ID], votes: votesFrom(four.map((m) => m.id)), reminder: false, createdBy: DEMO_USER_ID, done: true },
        { id: uid('a-'), date: addDays(bcnStart, 2), time: '13:00', title: 'Tapas crawl in El Born', location: 'El Born', type: 'food', durationMin: 180, costPerPerson: 40, status: 'confirmed', assigned: ['m-diego'], votes: votesFrom(four.map((m) => m.id)), reminder: false, createdBy: 'm-diego', done: true },
        { id: uid('a-'), date: addDays(bcnStart, 3), time: '11:00', title: 'Barceloneta beach day', location: 'Barceloneta', type: 'sightseeing', durationMin: 300, costPerPerson: 0, status: 'confirmed', assigned: ['m-sam'], votes: votesFrom(four.map((m) => m.id)), reminder: false, createdBy: 'm-sam', done: true },
      ],
      expenses: [
        { id: uid('e-'), title: 'Flights', amount: 1320, category: 'Flights', paidBy: DEMO_USER_ID, splitBetween: four.map((m) => m.id), date: bcnStart },
        { id: uid('e-'), title: 'Airbnb Gothic Quarter', amount: 640, category: 'Stays', paidBy: 'm-priya', splitBetween: four.map((m) => m.id), date: bcnStart },
        { id: uid('e-'), title: 'Tapas & dinners', amount: 310, category: 'Food', paidBy: 'm-diego', splitBetween: four.map((m) => m.id), date: addDays(bcnStart, 2) },
      ],
      flights: [], polls: [], tasks: [], docs: [], messages: [], packing: [],
      photos: [
        { id: uid('ph-'), uri: 'barcelona', caption: 'Rooftop views', by: 'm-sam', likes: [DEMO_USER_ID], ts: now - 86400000 * 150, day: addDays(bcnStart, 1) },
      ],
      createdAt: now - 86400000 * 200,
    },
  ];
}

/** Trips that exist "on the server" and can be joined with an invite code. */
export function directoryTrips(now = Date.now()): Trip[] {
  const start = addDays(todayInTz('UTC'), 45);
  const jordan: Member = { id: 'm-jordan', name: 'Jordan Lee', role: 'Organizer', homeCity: 'Philadelphia' };
  const kai: Member = { id: 'm-kai', name: 'Kai Thompson', role: 'Food Lead', homeCity: 'Philadelphia' };
  return [
    {
      id: 'trip-seoul', name: 'Seoul Food Crawl', destinationId: 'seoul', extraDestinationIds: [], startDate: start, endDate: addDays(start, 5),
      cover: 'seoul', budget: 2600, inviteCode: 'SEO-5521', ownerId: jordan.id, members: [jordan, kai],
      activities: [
        { id: uid('a-'), date: addDays(start, 1), time: '18:00', title: 'Gwangjang Market night food tour', location: 'Jongno, Seoul', type: 'food', durationMin: 150, costPerPerson: 35, status: 'confirmed', assigned: [kai.id], votes: votesFrom([jordan.id, kai.id]), reminder: true, createdBy: kai.id },
      ],
      expenses: [], flights: [], polls: [], tasks: [], docs: [], photos: [], packing: [],
      messages: [{ id: uid('c-'), authorId: jordan.id, text: 'Welcome to the Seoul crew! Drop your flight times when you book ✈️', ts: now - 3600000 }],
      createdAt: now - 86400000,
    },
  ];
}

export { AMALFI_TZ as DEMO_TZ };
