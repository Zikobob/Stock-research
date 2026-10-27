import type { Activity } from '@/store/types';

import { blank, formFrom, hasExtras, mergeDraft } from '../addForm';

const existing: Activity = {
  id: 'a1',
  date: '2026-10-24',
  time: '19:30',
  title: 'Dinner at Da Vincenzo',
  location: 'Viale Pasitea',
  type: 'food',
  durationMin: 120,
  costPerPerson: 55,
  status: 'voting',
  assigned: [],
  votes: {},
  notes: 'Window table',
  reminder: false,
  lat: 40.63,
  lng: 14.48,
  placeId: 'da-vincenzo',
  createdBy: 'm1',
};

describe('blank form', () => {
  it('starts at ten in the morning for an hour and a half, with the day and vote following the screen', () => {
    expect(blank('t1')).toMatchObject({ tripId: 't1', title: '', time: '10:00', duration: 90, day: null, vote: null, remind: true, picked: null });
  });
});

describe('formFrom', () => {
  it('fills the form from an activity being edited, with its own day and a vote switch matching its status', () => {
    const f = formFrom('t1', '2026-10-23', existing, null);
    expect(f).toMatchObject({ title: 'Dinner at Da Vincenzo', day: '2026-10-24', time: '19:30', duration: 120, cost: '55', notes: 'Window table', vote: true, remind: false, type: 'food', typeTouched: true });
    expect(f.picked).toMatchObject({ lat: 40.63, lng: 14.48, placeId: 'da-vincenzo' });
  });
  it('fills the form from a place found elsewhere and starts on the given day', () => {
    const f = formFrom('t1', '2026-10-23', null, { title: 'Museo', location: 'Sorrento', lat: 40.6, lng: 14.3, type: 'culture', durationMin: 90 });
    expect(f).toMatchObject({ title: 'Museo', location: 'Sorrento', day: '2026-10-23', duration: 90, type: 'culture', typeTouched: true, vote: null });
    expect(f.picked?.name).toBe('Museo');
  });
  it('has no picked place without coordinates, and lets the type follow the words', () => {
    const f = formFrom('t1', '2026-10-23', null, { title: 'Gelato' });
    expect(f.picked).toBeNull();
    expect(f.typeTouched).toBe(false);
  });
  it('leaves cost empty for a free activity', () => {
    expect(formFrom('t1', '2026-10-23', { ...existing, costPerPerson: 0 }, null).cost).toBe('');
  });
});

describe('hasExtras', () => {
  it('is true when any folded field holds something', () => {
    expect(hasExtras(blank('t1'))).toBe(false);
    expect(hasExtras({ ...blank('t1'), notes: 'x' })).toBe(true);
    expect(hasExtras({ ...blank('t1'), cost: '5' })).toBe(true);
    expect(hasExtras({ ...blank('t1'), location: 'Via Roma' })).toBe(true);
    expect(hasExtras({ ...blank('t1'), typeTouched: true })).toBe(true);
  });
});

describe('mergeDraft', () => {
  it('adds a change to the saved draft', () => {
    const first = mergeDraft(null, 't1', { title: 'Gel' });
    const second = mergeDraft(first, 't1', { time: '15:00' });
    expect(second).toMatchObject({ tripId: 't1', title: 'Gel', time: '15:00' });
  });
  it('drops a draft that belongs to another trip', () => {
    const other = mergeDraft(null, 'other', { title: 'Old idea', notes: 'x' });
    const next = mergeDraft(other, 't1', { time: '15:00' });
    expect(next).toMatchObject({ tripId: 't1', title: '', notes: '', time: '15:00' });
  });
});
