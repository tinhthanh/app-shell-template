// node --experimental-strip-types --test src/lib/status-items.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { dropStatusItem, putStatusItem, useStatusItems } from "./status-items.ts";

test("items sit by their order, one per id, and go when dropped", () => {
  putStatusItem({ id: "jobs", label: "2 running", order: 20 });
  putStatusItem({ id: "offline", label: "Offline", order: 0, tone: "warning" });
  putStatusItem({ id: "jobs", label: "1 running", order: 20 });
  assert.deepEqual(
    useStatusItems.getState().items.map((i) => `${i.id}:${i.label}`),
    ["offline:Offline", "jobs:1 running"],
  );
  dropStatusItem("offline");
  dropStatusItem("jobs");
  assert.deepEqual(useStatusItems.getState().items, []);
});
