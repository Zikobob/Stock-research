import type { Role } from '@/data/reference';
import type { LangCode } from '@/i18n/strings';

export type ActivityType = 'transport' | 'stay' | 'food' | 'sightseeing' | 'adventure' | 'culture' | 'nightlife' | 'shopping';
export type ActivityStatus = 'confirmed' | 'voting' | 'pending';

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: Role;
  homeCity?: string;
  /** Members added by name only (no account yet). */
  invited?: boolean;
}

export interface Activity {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  type: ActivityType;
  durationMin: number;
  costPerPerson: number;
  status: ActivityStatus;
  assigned: string[];
  /** memberId → +1 (up) / -1 (down) */
  votes: Record<string, 1 | -1>;
  notes?: string;
  reminder: boolean;
  lat?: number;
  lng?: number;
  placeId?: string;
  createdBy: string;
  done?: boolean;
}

export type ExpenseCategory = 'Flights' | 'Stays' | 'Food' | 'Activities' | 'Transport' | 'Shopping' | 'Other';

export interface Expense {
  id: string;
  title: string;
  /** Always stored in the trip's base currency (USD by default). */
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitBetween: string[];
  date: string;
  /** Original amount when entered in a foreign currency. */
  original?: { amount: number; currency: string };
  settlement?: boolean;
}

export interface Flight {
  id: string;
  memberId: string;
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  departUtc: number;
  arriveUtc: number;
  direction: 'arrival' | 'departure';
  seat?: string;
  confirmation?: string;
  ticketUri?: string;
  ticketName?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  closed?: boolean;
  createdAt: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  assignee?: string;
}

export interface TripDoc {
  id: string;
  name: string;
  kind: 'pdf' | 'image' | 'note' | 'file';
  uri?: string;
  note?: string;
  size?: number;
  addedBy: string;
  addedAt: number;
  offline: boolean;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  ts: number;
  kind?: 'text' | 'system';
  /** True when the message came from the AI trip assistant. */
  ai?: boolean;
  aiSource?: 'local' | 'claude';
}

export interface Photo {
  id: string;
  uri: string;
  caption: string;
  by: string;
  likes: string[];
  ts: number;
  day?: string;
}

export interface PackingItem {
  id: string;
  text: string;
  category: string;
  packed: boolean;
}

export type TripStatus = 'planning' | 'active' | 'completed';

export interface Trip {
  id: string;
  name: string;
  destinationId: string;
  extraDestinationIds: string[];
  startDate: string;
  endDate: string;
  cover: string;
  /** Group budget cap in USD. */
  budget: number;
  inviteCode: string;
  ownerId: string;
  members: Member[];
  activities: Activity[];
  expenses: Expense[];
  flights: Flight[];
  polls: Poll[];
  tasks: Task[];
  docs: TripDoc[];
  messages: ChatMessage[];
  photos: Photo[];
  packing: PackingItem[];
  /** Manual override: user marked the trip as finished. */
  completed?: boolean;
  createdAt: number;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar?: string;
  homeCity?: string;
  provider: 'password' | 'google';
}

export interface BucketItem {
  id: string;
  text: string;
  destinationId?: string;
  done: boolean;
  addedAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  kind: 'reminder' | 'chat' | 'vote' | 'expense' | 'system' | 'member';
  tripId?: string;
  route?: string;
}

export type TextScale = 1 | 1.12 | 1.25;

export interface Settings {
  language: LangCode;
  homeCurrency: string;
  notificationsEnabled: boolean;
  reminderLeadMin: number;
  textScale: TextScale;
  showTripTime: boolean;
  aiMode: 'offline' | 'claude';
  haptics: boolean;
}

/** Home-screen blocks the user can show or hide in "Make it yours". */
export type HomeSection = 'reminder' | 'forYou' | 'popular' | 'featured' | 'glance' | 'nearby' | 'tools';

/** Answers from the "Make it yours" personalization survey. */
export interface Personal {
  done: boolean;
  nickname: string;
  emoji: string;
  interests: string[];
  travelStyle: 'chill' | 'balanced' | 'packed';
  budgetStyle: 'saver' | 'mid' | 'treat';
  sections: Record<HomeSection, boolean>;
  motion: boolean;
}

export interface WeatherSnapshot {
  destinationId: string;
  fetchedAt: number;
  current: { temp: number; code: number; wind: number; humidity: number };
  daily: { date: string; max: number; min: number; code: number; rain: number }[];
  live: boolean;
}

export interface RatesSnapshot {
  base: 'USD';
  rates: Record<string, number>;
  fetchedAt: number;
  live: boolean;
}
