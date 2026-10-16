/**
 * What part of a trip is shared between phones, and how each part merges.
 *
 * A trip is treated as a tree of small "registers". Each register remembers the stamp of the change that last
 * wrote it, and the newest stamp always wins ("last writer wins"), so two phones that exchange their changes
 * end up identical no matter what order the changes arrive in.
 *
 *  - scalars : one value (title, date, amount...)
 *  - json    : one whole object that is replaced together (an expense's original currency amount)
 *  - sets    : lists of text values where only "is it in the list" matters (who is assigned, who votes)
 *  - maps    : name -> value (each member's vote on an activity)
 *  - lists   : lists of items with an id (activities, expenses, chat messages...), each an item with its own fields
 *
 * Left out on purpose: member emails (privacy), the private Scout AI chat, and anything that points to a file on
 * one phone (photo, document, receipt and ticket files) because the other phones cannot open those paths.
 */
export interface ItemSchema {
  /** Fields that hold one plain value. */
  scalars: readonly string[];
  /** Scalars that must be present for the item to count as complete. */
  required?: readonly string[];
  json?: readonly string[];
  sets?: readonly string[];
  maps?: readonly string[];
  lists?: Readonly<Record<string, ListSchema>>;
}

export interface ListSchema {
  item: ItemSchema;
  /** How the app keeps this list: 'asc' = newest last (push), 'desc' = newest first (unshift). */
  order: 'asc' | 'desc';
  /** Items this returns false for stay on this phone only. */
  share?: (item: any) => boolean;
}

/** Messages in the private Scout AI thread are never shared. */
export const isPrivateMessage = (m: { channel?: string }) => m.channel === 'ai';

const member: ItemSchema = { scalars: ['name', 'avatar', 'role', 'homeCity', 'invited'], required: ['name', 'role'] };

const activity: ItemSchema = {
  scalars: ['date', 'time', 'title', 'location', 'type', 'durationMin', 'costPerPerson', 'status', 'notes', 'reminder', 'lat', 'lng', 'placeId', 'createdBy', 'done'],
  required: ['date', 'time', 'title', 'type', 'status'],
  sets: ['assigned'],
  maps: ['votes'],
};

const expense: ItemSchema = {
  scalars: ['title', 'amount', 'category', 'paidBy', 'date', 'settlement'],
  required: ['title', 'amount', 'paidBy'],
  json: ['original'],
  sets: ['splitBetween'],
};

const flight: ItemSchema = {
  scalars: ['memberId', 'airline', 'flightNo', 'from', 'to', 'departUtc', 'arriveUtc', 'direction', 'seat', 'confirmation'],
  required: ['memberId', 'flightNo', 'from', 'to', 'departUtc', 'arriveUtc', 'direction'],
};

const poll: ItemSchema = {
  scalars: ['question', 'createdBy', 'closed', 'createdAt'],
  required: ['question'],
  lists: { options: { item: { scalars: ['text'], required: ['text'], sets: ['votes'] }, order: 'asc' } },
};

const task: ItemSchema = { scalars: ['text', 'done', 'assignee'], required: ['text'] };
const doc: ItemSchema = { scalars: ['name', 'kind', 'note', 'size', 'addedBy', 'addedAt', 'offline'], required: ['name', 'kind'] };
const message: ItemSchema = { scalars: ['authorId', 'text', 'ts', 'kind', 'ai', 'aiSource', 'channel'], required: ['authorId', 'text', 'ts'] };
const photo: ItemSchema = { scalars: ['caption', 'by', 'ts', 'day'], required: ['by', 'ts'], sets: ['likes'] };
const packing: ItemSchema = { scalars: ['text', 'category', 'packed', 'broughtBy'], required: ['text'] };

export const TRIP_SCHEMA: ItemSchema = {
  scalars: ['id', 'name', 'destinationId', 'startDate', 'endDate', 'cover', 'budget', 'inviteCode', 'ownerId', 'completed', 'createdAt'],
  required: ['id', 'name', 'destinationId', 'startDate', 'endDate', 'budget', 'inviteCode', 'ownerId'],
  sets: ['extraDestinationIds'],
  lists: {
    members: { item: member, order: 'asc' },
    activities: { item: activity, order: 'asc' },
    expenses: { item: expense, order: 'desc' },
    flights: { item: flight, order: 'asc' },
    polls: { item: poll, order: 'desc' },
    tasks: { item: task, order: 'asc' },
    docs: { item: doc, order: 'desc' },
    messages: { item: message, order: 'asc', share: (m) => !isPrivateMessage(m) },
    photos: { item: photo, order: 'desc' },
    packing: { item: packing, order: 'asc' },
  },
};

/** The register that records when an item was created (its stamp is also the item's place in the list). */
export const CREATED = '_c';
export const PATH_SEP = '\u0001';
export const pathKey = (p: readonly string[]) => p.join(PATH_SEP);

