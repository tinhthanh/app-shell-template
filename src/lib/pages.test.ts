// node --experimental-strip-types --test src/lib/pages.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { appendPage, editRows, PAGE_SIZE, pageOf, sortRows } from "./pages.ts";

const rows = (n: number, from = 1) => Array.from({ length: n }, (_, i) => ({ id: `r${i + from}`, n: i + from }));

test("a page starts at its cursor and says where the next one starts, until the last", () => {
  const all = rows(120);
  const first = pageOf(all);
  assert.equal(first.items.length, PAGE_SIZE);
  assert.equal(first.next, "50");
  assert.equal(first.total, 120);
  assert.equal(pageOf(all, "100").next, undefined);
  assert.equal(pageOf(all, "100").items.length, 20);
  assert.equal(pageOf(all, "nonsense").items[0]?.id, "r1");
  assert.equal(pageOf(all, "-5").items[0]?.id, "r1");
  assert.equal(pageOf(all, undefined, 0).items.length, 1);
  assert.deepEqual(pageOf([]), { items: [], total: 0 });
});

test("the next page goes after the ones read, without a row twice", () => {
  const sofar = { items: rows(3), next: "3", total: 6 };
  const more = { items: rows(3, 3), total: 7 };
  const both = appendPage(sofar, more);
  assert.deepEqual(
    both.items.map((r) => r.id),
    ["r1", "r2", "r3", "r4", "r5"],
  );
  assert.equal(both.total, 7);
  assert.equal(both.next, undefined);
  assert.equal(appendPage(sofar, { items: [], next: "9", total: 6 }).next, "9");
});

test("a kept list's rows change whether it is whole or in pages, and the total follows", () => {
  const page = { items: rows(3), next: "3", total: 10 };
  const fewer = editRows(page, (r) => r.filter((x) => x.id !== "r2"));
  assert.deepEqual(fewer, { items: [rows(1)[0], rows(1, 3)[0]], next: "3", total: 9 });
  const more = editRows(page, (r) => [{ id: "r0", n: 0 }, ...r]);
  assert.equal(!Array.isArray(more) && more?.total, 11);
  assert.deepEqual(
    editRows(rows(2), (r) => r.slice(1)),
    rows(1, 2),
  );
  assert.equal(
    editRows(undefined, (r) => r),
    undefined,
  );
  assert.deepEqual(
    editRows({ items: rows(1), total: 0 }, () => []),
    { items: [], total: 0 },
  );
});

test("a server's sort takes a column and a way, and leaves an unknown one alone", () => {
  const all = [
    { id: "b", n: 2 },
    { id: "a", n: 1 },
    { id: "c", n: 3 },
  ];
  const by = { n: (x: { n: number }, y: { n: number }) => x.n - y.n };
  assert.deepEqual(
    sortRows(all, "n:asc", by).map((r) => r.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    sortRows(all, "n:desc", by).map((r) => r.id),
    ["c", "b", "a"],
  );
  assert.equal(sortRows(all, "x:asc", by), all);
  assert.equal(sortRows(all, undefined, by), all);
});
