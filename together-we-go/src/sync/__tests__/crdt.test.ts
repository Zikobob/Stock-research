import { produce } from 'immer';

import { buildDemoTrip } from '@/store/seed';
import type { Trip } from '@/store/types';

import { applyOps, diffTrip, materializeTrip, resolve, type Op, type Registers } from '../crdt';
import { HybridClock } from '../hlc';
import { mergeLocalOnly } from '../view';
import { Replica, fakeNow, makeTrip, seeded, sharedPart } from '../testing';

const json = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('describing and rebuilding a trip', () => {
  it('a rebuilt trip equals the original (shared parts)', () => {
    const trip = makeTrip();
    const clock = new HybridClock('a', fakeNow());
    const regs: Registers = {};
    applyOps(regs, diffTrip(undefined, trip, () => clock.next()));
    const rebuilt = materializeTrip(regs)!;
    expect(rebuilt).toEqual(sharedPart(trip));
  });

  it('works for the full demo trip (hundreds of items) and puts phone-only parts back', () => {
    const trip = json(buildDemoTrip('upcoming'));
    const clock = new HybridClock('a', fakeNow());
    const regs: Registers = {};
    applyOps(regs, diffTrip(undefined, trip, () => clock.next()));
    const rebuilt = materializeTrip(regs)!;
    expect(rebuilt).toEqual(sharedPart(trip));
    expect(json(mergeLocalOnly(rebuilt, trip))).toEqual(trip);
  });

  it('keeps the order lists had: newest last for itineraries, newest first for expenses', () => {
    const trip = produce(makeTrip(), (d) => {
      d.activities.push({ ...d.activities[0], id: 'a2', title: 'Forum' }, { ...d.activities[0], id: 'a3', title: 'Pantheon' });
      d.expenses.unshift({ ...d.expenses[0], id: 'e2', title: 'Dinner' }, { ...d.expenses[0], id: 'e3', title: 'Taxi' });
    });
    const clock = new HybridClock('a', fakeNow());
    const regs: Registers = {};
    applyOps(regs, diffTrip(undefined, trip, () => clock.next()));
    const rebuilt = materializeTrip(regs)!;
    expect(rebuilt.activities.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(rebuilt.expenses.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']); // the same order the array had
  });

  it('never shares private chat, emails or file paths', () => {
    const ops = diffTrip(undefined, makeTrip(), new HybridClock('a', fakeNow()).next.bind(new HybridClock('a', fakeNow())));
    const text = JSON.stringify(ops);
    expect(text).not.toContain('ana@example.com');
    expect(text).not.toContain('private answer');
    expect(text).not.toContain('file:///');
  });
});

describe('merging is order-proof and repeat-proof', () => {
  it('applying ops twice, or shuffled, gives the same registers', () => {
    const clock = new HybridClock('a', fakeNow());
    const ops = diffTrip(undefined, makeTrip(), () => clock.next());
    const once: Registers = {};
    applyOps(once, ops);
    const twice: Registers = {};
    applyOps(twice, ops);
    expect(applyOps(twice, ops)).toBe(false);
    const rnd = seeded(5);
    const shuffled: Registers = {};
    applyOps(shuffled, rnd.shuffle(ops));
    expect(twice).toEqual(once);
    expect(shuffled).toEqual(once);
  });

  it('ignores paths it does not know (changes from a newer app version)', () => {
    const regs: Registers = {};
    expect(applyOps(regs, [{ p: ['hologram', 'x'], v: 1, t: '1800000000000-0000-zzzz' }, { p: ['activities', 'a1', 'teleport'], v: 1, t: '1800000000001-0000-zzzz' }])).toBe(false);
    expect(regs).toEqual({});
  });

  it('validates paths against the schema', () => {
    expect(resolve(['name'])).toEqual({ items: [], isItem: false });
    expect(resolve(['activities', 'a1'])).toEqual({ items: [['activities', 'a1']], isItem: true });
    expect(resolve(['activities', 'a1', 'votes', 'u-a'])?.isItem).toBe(false);
    expect(resolve(['polls', 'p1', 'options', 'o1', 'votes', 'u-b'])?.items).toHaveLength(2);
    expect(resolve(['activities', 'a1', 'votes'])).toBeNull(); // a map node alone is not a register
    expect(resolve(['activities'])).toBeNull();
    expect(resolve(['name', 'extra'])).toBeNull();
  });

  it('hides items that arrive without their required fields', () => {
    const clock = new HybridClock('a', fakeNow());
    const regs: Registers = {};
    applyOps(regs, diffTrip(undefined, makeTrip(), () => clock.next()));
    const t = clock.next();
    applyOps(regs, [{ p: ['tasks', 'partial', '_c'], v: 1, t }, { p: ['tasks', 'partial', 'done'], v: true, t: clock.next() }]);
    expect(materializeTrip(regs)!.tasks.map((k) => k.id)).toEqual(['t1']);
  });
});

describe('two phones editing at the same time', () => {
  const setup = () => {
    const now = fakeNow();
    const a = new Replica('aaaaaaaa', now, makeTrip());
    const b = new Replica('bbbbbbbb', now);
    b.receive(a.publish());
    return { a, b, now };
  };
  const swap = (a: Replica, b: Replica, opsA: Op[], opsB: Op[]) => {
    b.receive(opsA);
    a.receive(opsB);
  };

  it('keeps both new activities', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void d.activities.push({ ...d.activities[0], id: 'a-ana', title: 'Forum' }));
    const ob = b.edit((d) => void d.activities.push({ ...d.activities[0], id: 'a-ben', title: 'Pantheon' }));
    swap(a, b, oa, ob);
    expect(a.trip!.activities.map((x) => x.id)).toEqual(['a1', 'a-ana', 'a-ben']);
    expect(sharedPart(a.trip)).toEqual(sharedPart(b.trip));
  });

  it('merges edits to different fields of one activity', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void (d.activities[0].title = 'Colosseum tour'));
    const ob = b.edit((d) => void (d.activities[0].time = '09:00'));
    swap(a, b, oa, ob);
    for (const r of [a, b]) expect(r.trip!.activities[0]).toMatchObject({ title: 'Colosseum tour', time: '09:00' });
  });

  it('the later edit wins when both change the same field, on both phones', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void (d.name = 'Rome Crew!'));
    const ob = b.edit((d) => void (d.name = 'Roma Squad')); // made a moment later
    swap(a, b, oa, ob);
    expect(a.trip!.name).toBe('Roma Squad');
    expect(b.trip!.name).toBe('Roma Squad');
  });

  it('a delete beats a concurrent edit of the same item', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void (d.activities = []));
    const ob = b.edit((d) => void (d.activities[0].title = 'Edited while deleted'));
    swap(a, b, oa, ob);
    expect(a.trip!.activities).toEqual([]);
    expect(b.trip!.activities).toEqual([]);
  });

  it('votes from different people both count', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void (d.activities[0].votes['u-a'] = -1));
    const ob = b.edit((d) => void (d.activities[0].votes['u-b'] = 1));
    swap(a, b, oa, ob);
    expect(a.trip!.activities[0].votes).toEqual({ 'u-a': -1, 'u-b': 1 });
    expect(b.trip!.activities[0].votes).toEqual({ 'u-a': -1, 'u-b': 1 });
  });

  it('adds and removes inside lists of names independently', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void d.expenses[0].splitBetween.push('u-c'));
    const ob = b.edit((d) => void (d.expenses[0].splitBetween = d.expenses[0].splitBetween.filter((x) => x !== 'u-a')));
    swap(a, b, oa, ob);
    expect([...a.trip!.expenses[0].splitBetween].sort()).toEqual(['u-b', 'u-c']);
    expect([...b.trip!.expenses[0].splitBetween].sort()).toEqual(['u-b', 'u-c']);
  });

  it('poll votes (nested items) merge too', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void d.polls[0].options[0].votes.push('u-a'));
    const ob = b.edit((d) => void d.polls[0].options[1].votes.push('u-c'));
    swap(a, b, oa, ob);
    for (const r of [a, b]) expect(r.trip!.polls[0].options.map((o) => [...o.votes].sort())).toEqual([['u-a'], ['u-b', 'u-c']]);
  });

  it('chat messages from both phones appear in time order', () => {
    const { a, b } = setup();
    const oa = a.edit((d) => void d.messages.push({ id: 'm-a', authorId: 'u-a', text: 'first', ts: 2000 }));
    const ob = b.edit((d) => void d.messages.push({ id: 'm-b', authorId: 'u-b', text: 'second', ts: 2001 }));
    swap(a, b, oa, ob);
    expect(a.trip!.messages.filter((m) => !m.ai).map((m) => m.id)).toEqual(['m1', 'm-a', 'm-b']);
    expect(b.trip!.messages.map((m) => m.id)).toEqual(['m1', 'm-a', 'm-b']);
  });

  it('keeps the private Scout chat on its own phone', () => {
    const { a, b } = setup();
    expect(a.trip!.messages.map((m) => m.id)).toContain('ai1');
    expect(b.trip!.messages.map((m) => m.id)).not.toContain('ai1');
    a.edit((d) => void d.messages.push({ id: 'ai2', authorId: 'assistant', text: 'another', ts: 3, ai: true, channel: 'ai' }));
    expect(b.trip!.messages.map((m) => m.id)).not.toContain('ai2');
  });

  it('a person who leaves and rejoins comes back with fresh details only', () => {
    const { a, b } = setup();
    // Ben leaves (his member entry is deleted) ...
    const leave = b.edit((d) => void (d.members = d.members.filter((m) => m.id !== 'u-b')));
    a.receive(leave);
    expect(a.trip!.members.map((m) => m.id)).toEqual(['u-a']);
    // ... then rejoins with a different role and no home city.
    const rejoin = b.edit((d) => void d.members.push({ id: 'u-b', name: 'Ben R.', role: 'Photographer' }));
    a.receive(rejoin);
    expect(a.trip!.members.find((m) => m.id === 'u-b')).toEqual({ id: 'u-b', name: 'Ben R.', role: 'Photographer' });
  });

  it('removing a field removes it everywhere', () => {
    const { a, b } = setup();
    b.receive(a.edit((d) => void (d.activities[0].notes = 'Bring water')));
    expect(b.trip!.activities[0].notes).toBe('Bring water');
    b.receive(a.edit((d) => void delete d.activities[0].notes));
    expect(b.trip!.activities[0].notes).toBeUndefined();
  });

  it('a phone that was offline catches up from everything it missed', () => {
    const { a, b } = setup();
    const missed: Op[] = [];
    missed.push(...a.edit((d) => void d.tasks.push({ id: 't2', text: 'Pack', done: false })));
    missed.push(...a.edit((d) => void (d.tasks[0].done = true)));
    missed.push(...a.edit((d) => void d.messages.push({ id: 'm2', authorId: 'u-a', text: 'back online?', ts: 9 })));
    b.receive(missed);
    expect(sharedPart(b.trip)).toEqual(sharedPart(a.trip));
  });
});

