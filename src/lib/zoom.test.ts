// node --experimental-strip-types --test src/lib/zoom.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

// prefs.ts wants storage at load; give it an empty one.
const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { nextSize, UI_SIZES } = await import("./zoom.ts");

test("a step moves one px inside the range, 0 resets, and the ends hold", () => {
  assert.equal(nextSize(13, 1), 14);
  assert.equal(nextSize(13, -1), 12);
  assert.equal(nextSize(17, 0), UI_SIZES.default);
  assert.equal(nextSize(UI_SIZES.max, 1), UI_SIZES.max);
  assert.equal(nextSize(UI_SIZES.min, -1), UI_SIZES.min);
  // A size that isn't whole (a zoomed browser) rounds first.
  assert.equal(nextSize(13.6, 1), 15);
});
