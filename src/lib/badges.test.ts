// node --experimental-strip-types --test src/lib/badges.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { setPlaceBadge, usePlaceBadges } from "./badges.ts";

test("a place shows the count it is given, loud or not, and none once it is 0", () => {
  setPlaceBadge("projects", 8);
  setPlaceBadge("review", 2, true);
  assert.deepEqual(usePlaceBadges.getState(), { projects: { count: 8, loud: false }, review: { count: 2, loud: true } });
  setPlaceBadge("projects", 0);
  setPlaceBadge("review", undefined);
  assert.deepEqual(usePlaceBadges.getState(), {});
});
