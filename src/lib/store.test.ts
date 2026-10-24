// node --experimental-strip-types --test src/lib/store.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { closeSettings, openSettings, useStore } from "./store.ts";

test("leaving Settings goes back to the view it was opened from, with its filters", () => {
  useStore.getState().setView({ kind: "projects", status: "paused" });
  openSettings("appearance");
  openSettings("about");
  assert.equal(useStore.getState().view.kind, "settings");
  closeSettings();
  assert.deepEqual(useStore.getState().view, { kind: "projects", status: "paused" });
});
