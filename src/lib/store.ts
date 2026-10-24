import { create } from "zustand";

import { hashToView, viewToHash } from "./routes.ts";
import { load, save } from "./storage.ts";
import type { ProjectStatus } from "./types.ts";

// The app's state that isn't a preference (lib/prefs.ts) and isn't data
// from the API (lib/api.ts, read where it is shown with lib/resource.ts):
// which view shows, which theme, and what's open over them.

// The main area shows one of the app's views. Adding a kind: AGENTS.md ›
// Adding things (or the add-view skill); the compiler and check:views
// refuse a half-wired one.
// Projects carries its list's filters, so they survive a reload, the back
// button and a shared link; id opens one project, over the same filters.
export type View =
  | { kind: "home" }
  | { kind: "projects"; id?: string; q?: string; status?: ProjectStatus; tags?: string[]; sort?: string }
  | { kind: "kit"; section?: string }
  | { kind: "settings"; section?: SettingsSectionId };

export type SettingsSectionId = "general" | "appearance" | "shortcuts" | "about";

export type ViewKind = View["kind"];

// assertNever is the default of a switch over View or a ShortcutId: adding
// a kind without handling it fails to compile.
export function assertNever(x: never): never {
  throw new Error(`unhandled ${JSON.stringify(x)}`);
}

interface State {
  view: View;
  themeId: string;
  paletteOpen: boolean;
}

interface Actions {
  // replace: the address changes without a history entry (typing a filter).
  setView(view: View, opts?: { replace?: boolean }): void;
  setTheme(id: string): void;
  setPaletteOpen(open: boolean): void;
}

// What is remembered across launches, apart from prefs.
const persisted = load<{ themeId?: string }>("app.ui", {});

export const useStore = create<State & Actions>()((set) => ({
  // The view the URL's hash names (lib/routes.ts), else Home.
  view: hashToView(typeof location === "undefined" ? "" : location.hash),
  // The system's light or dark until a theme is picked (Settings › Appearance).
  themeId: persisted.themeId ?? "system",
  paletteOpen: false,

  setView: (view, opts) => {
    // The hash follows the view (so reload, the back button and links work);
    // popstate below does the reverse.
    if (typeof window !== "undefined") {
      const hash = viewToHash(view);
      const url = hash || location.pathname + location.search;
      if (location.hash !== hash) {
        if (opts?.replace) history.replaceState(null, "", url);
        else history.pushState(null, "", url);
      }
    }
    set({ view });
  },
  setTheme: (themeId) => set({ themeId }),
  setPaletteOpen: (paletteOpen) => {
    // Where the keyboard was, to put it back when the palette closes.
    if (paletteOpen && typeof document !== "undefined") paletteOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    set({ paletteOpen });
  },
}));

let paletteOpener: HTMLElement | null = null;
// paletteOpenedFrom is the element that had the keyboard when the palette opened.
export const paletteOpenedFrom = (): HTMLElement | null => paletteOpener;

useStore.subscribe((s, prev) => {
  if (s.themeId !== prev.themeId) save("app.ui", { themeId: s.themeId });
});

// The back button, or an edited address, changes the view (setView does
// the reverse).
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const view = hashToView(location.hash);
    if (viewToHash(useStore.getState().view) !== viewToHash(view)) useStore.setState({ view });
  });
}

// openSettings shows Settings, on a section when given one.
export function openSettings(section?: SettingsSectionId) {
  useStore.getState().setView({ kind: "settings", section });
}

// Settings is a page of its own, so leaving it goes back to wherever it was
// opened from: the view before it, however it was opened (the sidebar, ⌘,,
// a link). Home when it was the first thing opened.
let beforeSettings: View = { kind: "home" };
useStore.subscribe((s, prev) => {
  if (s.view.kind === "settings" && prev.view.kind !== "settings") beforeSettings = prev.view;
});

// closeSettings goes back to the view Settings was opened from.
export function closeSettings() {
  useStore.getState().setView(beforeSettings);
}
