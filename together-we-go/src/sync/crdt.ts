/**
 * The merge engine behind phone-to-phone sync.
 *
 *   diffTrip      : "what changed?"  Compares two versions of a trip and returns the small changes (ops) between them.
 *   applyOps      : "merge these"    Folds ops from any phone into the registers. Order and repeats do not matter.
 *   materializeTrip: "show me the trip" Rebuilds a Trip object from the registers.
 *
 * Rules that make every phone end up identical:
 *  1. Every op carries a unique, sortable stamp (see hlc.ts). For one register the op with the biggest stamp wins.
 *  2. Deleting an item is remembered (a tombstone). Changes older than the tombstone are ignored, so a delete beats a
 *     concurrent edit. Creating the item again later (a newer creation stamp) brings it back.
 *  3. Applying the same op twice, or in a different order, gives the same result.
 */
import type { Trip } from '@/store/types';

import { compareStamps } from './hlc';
import { CREATED, PATH_SEP, TRIP_SCHEMA, pathKey, type ItemSchema, type ListSchema } from './schema';

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** One change. `p` is the path of the register, `v` the new value, `d` marks a delete, `t` is the stamp. */
export interface Op {
  p: string[];
  v?: Json;
  d?: 1;
  t: string;
}

/** What we remember about one register: the stamp of the change that wrote it, and its value (or that it was deleted). */
export interface Reg {
  t: string;
  v?: Json;
  d?: 1;
}
export type Registers = Record<string, Reg>;


// ------------------------------------------------------------------ diff

/** The ops that turn `prev` into `next`. Pass `undefined` as `prev` to describe a whole trip from scratch. */
export function diffTrip(prev: Trip | undefined, next: Trip, stamp: () => string): Op[] {
  const out: Op[] = [];
  diffItem([], prev, next, TRIP_SCHEMA, out, stamp);
  return out;
}

const setOp = (p: string[], v: Json, t: string): Op => ({ p, v, t });
const delOp = (p: string[], t: string): Op => ({ p, d: 1, t });

function diffItem(path: string[], prev: any, next: any, S: ItemSchema, out: Op[], stamp: () => string): void {
  for (const f of S.scalars) {
    const a = prev?.[f];
    const b = next[f];
    if (a !== b) out.push(b === undefined ? delOp([...path, f], stamp()) : setOp([...path, f], b, stamp()));
  }
  for (const f of S.json ?? []) {
    const a = prev?.[f];
    const b = next[f];
    if (a === b || (a !== undefined && b !== undefined && deepEqual(a, b))) continue;
    out.push(b === undefined ? delOp([...path, f], stamp()) : setOp([...path, f], b, stamp()));
  }
  for (const f of S.sets ?? []) {
    if (prev?.[f] === next[f]) continue;
    const before = new Set<string>(prev?.[f] ?? []);
    const after = new Set<string>(next[f] ?? []);
    for (const x of after) if (!before.has(x)) out.push(setOp([...path, f, x], 1, stamp()));
    for (const x of before) if (!after.has(x)) out.push(delOp([...path, f, x], stamp()));
  }
  for (const f of S.maps ?? []) {
    if (prev?.[f] === next[f]) continue;
    const a: Record<string, Json> = prev?.[f] ?? {};
    const b: Record<string, Json> = next[f] ?? {};
    for (const k of Object.keys(b)) if (a[k] !== b[k]) out.push(setOp([...path, f, k], b[k], stamp()));
    for (const k of Object.keys(a)) if (!(k in b)) out.push(delOp([...path, f, k], stamp()));
  }
  for (const [name, L] of Object.entries(S.lists ?? {})) diffList([...path, name], prev?.[name], next[name], L, out, stamp);
}

function diffList(path: string[], prevArr: any[] | undefined, nextArr: any[] | undefined, L: ListSchema, out: Op[], stamp: () => string): void {
  if (prevArr === nextArr) return;
  const shared = (arr: any[] | undefined) => (arr ?? []).filter((x) => !L.share || L.share(x));
  const prevItems = new Map<string, any>(shared(prevArr).map((x) => [x.id, x]));
  const nextItems = shared(nextArr);
  const nextIds = new Set<string>(nextItems.map((x) => x.id));
  for (const id of prevItems.keys()) if (!nextIds.has(id)) out.push(delOp([...path, id], stamp()));
  // Oldest first, so creation stamps rise in the same order the items were made.
  const oldestFirst = L.order === 'asc' ? nextItems : [...nextItems].reverse();
  for (const item of oldestFirst) {
    const old = prevItems.get(item.id);
    if (!old) {
      out.push(setOp([...path, item.id, CREATED], 1, stamp()));
      diffItem([...path, item.id], undefined, item, L.item, out, stamp);
    } else if (old !== item) {
      diffItem([...path, item.id], old, item, L.item, out, stamp);
    }
  }
}

// ------------------------------------------------------------------ merge

/** Where a path points: the chain of items it sits inside, and whether it is an item itself. */
interface Resolved {
  items: string[][];
  isItem: boolean;
}

