import { t } from "@/lib/i18n";
import type { ShortcutId } from "@/lib/keys";
import table from "@/lib/shortcuts.json";

// The app's keyboard shortcuts, from shortcuts.json: the one table the
// Keyboard shortcuts sheet, Settings › Shortcuts and the palette's key hints
// (keysFor) read. The key handler (hooks/use-shortcuts.ts) matches a press
// through lib/keys.ts (shortcutFor), whose ids are the table's. What people
// see of one (its name, its group's) is in the language in use, from
// lib/messages/settings.ts by id.

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

// shortcutName is what a list of shortcuts calls one, in the language in use.
// keys.test.ts holds the table's ids to ShortcutId, and the template's
// type holds each to a word in lib/messages/settings.ts.
export const shortcutName = (s: Shortcut) => t(`settings.shortcut.${s.id as ShortcutId}`);

// groupName is a group's heading, in the language in use.
export const groupName = (g: ShortcutGroup) => t(`settings.shortcutGroup.${g}`);

// keysFor is the keys of a shortcut, for a hint to show.
export const keysFor = (id: string) => SHORTCUTS.find((s) => s.id === id)?.keys;
