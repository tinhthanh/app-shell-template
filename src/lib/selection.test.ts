// node --experimental-strip-types --test src/lib/selection.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { flipAll, header, kept, ranged, toggled } from "./selection.ts";

const ids = ["a", "b", "c", "d", "e"];
const set = (...x: string[]) => new Set(x);

test("a row is picked and unpicked on its own", () => {
  assert.deepEqual(toggled(set(), "b"), set("b"));
  assert.deepEqual(toggled(set("b"), "b"), set());
});

test("Shift picks every row from the anchor to this one, either way, adding to what was picked", () => {
  assert.deepEqual(ranged(set("b"), ids, "b", "d"), set("b", "c", "d"));
  assert.deepEqual(ranged(set("d", "a"), ids, "d", "b"), set("a", "b", "c", "d"));
});

test("Shift from an anchor that was unpicked unpicks the range; with no anchor it is one row", () => {
  assert.deepEqual(ranged(set("a", "b", "c", "d"), ids, "e", "b"), set("a"));
  assert.deepEqual(ranged(set(), ids, undefined, "c"), set("c"));
  assert.deepEqual(ranged(set(), ids, "gone", "c"), set("c"));
});

test("the header box says all, some or none of the rows shown, and flips them all", () => {
  assert.equal(header(set(), ids), "none");
  assert.equal(header(set("a", "zz"), ids), "some");
  assert.equal(header(set(...ids), ids), "all");
  assert.deepEqual(flipAll(set("a"), ids), set(...ids));
  assert.deepEqual(flipAll(set(...ids), ids), set());
});

test("a row no longer listed is no longer picked, and an unchanged pick is the same set", () => {
  const sel = set("a", "c");
  assert.equal(kept(sel, ids), sel);
  assert.deepEqual(kept(sel, ["a", "b"]), set("a"));
});
