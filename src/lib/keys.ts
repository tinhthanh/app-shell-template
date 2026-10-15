// Which shortcut a key press is (lib/shortcuts.json), from the event's
// fields alone: pure, so keys.test.ts runs it in node. The handler
// (hooks/use-shortcuts.ts) calls it with the platform's modifier.

export interface KeyPress {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

// The ids in shortcuts.json, as a type, so every one is handled
// (hooks/use-shortcuts.ts) and reachable (keys.test.ts).
export const SHORTCUT_IDS = ["palette", "place", "settings", "sidebar", "zoom-in", "zoom-out", "zoom-reset", "shortcuts"] as const;
export type ShortcutId = (typeof SHORTCUT_IDS)[number];

export interface Hit {
  id: ShortcutId;
  // The place's number (place).
  arg?: number;
}

// shortcutFor is the shortcut a press means, or undefined when it is not
// one: then the key goes on to the page. mac says whether ⌘ or Ctrl is
// the modifier. Add a line here when you add a shortcut to shortcuts.json.
export function shortcutFor(e: KeyPress, mac: boolean): Hit | undefined {
  if (!(mac ? e.metaKey : e.ctrlKey) || e.altKey) return undefined;
  const k = e.key;
  // Zoom first: ⌘+ is ⌘⇧= on most keyboards, so Shift is part of it.
  if (k === "=" || k === "+" || e.code === "NumpadAdd") return { id: "zoom-in" };
  if (k === "-" || k === "_" || k === "−" || e.code === "NumpadSubtract") return { id: "zoom-out" };
  // A Shift shortcut (⌘⇧X) goes above this line, compared as k.toLowerCase():
  // Shift gives "X", and a Mac's ⌘ may leave it "x". Stay clear of the
  // browser's own (⌘⇧T, ⌘W, ⌘N, ⌘T): a page never sees them.
  if (e.shiftKey) return undefined;
  if (k === "k") return { id: "palette" };
  if (k === ",") return { id: "settings" };
  if (k === "\\") return { id: "sidebar" };
  if (k === "/") return { id: "shortcuts" };
  if (k === "0") return { id: "zoom-reset" };
  if (/^[1-9]$/.test(k)) return { id: "place", arg: Number(k) };
  return undefined;
}
