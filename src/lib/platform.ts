// Which platform the keys are for: ⌘ on a Mac, Ctrl elsewhere, from the
// browser. Key hints are written as a Mac shows them (⌘K) and rewritten
// with Ctrl, Alt and Shift elsewhere (Ctrl+K). ?platform=linux or
// ?platform=mac forces one, for screenshots and tests.

const forced = (() => {
  try {
    return new URLSearchParams(location.search).get("platform");
  } catch {
    return null;
  }
})();

const nav = typeof navigator === "undefined" ? "" : `${navigator.platform} ${navigator.userAgent}`;

// The page's writing direction: ?dir=rtl for a right-to-left language, else
// the document's own (index.html). Every width-wise style is logical
// (start/end), so the layout mirrors on its own; the resize handle flips
// its drag and arrows.
const dir = (() => {
  try {
    return new URLSearchParams(location.search).get("dir");
  } catch {
    return null;
  }
})();
if (typeof document !== "undefined" && (dir === "rtl" || dir === "ltr")) document.documentElement.dir = dir;

export const IS_MAC = forced ? forced === "mac" : /Mac|iPhone|iPad/.test(nav);
export const IS_LINUX = !IS_MAC;

// The key that stands in for ⌘: ⌘ on a Mac, Ctrl everywhere else.
export const modKey = (e: { metaKey: boolean; ctrlKey: boolean }): boolean => (IS_MAC ? e.metaKey : e.ctrlKey);

const NAMES: Record<string, string> = { "⌃": "Ctrl", "⌘": "Ctrl", "⌥": "Alt", "⇧": "Shift" };
const ORDER = ["Ctrl", "Alt", "Shift"];
const KEYS: Record<string, string> = { "↵": "Enter", "⇥": "Tab", "⌫": "Backspace" };

// platformKeys writes a key hint for this platform: as it is on a Mac
// ("⌘⇧D"), and with Ctrl, Alt and Shift elsewhere ("Ctrl+Shift+D").
export function platformKeys(s: string, mac = IS_MAC): string {
  if (mac || !/[⌃⌘⌥⇧]/.test(s)) return s;
  return s.replace(/([⌃⌘⌥⇧]+)-click/g, (_, m: string) => `${names(m).join("+")}-click`).replace(/([⌃⌘⌥⇧]+) ?([^\s⌃⌘⌥⇧]+)/g, (_, m: string, key: string) => [...names(m), KEYS[key] ?? key].join("+"));
}

function names(mods: string): string[] {
  const out = new Set([...mods].map((c) => NAMES[c]).filter(Boolean));
  return ORDER.filter((n) => out.has(n));
}
