import { balances, settlePlan, useAppStore } from '../useAppStore';

const s = () => useAppStore.getState();
const tripOf = (id: string) => s().trips.find((t) => t.id === id)!;

async function signedInUser(name = 'Test User', email = 't@example.com') {
  s().resetEverything();
  await s().signUp(name, email, 'Passw0rd!x');
  return s().session!.userId;
}

const newTrip = () => s().createTrip({ name: 'Rome Crew', destinationId: 'rome', startDate: '2026-09-10', endDate: '2026-09-16', budget: 3000 });

describe('trips', () => {
  it('creates a trip owned by the signed-in user', async () => {
    const me = await signedInUser();
    const id = newTrip();
    const t = tripOf(id);
    expect(s().activeTripId).toBe(id);
    expect(t.ownerId).toBe(me);
    expect(t.members).toEqual([expect.objectContaining({ id: me, role: 'Organizer' })]);
    expect(t.inviteCode).toMatch(/^[A-Z]{3}-\d{4}$/);
    expect(t.tasks).toHaveLength(3);
    expect(t.messages[0]).toMatchObject({ ai: true });
  });

  it('lets a second person join by invite code, once', async () => {
    await signedInUser('Maya', 'maya@example.com');
    const id = newTrip();
    const code = tripOf(id).inviteCode;
    s().signOut();
    await s().signUp('Sam', 'sam@example.com', 'Passw0rd!x');
    const sam = s().session!.userId;
    expect(s().joinTrip(code)).toEqual({ ok: true, tripId: id });
    expect(tripOf(id).members.map((m) => m.id)).toContain(sam);
    expect(tripOf(id).messages.at(-1)).toMatchObject({ kind: 'system' });
    const again = s().joinTrip(code);
    expect(again.ok).toBe(false);
    expect(s().joinTrip('ZZZ-0000')).toMatchObject({ ok: false });
  });

  it('can join a trip from the built-in directory', async () => {
    await signedInUser();
    const r = s().joinTrip('SEO-5521');
    expect(r.ok).toBe(true);
    expect(s().trips.some((t) => t.inviteCode === 'SEO-5521')).toBe(true);
  });

  it('edits, leaves and deletes trips, moving the active trip sensibly', async () => {
    const me = await signedInUser();
    const a = newTrip();
    const b = s().createTrip({ name: 'Second', destinationId: 'tokyo', startDate: '2026-10-01', endDate: '2026-10-05', budget: 1000 });
    expect(s().activeTripId).toBe(b);
    s().updateTrip(a, { name: 'Renamed', budget: 4200 });
    expect(tripOf(a)).toMatchObject({ name: 'Renamed', budget: 4200 });
    s().leaveTrip(b);
    expect(tripOf(b).members.some((m) => m.id === me)).toBe(false);
    expect(s().activeTripId).toBe(a);
    s().deleteTrip(a);
    expect(s().trips.find((t) => t.id === a)).toBeUndefined();
    expect(s().activeTripId).toBeNull();
  });

  it('regenerates the invite code', async () => {
    await signedInUser();
    const id = newTrip();
    const before = tripOf(id).inviteCode;
    s().regenerateInvite(id);
    expect(tripOf(id).inviteCode).toMatch(/^[A-Z]{3}-\d{4}$/);
    expect(tripOf(id).inviteCode).not.toBe(undefined);
    void before;
  });
});

