import { usePrefs } from "@/lib/prefs";

// Density (Settings › Appearance) sizes rows everywhere through the CSS
// variables in index.css (h-row, py-row-pad, gap-row-gap, h-side-row).
// Something drawn in pixels (a canvas, an SVG per row) reads its row height
// from here instead.
const ROW_PX = { compact: 36, comfortable: 44 } as const;

export function useDensity() {
  return usePrefs((p) => p.density);
}

export function useRowHeight(): number {
  return ROW_PX[useDensity()];
}
