// node --experimental-strip-types --test src/lib/mock.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { FIXTURES, mockClient } from "./mock.ts";

test("the fixtures list, read one, and keep an update", async () => {
  const c = mockClient({ latency: 0 });
  const all = await c.projects();
  assert.equal(all.length, FIXTURES.length);
  const one = await c.project("p-shop");
  assert.equal(one.name, "Shop");
  const updated = await c.updateProject("p-shop", { status: "paused" });
  assert.equal(updated.status, "paused");
  assert.equal((await c.project("p-shop")).status, "paused");
  // What a caller holds is a copy: changing it changes nothing.
  updated.name = "x";
  assert.equal((await c.project("p-shop")).name, "Shop");
});

test("an unknown id is a 404 with a code", async () => {
  const c = mockClient({ latency: 0 });
  await assert.rejects(c.project("nope"), (e: unknown) => e instanceof ApiError && e.status === 404 && e.code === "not_found");
});

test("fail makes every call a 503, and empty starts with nothing", async () => {
  await assert.rejects(mockClient({ latency: 0, fail: true }).projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.deepEqual(await mockClient({ latency: 0, empty: true }).projects(), []);
});