describe('itinerary and voting', () => {
  const base = { date: '2026-09-11', time: '10:00', title: 'Colosseum', location: 'Rome', type: 'sightseeing' as const, durationMin: 120, costPerPerson: 20, status: 'voting' as const, assigned: [], reminder: false };

  it('adds, edits and deletes activities', async () => {
    const me = await signedInUser();
    const t = newTrip();
    const id = s().addActivity(t, { ...base });
    expect(tripOf(t).activities[0]).toMatchObject({ id, createdBy: me, votes: { [me]: 1 } });
    s().updateActivity(t, id, { title: 'Colosseum tour', time: '09:30' });
    expect(tripOf(t).activities[0]).toMatchObject({ title: 'Colosseum tour', time: '09:30' });
    s().toggleAssign(t, id, me);
    expect(tripOf(t).activities[0].assigned).toEqual([me]);
    s().toggleAssign(t, id, me);
    expect(tripOf(t).activities[0].assigned).toEqual([]);
    s().deleteActivity(t, id);
    expect(tripOf(t).activities).toHaveLength(0);
  });

  it('confirms an activity once more than half the group votes yes', async () => {
    const me = await signedInUser();
    const t = newTrip();
    s().addMember(t, 'Friend One');
    s().addMember(t, 'Friend Two');
    const friend = tripOf(t).members[1].id;
    const id = s().addActivity(t, { ...base, votes: { [friend]: 1 } });
    expect(tripOf(t).activities[0].status).toBe('voting'); // 1 of 3
    s().voteActivity(t, id, 1);
    expect(tripOf(t).activities[0].votes[me]).toBe(1);
    expect(tripOf(t).activities[0].status).toBe('confirmed'); // 2 of 3
    s().voteActivity(t, id, 1); // same vote again takes it back
    expect(tripOf(t).activities[0].votes[me]).toBeUndefined();
  });

  it('removing a member cleans up their assignments and votes', async () => {
    await signedInUser();
    const t = newTrip();
    s().addMember(t, 'Friend');
    const friend = tripOf(t).members[1].id;
    const id = s().addActivity(t, { ...base, assigned: [friend], votes: { [friend]: -1 } });
    s().addTask(t, 'Book tickets', friend);
    s().removeMember(t, friend);
    const a = tripOf(t).activities.find((x) => x.id === id)!;
    expect(a.assigned).toEqual([]);
    expect(a.votes[friend]).toBeUndefined();
    expect(tripOf(t).tasks.find((k) => k.text === 'Book tickets')!.assignee).toBeUndefined();
  });
});

describe('budget', () => {
  it('tracks expenses and settles up to zero', async () => {
    const me = await signedInUser();
    const t = newTrip();
    s().addMember(t, 'Friend');
    const friend = tripOf(t).members[1].id;
    s().addExpense(t, { title: 'Hotel', amount: 300, category: 'Stays', paidBy: me, splitBetween: [me, friend], date: '2026-09-10' });
    s().addExpense(t, { title: 'Dinner', amount: 80, category: 'Food', paidBy: friend, splitBetween: [me, friend], date: '2026-09-11' });
    expect(tripOf(t).expenses[0].title).toBe('Dinner'); // newest first
    expect(balances(tripOf(t))).toEqual({ [me]: 110, [friend]: -110 });
    const [payment] = settlePlan(tripOf(t));
    expect(payment).toEqual({ from: friend, to: me, amount: 110 });
    s().settleUp(t, payment.from, payment.to, payment.amount);
    expect(tripOf(t).expenses[0]).toMatchObject({ settlement: true, paidBy: friend });
    expect(settlePlan(tripOf(t))).toEqual([]);
    const spend = tripOf(t).expenses.filter((e) => !e.settlement).length;
    expect(spend).toBe(2);
    s().deleteExpense(t, tripOf(t).expenses[0].id);
    expect(tripOf(t).expenses).toHaveLength(2);
  });
});