/** Checks a path against the schema. Unknown paths (from a newer version of the app) return null and are ignored. */
export function resolve(path: readonly string[], schema: ItemSchema = TRIP_SCHEMA, items: string[][] = [], at = 0): Resolved | null {
  const seg = path[at];
  if (seg === undefined) return null;
  const last = at === path.length - 1;
  if (schema.scalars.includes(seg) || schema.json?.includes(seg)) return last ? { items, isItem: false } : null;
  if (seg === CREATED && items.length > 0) return last ? { items, isItem: false } : null;
  if (schema.sets?.includes(seg) || schema.maps?.includes(seg)) return at === path.length - 2 ? { items, isItem: false } : null;
  const list = schema.lists?.[seg];
  if (list) {
    if (path.length < at + 2) return null;
    const itemPath = path.slice(0, at + 2) as string[];
    const chain = [...items, itemPath];
    if (path.length === at + 2) return { items: chain, isItem: true };
    return resolve(path, list.item, chain, at + 2);
  }
  return null;
}

/** Folds ops into the registers. Returns true if anything actually changed. */
export function applyOps(regs: Registers, ops: readonly Op[]): boolean {
  let changed = false;
  for (const op of ops) if (applyOp(regs, op)) changed = true;
  return changed;
}

function applyOp(regs: Registers, op: Op): boolean {
  const info = resolve(op.p);
  if (!info) return false;
  if (info.isItem && !op.d) return false; // an item node can only be deleted; it is created by its creation stamp
  // A change older than a delete of the item it belongs to is void.
  const owners = info.isItem ? info.items.slice(0, -1) : info.items;
  for (const itemPath of owners) {
    const tomb = regs[pathKey(itemPath)];
    if (tomb?.d && compareStamps(op.t, tomb.t) <= 0) return false;
  }
  const key = pathKey(op.p);
  const cur = regs[key];
  if (cur && compareStamps(op.t, cur.t) <= 0) return false;
  regs[key] = op.d ? { t: op.t, d: 1 } : { t: op.t, v: op.v };
  return true;
}

// ------------------------------------------------------------------ rebuild

interface Node {
  reg?: Reg;
  kids: Map<string, Node>;
}

function buildTree(regs: Registers): Node {
  const root: Node = { kids: new Map() };
  for (const [key, reg] of Object.entries(regs)) {
    let n = root;
    for (const seg of key.split(PATH_SEP)) {
      let c = n.kids.get(seg);
      if (!c) {
        c = { kids: new Map() };
        n.kids.set(seg, c);
      }
      n = c;
    }
    n.reg = reg;
  }
  return root;
}

/** Rebuilds the shared part of a trip from the registers. Returns null if the trip is not complete yet. */
export function materializeTrip(regs: Registers): Trip | null {
  return readItem(TRIP_SCHEMA, buildTree(regs), '', undefined) as Trip | null;
}

/** `floor` is the stamp of the newest delete above this item: anything written before it is ignored. */
function readItem(S: ItemSchema, node: Node, floor: string, id: string | undefined): any | null {
  const alive = (r?: Reg): r is Reg => !!r && !r.d && compareStamps(r.t, floor) > 0;
  const obj: any = id === undefined ? {} : { id };
  for (const f of [...S.scalars, ...(S.json ?? [])]) {
    const r = node.kids.get(f)?.reg;
    if (alive(r)) obj[f] = r.v;
  }
  for (const f of S.sets ?? []) {
    const kids = [...(node.kids.get(f)?.kids ?? [])].filter(([, k]) => alive(k.reg));
    kids.sort((a, b) => compareStamps(a[1].reg!.t, b[1].reg!.t) || (a[0] < b[0] ? -1 : 1));
    obj[f] = kids.map(([k]) => k);
  }
  for (const f of S.maps ?? []) {
    obj[f] = Object.fromEntries([...(node.kids.get(f)?.kids ?? [])].filter(([, k]) => alive(k.reg)).map(([k, v]) => [k, v.reg!.v]));
  }
  for (const [name, L] of Object.entries(S.lists ?? {})) obj[name] = readList(L, node.kids.get(name), floor);
  for (const r of S.required ?? []) if (obj[r] === undefined) return null;
  return obj;
}

function readList(L: ListSchema, node: Node | undefined, floor: string): any[] {
  const found: { order: string; id: string; obj: any }[] = [];
  for (const [id, child] of node?.kids ?? []) {
    const created = child.kids.get(CREATED)?.reg;
    const tomb = child.reg?.d ? child.reg.t : '';
    const itemFloor = compareStamps(tomb, floor) > 0 ? tomb : floor;
    if (!created || created.d || compareStamps(created.t, itemFloor) <= 0) continue;
    const obj = readItem(L.item, child, itemFloor, id);
    if (obj) found.push({ order: created.t, id, obj });
  }
  found.sort((a, b) => compareStamps(a.order, b.order) || (a.id < b.id ? -1 : 1));
  const items = found.map((f) => f.obj);
  return L.order === 'desc' ? items.reverse() : items;
}

// ------------------------------------------------------------------ helpers

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => k in b && deepEqual(a[k], b[k]));
}
