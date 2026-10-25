// node --experimental-strip-types --test src/lib/resource-cache.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { cached, clearCache, forget, mutate, optimistic, remember, subscribe, writeCount } from "./resource-cache.ts";

test.beforeEach(clearCache);

test("what is remembered is kept by key and told to whoever subscribed", () => {
  const seen: unknown[] = [];
  const stop = subscribe("projects", (v) => seen.push(v));
  remember("projects", [1]);
  assert.deepEqual(cached("projects"), [1]);
  assert.deepEqual(seen, [[1]]);
  stop();
  remember("projects", [2]);
  assert.deepEqual(seen, [[1]]);
});

test("mutate changes what is kept from the current value; undefined forgets it", () => {
  remember("project:a", { id: "a", status: "active" });
  mutate<{ id: string; status: string }>("project:a", (p) => p && { ...p, status: "paused" });
  assert.deepEqual(cached("project:a"), { id: "a", status: "paused" });
  mutate("project:a", () => undefined);
  assert.equal(cached("project:a"), undefined);
  forget("nothing");
});

type Row = { id: string; status: string; name: string };

test("an optimistic write shows at once in the record and the list, then what the server returned", async () => {
  remember<Row>("row:a", { id: "a", status: "active", name: "A" });
  remember<Row[]>("rows", [
    { id: "a", status: "active", name: "A" },
    { id: "b", status: "active", name: "B" },
  ]);
  let resolve: (r: Row) => void = () => {};
  const p = optimistic<Row>({ key: "row:a", listKey: "rows", id: "a", patch: { status: "paused" }, write: () => new Promise((r) => (resolve = r)) });
  assert.equal(cached<Row>("row:a")?.status, "paused");
  assert.deepEqual(
    cached<Row[]>("rows")?.map((r) => r.status),
    ["paused", "active"],
  );
  resolve({ id: "a", status: "paused", name: "A (saved)" });
  assert.equal((await p).name, "A (saved)");
  assert.equal(cached<Row>("row:a")?.name, "A (saved)");
  assert.equal(cached<Row[]>("rows")?.[0]?.name, "A (saved)");
});

test("an optimistic write reaches its row in a list kept a page at a time", async () => {
  remember<Row>("row:a", { id: "a", status: "active", name: "A" });
  remember("rows?page", { items: [{ id: "a", status: "active", name: "A" }], next: "1", total: 4 });
  await optimistic<Row>({ key: "row:a", listKey: "rows?page", id: "a", patch: { status: "paused" }, write: async () => ({ id: "a", status: "paused", name: "A" }) });
  assert.deepEqual(cached("rows?page"), { items: [{ id: "a", status: "paused", name: "A" }], next: "1", total: 4 });
});

test("a refused optimistic write goes back as it was, and the error is thrown on", async () => {
  remember<Row>("row:a", { id: "a", status: "active", name: "A" });
  remember<Row[]>("rows", [{ id: "a", status: "active", name: "A" }]);
  await assert.rejects(optimistic<Row>({ key: "row:a", listKey: "rows", id: "a", patch: { status: "paused" }, write: () => Promise.reject(new Error("no")) }), /no/);
  assert.equal(cached<Row>("row:a")?.status, "active");
  assert.equal(cached<Row[]>("rows")?.[0]?.status, "active");
});

test("an optimistic write with nothing kept yet keeps what the server returned", async () => {
  const saved = await optimistic<Row>({ key: "row:z", id: "z", patch: { status: "paused" }, write: async () => ({ id: "z", status: "paused", name: "Z" }) });
  assert.equal(saved.id, "z");
  assert.equal(cached<Row>("row:z")?.name, "Z");
});

test("of two quick writes to one record, the newer owns the screen whichever answers last", async () => {
  remember<Row>("row:q", { id: "q", status: "active", name: "Q" });
  remember<Row[]>("rows:q", [{ id: "q", status: "active", name: "Q" }]);
  let first: (r: Row) => void = () => {};
  const a = optimistic<Row>({ key: "row:q", listKey: "rows:q", id: "q", patch: { status: "paused" }, write: () => new Promise((r) => (first = r)) });
  const b = optimistic<Row>({ key: "row:q", listKey: "rows:q", id: "q", patch: { status: "archived" }, write: async () => ({ id: "q", status: "archived", name: "Q" }) });
  await b;
  first({ id: "q", status: "paused", name: "Q" });
  await a;
  assert.equal(cached<Row>("row:q")?.status, "archived");
  assert.equal(cached<Row[]>("rows:q")?.[0]?.status, "archived");
});

test("a refused write puts the list's row back even when the record itself was never read", async () => {
  remember<Row[]>("rows:never", [{ id: "n", status: "active", name: "N" }]);
  await assert.rejects(optimistic<Row>({ key: "row:never", listKey: "rows:never", id: "n", patch: { status: "paused" }, write: () => Promise.reject(new Error("no")) }), /no/);
  assert.equal(cached<Row[]>("rows:never")?.[0]?.status, "active");
});

test("a write counts against its record and its list, so a read that set out before it is older", async () => {
  const before = writeCount("row:w");
  await optimistic<Row>({ key: "row:w", listKey: "rows:w", id: "w", patch: { status: "paused" }, write: async () => ({ id: "w", status: "paused", name: "W" }) });
  assert.equal(writeCount("row:w"), before + 1);
  assert.equal(writeCount("rows:w"), 1);
});
