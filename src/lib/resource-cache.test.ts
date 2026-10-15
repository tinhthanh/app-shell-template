// node --experimental-strip-types --test src/lib/resource-cache.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { cached, clearCache, forget, mutate, optimistic, remember, subscribe } from "./resource-cache.ts";

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
