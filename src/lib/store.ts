import { create } from "zustand";

import { hashToView, viewToHash } from "@/lib/routes";
import { load, save } from "@/lib/storage";

// The app's state that isn't a preference (lib/prefs.ts) and isn't data
// from the API (lib/api.ts, read where it is shown with lib/resource.ts):
// which view shows, which theme, and what's open over them.

// The main area shows one of the app's views. Add a kind here, a lazy view
// in App.tsx, a place in lib/nav.tsx and its address in lib/routes.ts.
export type View = { kind: "home" } | { kind: "projects"; id?: string } | { kind: "kit"; section?: string } | { kind: "settings"; section?: SettingsSectionId };

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
  setView(view: View): void;
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

  setView: (view) => set({ view }),
  setTheme: (themeId) => set({ themeId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));

useStore.subscribe((s, prev) => {
  if (s.themeId !== prev.themeId) save("app.ui", { themeId: s.themeId });
});

// The view and the URL's hash follow each other: a view change writes the
// hash (so reload and the back button work, and a view can be linked to),
// and the back button, or an edited address, changes the view.
if (typeof window !== "undefined") {
  useStore.subscribe((s, prev) => {
    if (s.view === prev.view) return;
    const hash = viewToHash(s.view);
    if (location.hash !== hash) history.pushState(null, "", hash || location.pathname + location.search);
  });
  window.addEventListener("popstate", () => {
    const view = hashToView(location.hash);
    if (viewToHash(useStore.getState().view) !== viewToHash(view)) useStore.setState({ view });
  });
}

// openSettings shows Settings, on a section when given one.
export function openSettings(section?: SettingsSectionId) {
  useStore.getState().setView({ kind: "settings", section });
}