describe('many phones, many random edits: everyone ends up identical', () => {
  const ids = ['u-a', 'u-b', 'u-c'];

  const mutations: ((d: Trip, rnd: ReturnType<typeof seeded>, n: number) => void)[] = [
    (d, r, n) => void d.activities.push({ ...makeTrip().activities[0], id: `a-${n}`, title: `Act ${n}`, status: r.pick(['voting', 'confirmed', 'pending'] as const) }),
    (d, r) => void (d.activities.length && (d.activities[r.int(d.activities.length)].title = `Retitled ${r.int(99)}`)),
    (d, r) => void (d.activities.length && (d.activities[r.int(d.activities.length)].votes[r.pick(ids)] = r.pick([1, -1] as const))),
    (d, r) => {
      if (!d.activities.length) return;
      const a = d.activities[r.int(d.activities.length)];
      delete a.votes[r.pick(ids)];
    },
    (d, r) => void (d.activities.length && d.activities.splice(r.int(d.activities.length), 1)),
    (d, r) => {
      if (!d.activities.length) return;
      const a = d.activities[r.int(d.activities.length)];
      const who = r.pick(ids);
      a.assigned = a.assigned.includes(who) ? a.assigned.filter((x) => x !== who) : [...a.assigned, who];
    },
    (d, r, n) => void d.expenses.unshift({ id: `e-${n}`, title: `Exp ${n}`, amount: r.int(5000) / 100, category: 'Food', paidBy: r.pick(ids), splitBetween: ids.filter(() => r.next() < 0.7), date: '2026-09-11' }),
    (d, r) => void (d.expenses.length && d.expenses.splice(r.int(d.expenses.length), 1)),
    (d, r, n) => void d.messages.push({ id: `m-${n}`, authorId: r.pick(ids), text: `msg ${n}`, ts: n }),
    (d, r, n) => void d.tasks.push({ id: `t-${n}`, text: `Task ${n}`, done: false }),
    (d, r) => void (d.tasks.length && (d.tasks[r.int(d.tasks.length)].done = r.next() < 0.5)),
    (d, r) => void (d.tasks.length && d.tasks.splice(r.int(d.tasks.length), 1)),
    (d, r) => void (d.name = `Trip ${r.int(100)}`),
    (d, r) => void (d.budget = 1000 + r.int(5000)),
    (d, r) => {
      const o = d.polls[0]?.options[r.int(2)];
      if (!o) return;
      const who = r.pick(ids);
      o.votes = o.votes.includes(who) ? o.votes.filter((x) => x !== who) : [...o.votes, who];
    },
    (d, r, n) => void d.members.push({ id: `m-${n}`, name: `Member ${n}`, role: 'Member' }),
    (d, r) => void (d.members.length > 1 && d.members.splice(1 + r.int(d.members.length - 1), 1)),
    (d, r) => void (d.photos.length && (d.photos[0].likes = d.photos[0].likes.includes('u-c') ? [] : ['u-c'])),
  ];

  // More seeds on demand:  SYNC_SEEDS=200 npx jest src/sync
  it.each(Array.from({ length: Number(process.env.SYNC_SEEDS ?? 6) }, (_, i) => i + 1))('seed %i: 3 phones, 90 edits, shuffled delivery with duplicates', (seed) => {
    const rnd = seeded(seed * 7919);
    const now = fakeNow();
    const phones = [new Replica('aaaaaaaa', now, makeTrip()), new Replica('bbbbbbbb', now), new Replica('cccccccc', now)];
    const baseline = phones[0].publish();
    phones[1].receive(baseline);
    phones[2].receive(baseline);

    const inbox: Op[][][] = phones.map(() => []);
    for (let n = 0; n < 90; n++) {
      const i = rnd.int(3);
      const ops = phones[i].edit((d) => rnd.pick(mutations)(d, rnd, n));
      if (ops.length) phones.forEach((_, j) => j !== i && inbox[j].push(ops));
      if (rnd.next() < 0.35) {
        // some phone gets whatever is waiting for it, in random order, sometimes twice
        const j = rnd.int(3);
        const batches = rnd.shuffle(inbox[j]);
        inbox[j] = [];
        batches.forEach((b) => {
          phones[j].receive(b);
          if (rnd.next() < 0.2) phones[j].receive(b);
        });
      }
    }
    phones.forEach((p, j) => {
      rnd.shuffle(inbox[j]).forEach((b) => p.receive(b));
    });

    const [p0, p1, p2] = phones;
    expect(p1.regs).toEqual(p0.regs);
    expect(p2.regs).toEqual(p0.regs);
    expect(sharedPart(p1.trip)).toEqual(sharedPart(p0.trip));
    expect(sharedPart(p2.trip)).toEqual(sharedPart(p0.trip));
    // and what each phone shows is exactly the merge of everything
    expect(sharedPart(p0.trip)).toEqual(json(materializeTrip(p0.regs)));
  });
});
