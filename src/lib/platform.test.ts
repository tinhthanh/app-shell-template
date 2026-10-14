// node --experimental-strip-types --test src/lib/platform.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { platformKeys } from "./platform.ts";

test("a Mac keeps its symbols", () => {
  assert.equal(platformKeys("⌘⇧D", true), "⌘⇧D");
});

test("elsewhere the keys are spelled out, Ctrl first", () => {
  const linux = (s: string) => platformKeys(s, false);
  assert.equal(linux("⌘K"), "Ctrl+K");
  assert.equal(linux("⌘⇧D"), "Ctrl+Shift+D");
  assert.equal(linux("⌘⌥I"), "Ctrl+Alt+I");
  assert.equal(linux("⌃⇧⇥"), "Ctrl+Shift+Tab");
  assert.equal(linux("⌘↵"), "Ctrl+Enter");
  assert.equal(linux("⌘1–9"), "Ctrl+1–9");
  assert.equal(linux("Search (⌘K)"), "Search (Ctrl+K)");
  assert.equal(linux("⌥-click to peek"), "Alt-click to peek");
  assert.equal(linux("⌘+ and ⌘− step it; ⌘0 resets."), "Ctrl++ and Ctrl+− step it; Ctrl+0 resets.");
  assert.equal(linux("F2"), "F2");
  assert.equal(linux("↵"), "↵");
});
