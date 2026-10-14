// node --experimental-strip-types --test src/lib/resource-state.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { initial, next } from "./resource-state.ts";

test("the first read: loading, then ready or failed", () => {
  const s0 = initial<number[]>();
  assert.deepEqual(s0, { status: "loading", loading: true });
  assert.deepEqual(next(s0, { type: "loaded", data: [1] }), { status: "ready", data: [1], loading: false });
  assert.deepEqual(next(s0, { type: "failed", error: "down" }), { status: "failed", error: "down", loading: false });
});

test("a reload keeps the data on screen, and a failed reload keeps it too with the error beside it", () => {
  const ready = next(initial<number[]>(), { type: "loaded", data: [1] });
  const reloading = next(ready, { type: "start" });
  assert.deepEqual(reloading, { status: "ready", data: [1], loading: true });
  const failed = next(reloading, { type: "failed", error: "down" });
  assert.deepEqual(failed, { status: "ready", data: [1], error: "down", loading: false });
  // Trying again clears the old error while it runs.
  assert.deepEqual(next(failed, { type: "start" }), { status: "ready", data: [1], loading: true });
  assert.deepEqual(next(failed, { type: "loaded", data: [2] }), { status: "ready", data: [2], loading: false });
});

test("trying again after a first failure goes back to loading, with nothing to show", () => {
  const failed = next(initial<number>(), { type: "failed", error: "down" });
  assert.deepEqual(next(failed, { type: "start" }), { status: "loading", loading: true });
});
