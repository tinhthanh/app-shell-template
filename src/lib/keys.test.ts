// node --experimental-strip-types --test src/lib/keys.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHORTCUT_IDS, type ShortcutId, shortcutFor } from "./keys.ts";
import table from "./shortcuts.json" with { type: "json" };

const press = (key: string, mods: Partial<{ meta: boolean; ctrl: boolean; alt: boolean; shift: boolean; code: string }> = {}) => ({
  key,
  code: mods.code,
  metaKey: !!mods.meta,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
});

test("⌘ on a Mac and Ctrl elsewhere are the modifier; the other does nothing", () => {
  assert.deepEqual(shortcutFor(press("k", { meta: true }), true), { id: "palette" });
  assert.equal(shortcutFor(press("k", { ctrl: true }), true), undefined);
  assert.deepEqual(shortcutFor(press("k", { ctrl: true }), false), { id: "palette" });
  assert.equal(shortcutFor(press("k", { meta: true }), false), undefined);
  assert.equal(shortcutFor(press("k"), true), undefined);
  // Alt is never part of a shortcut.
  assert.equal(shortcutFor(press("k", { meta: true, alt: true }), true), undefined);
});

test("⌘+ works as ⌘⇧= and from the keypad; ⌘− as -, _ or the keypad; ⌘0 resets", () => {
  assert.deepEqual(shortcutFor(press("=", { meta: true }), true), { id: "zoom-in" });
  assert.deepEqual(shortcutFor(press("+", { meta: true, shift: true }), true), { id: "zoom-in" });
  assert.deepEqual(shortcutFor(press("+", { meta: true, code: "NumpadAdd" }), true), { id: "zoom-in" });
  assert.deepEqual(shortcutFor(press("-", { meta: true }), true), { id: "zoom-out" });
  assert.deepEqual(shortcutFor(press("_", { meta: true, shift: true }), true), { id: "zoom-out" });
  assert.deepEqual(shortcutFor(press("-", { meta: true, code: "NumpadSubtract" }), true), { id: "zoom-out" });
  assert.deepEqual(shortcutFor(press("0", { meta: true }), true), { id: "zoom-reset" });
});

test("⌘1–9 carry the place's number; Shift with a letter is not a shortcut", () => {
  assert.deepEqual(shortcutFor(press("1", { meta: true }), true), { id: "place", arg: 1 });
  assert.deepEqual(shortcutFor(press("9", { meta: true }), true), { id: "place", arg: 9 });
  assert.equal(shortcutFor(press("K", { meta: true, shift: true }), true), undefined);
  assert.equal(shortcutFor(press("x", { meta: true }), true), undefined);
});

test("shortcuts.json and SHORTCUT_IDS name the same shortcuts", () => {
  assert.deepEqual(new Set(table.shortcuts.map((s) => s.id)), new Set(SHORTCUT_IDS));
});

test("every shortcut in shortcuts.json has a key press that reaches it", () => {
  const presses = [
    press("k", { meta: true }),
    press(",", { meta: true }),
    press("\\", { meta: true }),
    press("/", { meta: true }),
    press("=", { meta: true }),
    press("-", { meta: true }),
    press("0", { meta: true }),
    press("1", { meta: true }),
  ];
  const reached = new Set(presses.map((p) => shortcutFor(p, true)?.id));
  for (const s of table.shortcuts) assert.ok(reached.has(s.id as ShortcutId), `${s.id} (${s.keys}) has no key press`);
});
