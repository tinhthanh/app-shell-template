import { create } from "zustand";

import { load, save } from "@/lib/storage";

// The app's state that isn't a preference (lib/prefs.ts) and isn't data
// from the API (lib/api.ts, read where it is shown with lib/resource.ts):
// which view shows, which theme, and what's open over them.

// The main area shows one of the app's views. Add a kind here, a lazy view
// in App.tsx and a place in lib/nav.tsx.
export type View = { kind: "home" } | { kind: "projects"; id?: string } | { kind: "settings"; section?: SettingsSectionId };

export type SettingsSectionId = "general" | "appearance" | "shortcuts" | "about";

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
  view: { kind: "home" },
  themeId: persisted.themeId ?? "default-dark",
  paletteOpen: false,

  setView: (view) => set({ view }),
  setTheme: (themeId) => set({ themeId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));

useStore.subscribe((s, prev) => {
  if (s.themeId !== prev.themeId) save("app.ui", { themeId: s.themeId });
});

// openSettings shows Settings, on a section when given one.
export function openSettings(section?: SettingsSectionId) {
  useStore.getState().setView({ kind: "settings", section });
}
