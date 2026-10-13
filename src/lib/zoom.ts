import { create } from "zustand";

import { setPrefs, usePrefs } from "@/lib/prefs";

// Zoom (⌘+, ⌘−, ⌘0) makes the interface's text bigger or smaller: the
// uiFontSize pref, which everything sized in rem follows (lib/prefs.ts).
// The HUD (components/zoom-hud.tsx) shows the size for a moment.

export const UI_SIZES = { min: 11, max: 20, default: 13 };

export type ZoomStep = 1 | -1 | 0;

// What the HUD shows: the size just set, and when, so a second press
// restarts its timer.
export const useZoomHud = create<{ size?: number; at: number }>()(() => ({ at: 0 }));

// nextSize is the size one step from size, inside the range; 0 resets.
export function nextSize(size: number, step: ZoomStep, r: { min: number; max: number; default: number } = UI_SIZES): number {
  if (step === 0) return r.default;
  return Math.min(r.max, Math.max(r.min, Math.round(size) + step));
}

// zoom takes one step and shows where it landed.
export function zoom(step: ZoomStep) {
  const p = usePrefs.getState();
  const size = nextSize(p.uiFontSize, step);
  if (size !== p.uiFontSize) setPrefs({ uiFontSize: size });
  useZoomHud.setState({ size, at: performance.now() });
}
