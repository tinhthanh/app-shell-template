// node --experimental-strip-types --test src/lib/list-keys.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { moveIndex, parseSort, sortToString, toggleSort } from "./list-keys.ts";

test("the arrows move one, the pages a screen, Home and End to the ends, all held inside the list", () => {
  const m = { index: 5, count: 100, page: 10 };
  assert.equal(moveIndex("ArrowDown", m), 6);
  assert.equal(moveIndex("ArrowUp", m), 4);
  assert.equal(moveIndex("PageDown", m), 15);
  assert.equal(moveIndex("PageUp", m), 0);
  assert.equal(moveIndex("Home", m), 0);
  assert.equal(moveIndex("End", m), 99);
  assert.equal(moveIndex("ArrowUp", { ...m, index: 0 }), 0);
  assert.equal(moveIndex("ArrowDown", { ...m, index: 99 }), 99);
  assert.equal(moveIndex("ArrowDown", { index: 0, count: 0, page: 10 }), undefined);
  assert.equal(moveIndex("Enter", m), undefined);
  assert.equal(moveIndex("PageDown", { index: 0, count: 3, page: 0 }), 1);
});

test("a header click sorts up, then down, then not at all; another column starts up", () => {
  const up = toggleSort(undefined, "name");
  assert.deepEqual(up, { by: "name", dir: "asc" });
  const down = toggleSort(up, "name");
  assert.deepEqual(down, { by: "name", dir: "desc" });
  assert.equal(toggleSort(down, "name"), undefined);
  assert.deepEqual(toggleSort(down, "updated"), { by: "updated", dir: "asc" });
});

test("a sort travels in the address as by:dir, and an unknown column is no sort", () => {
  assert.deepEqual(parseSort("name:desc", ["name", "updated"]), { by: "name", dir: "desc" });
  assert.deepEqual(parseSort("name", ["name"]), { by: "name", dir: "asc" });
  assert.equal(parseSort("owner:asc", ["name"]), undefined);
  assert.equal(parseSort(undefined, ["name"]), undefined);
  assert.equal(sortToString({ by: "name", dir: "desc" }), "name:desc");
  assert.equal(sortToString(undefined), undefined);
});
