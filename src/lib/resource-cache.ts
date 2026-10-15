// What the API answered, kept by key for as long as the page lives, so a
// view that comes back (the list after a detail) draws at once and reads
// again behind it, and a write can show its result before the server
// confirms it (mutate). Outside the store on purpose (docs/decisions/0009):
// this is the API's data, not the app's state. Pure, so
// resource-cache.test.ts runs it in node.

const data = new Map<string, unknown>();
const subscribers = new Map<string, Set<(value: unknown) => void>>();

export function cached<T>(key: string): T | undefined {
  return data.get(key) as T | undefined;
}

// remember keeps an answer and tells whoever shows that key.
export function remember<T>(key: string, value: T) {
  data.set(key, value);
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
