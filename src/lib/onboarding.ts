// Home's getting-started list: a few first things to do, each ticked as the
// person does it (not as they read about it), and put away for good with
// its close button. The steps are a product's own; these show the app's
// pieces. State lives in prefs (onboarding), so it survives a reload. After
// Shipyard's "Try the demo" (github.com/cosscom/shipyard, MIT). Pure apart
// from the stores it listens to, so onboarding.test.ts runs it in node.
import type { Key } from "./i18n.ts";
import { setPrefs, usePrefs } from "./prefs.ts";
import { useStore } from "./store.ts";

export const STEPS = [
  { id: "open-record", title: "shell.onboarding.openRecord" },
  { id: "palette", title: "shell.onboarding.palette" },
  { id: "theme", title: "shell.onboarding.theme" },
] as const satisfies readonly { id: string; title: Key }[];

export type StepId = (typeof STEPS)[number]["id"];

// markStep ticks a step, once.
export function markStep(id: StepId) {
  const o = usePrefs.getState().onboarding;
  if (o.done.includes(id)) return;
  setPrefs({ onboarding: { ...o, done: [...o.done, id] } });
}

export function dismissOnboarding() {
  setPrefs({ onboarding: { ...usePrefs.getState().onboarding, dismissed: true } });
}

// The steps tick themselves from what the person does: a record opened, the
// palette opened, a theme picked.
useStore.subscribe((s, prev) => {
  if (s.view.kind === "projects" && s.view.id && s.view.id !== (prev.view.kind === "projects" ? prev.view.id : undefined)) markStep("open-record");
  if (s.paletteOpen && !prev.paletteOpen) markStep("palette");
  if (s.themeId !== prev.themeId) markStep("theme");
});
