// What the API answered, kept by key for as long as the page lives, so a
// view that comes back (the list after a detail) draws at once and reads
// again behind it, and a write can show its result before the server
// confirms it (mutate). Outside the store on purpose (docs/decisions/0009):
// this is the API's data, not the app's state. Pure, so
// resource-cache.test.ts runs it in node.
import { editRows } from "./pages.ts";
import type { Page } from "./types.ts";

const data = new Map<string, unknown>();
const subscribers = new Map<string, Set<(value: unknown) => void>>();

// How many answers are kept: a list's every filter and every record opened
// is a key, so a long session would keep them all. The least lately used go
// first; one on screen (with a subscriber) is never dropped.
export const MAX_KEPT = 100;

export function cached<T>(key: string): T | undefined {
  return data.get(key) as T | undefined;
}

// remember keeps an answer and tells whoever shows that key.
export function remember<T>(key: string, value: T) {
  // Set afresh, so the key is the newest in the map's order.
  data.delete(key);
  data.set(key, value);
  for (const old of data.keys()) {
    if (data.size <= MAX_KEPT) break;
    if (!subscribers.get(old)?.size) data.delete(old);
  }
  for (const fn of subscribers.get(key) ?? []) fn(value);
}

// mutate changes what is kept, in place, as a write will: give the next
// value from the current one. undefined forgets the key. Everyone showing
// it redraws.
export function mutate<T>(key: string, fn: (current: T | undefined) => T | undefined) {
  const next = fn(cached<T>(key));
  if (next === undefined) forget(key);
  else remember(key, next);
}

export function forget(key: string) {
  data.delete(key);
}

export function subscribe<T>(key: string, fn: (value: T) => void): () => void {
  const set = subscribers.get(key) ?? new Set();
  set.add(fn as (value: unknown) => void);
  subscribers.set(key, set);
  return () => {
    set.delete(fn as (value: unknown) => void);
  };
}

// clearCache forgets everything: at sign-out, or between tests.
export function clearCache() {
  data.clear();
}

// How many writes each key has seen: an answer from before the newest
// write (a read that set out first, a write a newer one overtook) is older
// than what is on screen, and is dropped rather than drawn over it.
const writes = new Map<string, number>();

export function writeCount(key: string): number {
  return writes.get(key) ?? 0;
}

function wrote(key: string): number {
  const n = writeCount(key) + 1;
  writes.set(key, n);
  return n;
}

// listsOf is every kept list of the resource listKey names: the key itself
// and its siblings with another query ("projects", "projects?status=paused",
// another workspace's), so a write reaches each list the record may be in.
export function listsOf(listKey: string): string[] {
  const base = listKey.split("?")[0] ?? listKey;
  return [...data.keys()].filter((k) => k === base || k.startsWith(`${base}?`));
}

// rowIn finds a row in a kept list, whole or a page at a time.
function rowIn<T extends { id: string }>(list: T[] | Page<T> | undefined, id: string): T | undefined {
  const rows = Array.isArray(list) ? list : list?.items;
  return rows?.find((r) => r.id === id);
}

// optimistic shows a write's result before the server confirms it: the
// patch goes into the record (key) and its row in the list (listKey) at
// once (kept whole or a page at a time, lib/pages.ts), write runs, and
// what the server returns replaces both. If the server refuses, both go
// back as they were (the row as the list had it, even when the record was
// never read) and the error is thrown on, for the caller to explain
// (toastError). A newer write to the same record owns the screen: an older
// one's answer, or its refusal, changes nothing.
export async function optimistic<T extends { id: string }>(o: { key: string; listKey?: string; id: string; patch: Partial<T>; write: () => Promise<T> }): Promise<T> {
  const before = cached<T>(o.key);
  // Every kept list of the resource, with the row as each had it.
  const lists = o.listKey ? [...new Set([o.listKey, ...listsOf(o.listKey)])] : [];
  const before_ = new Map(lists.map((k) => [k, rowIn(cached<T[] | Page<T>>(k), o.id)]));
  const rowBefore = o.listKey ? before_.get(o.listKey) : undefined;
  const inList = (fn: (row: T, key: string) => T) => {
    for (const k of lists) mutate<T[] | Page<T>>(k, (l) => editRows(l, (rows) => rows.map((row) => (row.id === o.id ? fn(row, k) : row))));
  };
  const mine = wrote(o.key);
  if (o.listKey) wrote(o.listKey);
  const newest = () => writeCount(o.key) === mine;
  mutate<T>(o.key, (x) => x && { ...x, ...o.patch });
  inList((row) => ({ ...row, ...o.patch }));
  try {
    const saved = await o.write();
    if (newest()) {
      remember(o.key, saved);
      inList(() => saved);
    }
    return saved;
  } catch (err) {
    if (newest()) {
      mutate<T>(o.key, () => before);
      if (rowBefore || before_.size) inList((row, k) => before_.get(k) ?? row);
    }
    throw err;
  }
}