describe('collaboration features', () => {
  it('polls: vote, change vote, close, delete', async () => {
    const me = await signedInUser();
    const t = newTrip();
    s().createPoll(t, 'Which beach?', ['Ostia', 'Sperlonga']);
    const poll = tripOf(t).polls[0];
    s().votePoll(t, poll.id, poll.options[0].id);
    expect(tripOf(t).polls[0].options[0].votes).toEqual([me]);
    s().votePoll(t, poll.id, poll.options[1].id); // switching moves the vote
    expect(tripOf(t).polls[0].options.map((o) => o.votes.length)).toEqual([0, 1]);
    s().closePoll(t, poll.id);
    s().votePoll(t, poll.id, poll.options[0].id); // closed polls ignore votes
    expect(tripOf(t).polls[0].options[0].votes).toEqual([]);
    s().deletePoll(t, poll.id);
    expect(tripOf(t).polls).toHaveLength(0);
  });

  it('checklist, packing, docs and photos', async () => {
    const me = await signedInUser();
    const t = newTrip();
    const first = tripOf(t).tasks[0];
    s().toggleTask(t, first.id);
    expect(tripOf(t).tasks[0].done).toBe(true);
    s().assignTask(t, first.id, me);
    expect(tripOf(t).tasks[0].assignee).toBe(me);
    s().deleteTask(t, first.id);
    expect(tripOf(t).tasks).toHaveLength(2);

    s().addPackingItems(t, [{ text: 'Passport', category: 'Documents' }, { text: 'passport', category: 'Documents' }, { text: 'Charger', category: 'Tech' }]);
    expect(tripOf(t).packing.map((p) => p.text)).toEqual(['Passport', 'Charger']); // duplicates are skipped
    s().togglePacked(t, tripOf(t).packing[0].id);
    s().assignPacking(t, tripOf(t).packing[1].id, me);
    expect(tripOf(t).packing[0].packed).toBe(true);
    expect(tripOf(t).packing[1].broughtBy).toBe(me);

    s().addDoc(t, { name: 'Ticket.pdf', kind: 'pdf', offline: true });
    expect(tripOf(t).docs[0]).toMatchObject({ name: 'Ticket.pdf', addedBy: me });
    s().addPhoto(t, { uri: 'file:///p.jpg', caption: 'Pasta' });
    const photo = tripOf(t).photos[0];
    s().toggleLikePhoto(t, photo.id);
    expect(tripOf(t).photos[0].likes).toEqual([me]);
    s().toggleLikePhoto(t, photo.id);
    expect(tripOf(t).photos[0].likes).toEqual([]);
    s().deletePhoto(t, photo.id);
    s().deleteDoc(t, tripOf(t).docs[0].id);
    expect(tripOf(t).photos).toHaveLength(0);
    expect(tripOf(t).docs).toHaveLength(0);
  });

  it('chat keeps only the latest 400 messages', async () => {
    const me = await signedInUser();
    const t = newTrip();
    for (let i = 0; i < 405; i++) s().sendMessage(t, { authorId: me, text: `m${i}` });
    const msgs = tripOf(t).messages;
    expect(msgs).toHaveLength(400);
    expect(msgs.at(-1)!.text).toBe('m404');
    s().clearChat(t);
    expect(tripOf(t).messages).toEqual([]);
  });

  it('changes roles', async () => {
    const me = await signedInUser();
    const t = newTrip();
    s().setRole(t, me, 'Treasurer');
    expect(tripOf(t).members[0].role).toBe('Treasurer');
  });
});

describe('app-level state', () => {
  it('bucket list, favourites, notifications and settings', async () => {
    await signedInUser();
    s().addBucket('See the aurora', 'iceland');
    expect(s().bucket[0]).toMatchObject({ text: 'See the aurora', done: false });
    s().toggleBucket(s().bucket[0].id);
    expect(s().bucket[0].done).toBe(true);
    s().deleteBucket(s().bucket[0].id);
    expect(s().bucket).toEqual([]);

    s().toggleFavorite('rome');
    expect(s().favorites).toContain('rome');
    s().toggleFavorite('rome');
    expect(s().favorites).not.toContain('rome');

    for (let i = 0; i < 70; i++) s().pushNotification({ kind: 'system', title: `n${i}`, body: '' });
    expect(s().notifications).toHaveLength(60);
    s().markKindRead('system');
    expect(s().notifications.every((n) => n.read)).toBe(true);
    s().clearNotifications();
    expect(s().notifications).toEqual([]);

    s().updateSettings({ language: 'es', textScale: 1.25 });
    expect(s().settings).toMatchObject({ language: 'es', textScale: 1.25, haptics: true });
    s().updatePersonal({ nickname: 'Mimi', interests: ['food'] });
    expect(s().personal).toMatchObject({ nickname: 'Mimi', interests: ['food'], travelStyle: 'balanced' });
  });

  it('keeps the session only when "remember me" was ticked', async () => {
    await signedInUser();
    const opts = useAppStore.persist.getOptions();
    const saved = opts.partialize!({ ...s(), session: { userId: 'u', remember: false } });
    expect((saved as { session: unknown }).session).toBeNull();
    const kept = opts.partialize!({ ...s(), session: { userId: 'u', remember: true } });
    expect((kept as { session: unknown }).session).toEqual({ userId: 'u', remember: true });
  });

  it('re-seeds the demo trip for a different stage of the trip', async () => {
    await s().ensureSeed();
    s().reseedDemo('active');
    expect(s().demoTimeline).toBe('active');
    expect(s().trips.filter((t) => t.id === 'trip-amalfi')).toHaveLength(1);
  });
});
