import table from "@/lib/shortcuts.json";

// The app's keyboard shortcuts, from shortcuts.json: the one table the key
// handler (hooks/use-shortcuts), the Keyboard shortcuts sheet and Settings
// › Shortcuts all read.

export type ShortcutGroup = "View" | "Go" | "Help";

export interface Shortcut {
  id: string;
  group: ShortcutGroup;
  // The item's name; with count, {n} is each item's number.
  label: string;
  keys: string;
  count?: number;
  sep?: boolean;
  // How a list names it, when that differs from the label.
  what?: string;
}

export const SHORTCUTS = table.shortcuts as Shortcut[];

// The order the lists follow.
export const SHORTCUT_GROUPS: ShortcutGroup[] = ["Go", "View", "Help"];

// describe is what a list of shortcuts calls one.
export const describe = (s: Shortcut) => s.what ?? s.label.replace(/…$/, "");

// keysFor is the keys of a shortcut, for a hint to show.
export const keysFor = (id: string) => SHORTCUTS.find((s) => s.id === id)?.keys;
