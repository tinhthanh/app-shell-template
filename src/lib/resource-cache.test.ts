// node --experimental-strip-types --test src/lib/resource-cache.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { cached, clearCache, forget, mutate, remember, subscribe } from "./resource-cache.ts";

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
