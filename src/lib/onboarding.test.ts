// node --experimental-strip-types --test src/lib/onboarding.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { dismissOnboarding, markStep } from "./onboarding.ts";
import { usePrefs } from "./prefs.ts";
import { useStore } from "./store.ts";

test("each step ticks itself when the person does it, once", () => {
  useStore.getState().setView({ kind: "projects", id: "p-shop" });
  useStore.getState().setPaletteOpen(true);
  useStore.getState().setPaletteOpen(false);
  useStore.getState().setPaletteOpen(true);
  assert.deepEqual(usePrefs.getState().onboarding.done, ["open-record", "palette"]);
  useStore.getState().setTheme("paper");
  markStep("theme");
  assert.deepEqual(usePrefs.getState().onboarding.done, ["open-record", "palette", "theme"]);
});

test("put away, the list stays away", () => {
  dismissOnboarding();
  assert.equal(usePrefs.getState().onboarding.dismissed, true);
});
