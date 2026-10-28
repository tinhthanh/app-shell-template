// A list read a page at a time: the server filters, sorts and answers a
// Page (lib/types.ts) with a cursor for the next; usePages (lib/resource.ts)
// keeps the pages read so far under one key, and <DataTable more>
// (components/data-table.tsx) asks for the next near the end. Pure, so
// pages.test.ts runs it in node; the mock (lib/mock.ts) cuts its pages here.
import type { Page } from "./types.ts";

// How many rows a page has unless the caller asks for more.
export const PAGE_SIZE = 50;

// pageOf cuts one page out of rows a server has already filtered and
// sorted. The cursor is the offset as a string; one that isn't a number
// starts at the top.
// summary is what the server says about every match (Page.summary).
export function pageOf<T, S = undefined>(rows: T[], cursor?: string, limit = PAGE_SIZE, summary?: S): Page<T, S> {
  const start = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
  const end = start + Math.max(1, limit);
  return { items: rows.slice(start, end), total: rows.length, ...(end < rows.length ? { next: String(end) } : {}), ...(summary !== undefined ? { summary } : {}) };
}

// appendPage puts the next page after the pages read so far. A row that
// moved between the two reads (a record created above it) is not shown twice.
// The newest page's total and summary are the ones that hold.
export function appendPage<T extends { id: string }, S = undefined>(sofar: Page<T, S>, more: Page<T, S>): Page<T, S> {
  const seen = new Set(sofar.items.map((r) => r.id));
  const summary = more.summary ?? sofar.summary;
  return { items: [...sofar.items, ...more.items.filter((r) => !seen.has(r.id))], total: more.total, ...(more.next ? { next: more.next } : {}), ...(summary !== undefined ? { summary } : {}) };
}

// editRows changes a kept list's rows, whether it is kept whole (T[]) or as
// the pages read so far: a row added or taken out moves the total with it.
export function editRows<T>(list: T[] | Page<T> | undefined, fn: (rows: T[]) => T[]): T[] | Page<T> | undefined {
  if (!list) return list;
  if (Array.isArray(list)) return fn(list);
  const items = fn(list.items);
  return { ...list, items, total: Math.max(0, list.total + items.length - list.items.length) };
}

// sortRows is a server's sort for the mock: "name:desc" by the comparator
// given for "name"; an unknown column leaves the order as it is.
export function sortRows<T>(rows: T[], sort: string | undefined, by: Record<string, (a: T, b: T) => number>): T[] {
  const [col = "", dir] = (sort ?? "").split(":");
  const cmp = by[col];
  if (!cmp) return rows;
  const s = [...rows].sort(cmp);
  return dir === "desc" ? s.reverse() : s;
}
