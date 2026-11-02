---
name: add-shortcut
description: Add a keyboard shortcut that the app answers, lists in the Keyboard shortcuts sheet and Settings › Shortcuts, and tests. Use when asked for a hotkey, a key binding or "a shortcut for X".
---

# Add a shortcut

One table, `src/lib/shortcuts.json`, is what the Keyboard shortcuts sheet
and Settings › Shortcuts draw; `src/lib/keys.ts` maps a press to an id in
it; `src/hooks/use-shortcuts.ts` runs the id. `keys.test.ts` fails when a
line in the table has no press that reaches it. "Settings" (⌘,) is the
plainest example to follow.

1. **Pick the keys.** Written for a Mac (`⌘K`); `<Kbd>` shows them as `Ctrl+K` elsewhere. Stay clear of the browser's own: ⌘T, ⌘W, ⌘N, ⌘⇧T, ⌘L, ⌘R, ⌘F, ⌘P, ⌘D. Check the table for a clash.
2. **`src/lib/shortcuts.json`**: a line `{ "id": "…", "group": "Go" | "View" | "Help", "label": "…", "keys": "⌘…" }`. A new group also goes in `ShortcutGroup` and `SHORTCUT_GROUPS` (`src/lib/shortcuts.ts`) and gets a `settings.shortcutGroup.<group>` name.
3. **`src/lib/keys.ts`**: the id in `SHORTCUT_IDS`, and a line in `shortcutFor`. A Shift shortcut (⌘⇧X) goes above the Shift guard and compares `k.toLowerCase()`; below it, Shift is already ruled out.
4. **`src/lib/keys.test.ts`**: its press in the reachability list (`press("x", { meta: true })`, as a Mac sends it; add `shift: true` for a Shift one), and a case of its own if it has a twist (a Shift guard, a key that differs off the Mac).
5. **`src/hooks/use-shortcuts.ts`**: a `case` in `run`. When nothing shows on screen for it (a toggle, a zoom), `announce()` what it did (`src/lib/announce.ts`), so a screen reader hears it.
6. **Its name**: `settings.shortcut.<id>` in English and Vietnamese (`src/lib/messages/settings.ts`; `shortcutName` reads it), and `settings.findWords.shortcuts` if someone would look for it by another word.
7. **The palette**, if it should be found by name: an item in `components/command-palette.tsx` with `shortcut: keysFor("<id>")`, as Keyboard shortcuts has.
8. **`e2e/shell.spec.ts`**: press it with `mod()` from `./fixtures` (`${mod()}+Shift+X`; the page is on Linux unless opened with `params: { platform: "mac" }`) and wait for what it does. One test, named as what the person gets.
9. **`CHANGELOG.md`**: a bullet that names the keys.

Then `pnpm check` and `pnpm test:e2e e2e/shell.spec.ts`.
