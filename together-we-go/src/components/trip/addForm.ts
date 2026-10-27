/**
 * What the Add activity form holds, and how it starts, with no React in it so it can be tested: a blank form, a form filled from an
 * activity being edited or from a place found elsewhere (Nearby), and how a change is merged into the saved draft.
 */
import type { PlaceHit } from '@/services/placeSearch';
import type { Activity, ActivityType } from '@/store/types';

/** A place found elsewhere (Nearby, Explore) handed to Add activity to start from. */
export interface ActivityDraft {
  title?: string;
  location?: string;
  type?: ActivityType;
  durationMin?: number;
  costPerPerson?: number;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
}

/** Everything the form holds. A new activity keeps it as a draft (see useDraft), so closing the sheet or leaving the tab loses nothing. */
export interface Form {
  /** The trip the draft belongs to: a draft for another trip is ignored. */
  tripId: string;
  title: string;
  picked: PlaceHit | null;
  location: string;
  type: ActivityType;
  /** Until the person picks a type themselves, it follows the place they chose or the words they typed. */
  typeTouched: boolean;
  /** null: follow the day the Plan is showing. */
  day: string | null;
  time: string;
  duration: number;
  cost: string;
  notes: string;
  /** null: follow `voting` (the Vote tab starts a vote by default). */
  vote: boolean | null;
  remind: boolean;
}

export const blank = (tripId: string): Form => ({ tripId, title: '', picked: null, location: '', type: 'sightseeing', typeTouched: false, day: null, time: '10:00', duration: 90, cost: '', notes: '', vote: null, remind: true });

/** The form for an activity being edited, or filled from a place found elsewhere. */
export function formFrom(tripId: string, date: string, editing: Activity | null | undefined, draft: ActivityDraft | null | undefined): Form {
  const src = editing ?? draft ?? {};
  const hasPlace = src.lat !== undefined && src.lng !== undefined;
  return {
    tripId,
    title: src.title ?? '',
    picked: hasPlace ? { id: src.placeId ?? 'saved', name: src.title ?? '', detail: src.location ?? '', lat: src.lat!, lng: src.lng!, type: src.type ?? 'sightseeing', source: 'saved', placeId: src.placeId } : null,
    location: src.location ?? '',
    type: src.type ?? 'sightseeing',
    typeTouched: !!src.type,
    day: editing?.date ?? date,
    time: editing?.time ?? '10:00',
    duration: src.durationMin ?? 90,
    cost: src.costPerPerson ? String(src.costPerPerson) : '',
    notes: src.notes ?? '',
    vote: editing ? editing.status === 'voting' : null,
    remind: editing ? editing.reminder : true,
  };
}

/** True when the folded "More options" part holds something, so it opens by itself and nothing is hidden. */
export const hasExtras = (f: Form) => !!(f.location || f.cost || f.notes || f.typeTouched);

/** A change merged into the saved draft. A draft that belongs to another trip is dropped, not mixed in. */
export const mergeDraft = (saved: Form | null, tripId: string, patch: Partial<Form>): Form => ({ ...(saved && saved.tripId === tripId ? saved : blank(tripId)), ...patch });
