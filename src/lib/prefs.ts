import { create } from "zustand";

// Relative imports: prefs.test.ts runs this in node.
import { LANGUAGE_IDS, type LanguageChoice, resolveLanguage, setLanguage } from "./i18n.ts";
import { isRecentItem, MAX_RECENT, type RecentItem } from "./recent.ts";
import { clampWidth, SIDEBAR_DEFAULT } from "./sidebar-width.ts";
import { load, save } from "./storage.ts";

// The person's preferences, kept in this browser (localStorage, "app.prefs").
// Saved whole on every change, and brought up to date by migratePrefs when
// a default changes.

export interface Prefs {
  density: "compact" | "comfortable";
  // The interface's text size in px; everything sized in rem follows.
  uiFontSize: number;
  // The sheet folded away, leaving the rail (⌘\).
  sidebarCollapsed: boolean;
  // How wide the open sidebar is, dragged by its edge (lib/sidebar-width).
  sidebarWidth: number;
  // The themes "Match system" uses by day and when the OS is dark.
  systemThemes: { light: string; dark: string };
  // The newest version whose What's new was shown, or that was running when
  // there was nothing to show (lib/whats-new.ts).
  whatsNewSeen: string | null;
  // The language the app speaks: one of lib/i18n.ts's, or the system's.
  language: LanguageChoice;
  // The records opened last, newest first, for the sidebar's Recent (lib/recent.ts).
  recent: RecentItem[];
  // The sidebar's sections folded away, by id (Recent).
  folded: string[];
  // The workspace on show (lib/workspace.ts): null until the list says which.
  workspace: string | null;
  // The places pinned to the rail, in order; the rest are under its "…" (components/sidebar-rail.tsx); null is every top place.
  railPlaces: string[] | null;
  // Home's getting-started list: the steps taken, and whether it was put away (lib/onboarding.ts).
  onboarding: { done: string[]; dismissed: boolean };
  // Usage events may go to the host's analytics (lib/analytics.ts): only when the person says so.
  shareUsage: boolean;
}

export const DEFAULTS: Prefs = {
  density: "compact",
  uiFontSize: 13,
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT,
  systemThemes: { light: "default-light", dark: "default-dark" },
  whatsNewSeen: null,
  language: "system",
  recent: [],
  folded: [],
  workspace: null,
  railPlaces: null,
  onboarding: { done: [], dismissed: false },
  shareUsage: false,
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

// fromSaved is the prefs a save comes to: the defaults, what was saved over
// them, and each field held to its shape (a save from an older build, or
// another tab's, is never trusted as it is).
export function fromSaved(saved: Saved): Prefs {
  const { version: _version, ...savedPrefs } = saved;
  return {
    ...DEFAULTS,
    ...savedPrefs,
    systemThemes: { ...DEFAULTS.systemThemes, ...saved.systemThemes },
    sidebarWidth: clampWidth(saved.sidebarWidth ?? SIDEBAR_DEFAULT),
    // A language this build has no words for (or no longer has) is the system's.
    language: saved.language === "system" || LANGUAGE_IDS.includes(saved.language as never) ? (saved.language as LanguageChoice) : "system",
    // A save from before these, or one that isn't their shape, starts them afresh.
    recent: Array.isArray(saved.recent) ? saved.recent.filter(isRecentItem).slice(0, MAX_RECENT) : [],
    workspace: typeof saved.workspace === "string" ? saved.workspace : null,
    railPlaces: Array.isArray(saved.railPlaces) ? saved.railPlaces.filter((p): p is string => typeof p === "string") : null,
    folded: Array.isArray(saved.folded) ? saved.folded.filter((f): f is string => typeof f === "string") : [],
    // Only a yes the person gave: anything else is no.
    shareUsage: saved.shareUsage === true,
    onboarding: { done: Array.isArray(saved.onboarding?.done) ? saved.onboarding.done.filter((d): d is string => typeof d === "string") : [], dismissed: saved.onboarding?.dismissed === true },
  };
}

export const usePrefs = create<Prefs>()(() => fromSaved(saved));

// Another tab's change is taken as it is, not saved back (which would echo).
let fromOtherTab = false;
usePrefs.subscribe((p) => fromOtherTab || save("app.prefs", { ...p, version: PREFS_VERSION }));

// takeOtherTabsPrefs applies what another tab saved (lib/tabs.ts hears it
// as a storage event), so a setting changed there is the setting here.
export function takeOtherTabsPrefs(raw: string) {
  let next: Prefs;
  try {
    next = fromSaved(migratePrefs(JSON.parse(raw) as Saved));
  } catch {
    return;
  }
  fromOtherTab = true;
  try {
    usePrefs.setState(next, true);
  } finally {
    fromOtherTab = false;
  }
}
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

// applyLanguage puts the chosen language in use (lib/i18n.ts) and on the
// page, so a screen reader reads it right. The app redraws on a change
// (App.tsx keys its frame on the language).
function applyLanguage(p: Prefs) {
  const l = resolveLanguage(p.language, typeof navigator === "undefined" ? [] : navigator.languages);
  setLanguage(l);
  if (typeof document !== "undefined") document.documentElement.lang = l;
}
applyLanguage(usePrefs.getState());
usePrefs.subscribe((p, prev) => p.language !== prev.language && applyLanguage(p));

export function setPrefs(patch: Partial<Prefs>) {
  usePrefs.setState(patch);
}

// resetPrefs puts every preference back to its default.
export function resetPrefs() {
  usePrefs.setState({ ...DEFAULTS });
}
