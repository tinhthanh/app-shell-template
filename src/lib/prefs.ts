import { create } from "zustand";

// Relative imports: prefs.test.ts runs this in node.
import { clampWidth, SIDEBAR_DEFAULT } from "./sidebar-width.ts";
import { load, save } from "./storage.ts";

// The person's preferences, kept in this browser (localStorage, "app.prefs").
// Saved whole on every change, and brought up to date by migratePrefs when
// a default changes.

export interface Prefs {
  density: "compact" | "comfortable";
  // The interface's text size in px; everything sized in rem follows.
  uiFontSize: number;
  // The sidebar folded to a rail of icons (⌘\).
  sidebarCollapsed: boolean;
  // How wide the open sidebar is, dragged by its edge (lib/sidebar-width).
  sidebarWidth: number;
  // The themes "Match system" uses by day and when the OS is dark.
  systemThemes: { light: string; dark: string };
  // The newest version whose What's new was shown, or that was running when
  // there was nothing to show (lib/whats-new.ts).
  whatsNewSeen: string | null;
}

export const DEFAULTS: Prefs = {
  density: "compact",
  uiFontSize: 13,
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT,
  systemThemes: { light: "default-light", dark: "default-dark" },
  whatsNewSeen: null,
};

// PREFS_VERSION counts changes of default that saved prefs are moved to
// once. Bump it and add a step to migratePrefs when a default changes in a
// way an old saved value shouldn't override.
export const PREFS_VERSION = 1;

export type Saved = Partial<Prefs> & { version?: number };

// migratePrefs brings prefs saved by an older build up to date. Pure, so
// prefs.test.ts runs it in node.
export function migratePrefs(saved: Saved): Saved {
  const out: Saved = { ...saved };
  // Example step, for when version 2 comes:
  // if ((saved.version ?? 1) < 2) out.something = newDefault;
  out.version = PREFS_VERSION;
  return out;
}

const stored = load<Saved>("app.prefs", {});
// Nothing saved before: a first run (What's new shows nothing then).
export const firstRun = !Object.keys(stored).length;
const saved = migratePrefs(stored);
const { version: _version, ...savedPrefs } = saved;

export const usePrefs = create<Prefs>()(() => ({
  ...DEFAULTS,
  ...savedPrefs,
  systemThemes: { ...DEFAULTS.systemThemes, ...saved.systemThemes },
  sidebarWidth: clampWidth(saved.sidebarWidth ?? SIDEBAR_DEFAULT),
}));

usePrefs.subscribe((p) => save("app.prefs", { ...p, version: PREFS_VERSION }));
// The migration is kept at once, not only on the next change.
save("app.prefs", { ...usePrefs.getState(), version: PREFS_VERSION });

// The interface's text size scales everything sized in rem, from 13px as
// designed; density is left to styles that read data-density (index.css).
function applyUiPrefs(p: Prefs) {
  const root = document.documentElement;
  root.style.fontSize = p.uiFontSize === 13 ? "" : `${(16 * p.uiFontSize) / 13}px`;
  root.dataset.density = p.density;
  // The sidebar reads its width from here; a drag sets it as it goes
  // (components/sidebar-resize-handle.tsx) and saves it here at the end.
  root.style.setProperty("--sidebar-w", `${p.sidebarWidth}px`);
}
if (typeof document !== "undefined") {
  applyUiPrefs(usePrefs.getState());
  usePrefs.subscribe((p, prev) => {
    if (p.uiFontSize !== prev.uiFontSize || p.density !== prev.density || p.sidebarWidth !== prev.sidebarWidth) applyUiPrefs(p);
  });
}

export function setPrefs(patch: Partial<Prefs>) {
  usePrefs.setState(patch);
}

// resetPrefs puts every preference back to its default.
export function resetPrefs() {
  usePrefs.setState({ ...DEFAULTS });
}
