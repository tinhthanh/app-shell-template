// node --experimental-strip-types --test src/lib/recent.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { isRecentItem, MAX_RECENT, withRecent } from "./recent.ts";

test("a record opened goes first, once, and only the newest few are kept", () => {
  let list = withRecent([], { kind: "project", id: "a", name: "A" });
  list = withRecent(list, { kind: "project", id: "b", name: "B" });
  list = withRecent(list, { kind: "project", id: "a", name: "A renamed" });
  assert.deepEqual(
    list.map((r) => `${r.id}:${r.name}`),
    ["a:A renamed", "b:B"],
  );
  for (let i = 0; i < 10; i++) list = withRecent(list, { kind: "project", id: `x${i}`, name: "X" });
  assert.equal(list.length, MAX_RECENT);
});

test("a saved entry that isn't one is told apart", () => {
  assert.equal(isRecentItem({ kind: "project", id: "a", name: "A" }), true);
  assert.equal(isRecentItem({ kind: "project", id: 3 }), false);
  assert.equal(isRecentItem(null), false);
});
