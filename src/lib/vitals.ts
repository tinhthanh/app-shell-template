// How the app feels where people use it: Largest Contentful Paint (the main
// content drawn), Cumulative Layout Shift (things jumping), Interaction to
// Next Paint (a click to its answer), each rated as web.dev rates them and
// sent once, when the page is first hidden, as a usage event (lib/analytics.ts:
// only with the person's yes, and only the ratings and the view's kind, never
// a time that could tell one machine from another). main.tsx starts it; pure
// apart from what it is given, so vitals.test.ts runs it.

export type Vital = "lcp" | "cls" | "inp";
export type Rating = "good" | "needs-improvement" | "poor";

// Where "good" ends and "poor" begins (ms, or the shift score for cls).
export const THRESHOLDS: Record<Vital, [number, number]> = { lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500] };

export function rate(vital: Vital, value: number): Rating {
  const [good, poor] = THRESHOLDS[vital];
  return value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";
}

export interface VitalEntry {
  entryType: string;
  startTime: number;
  duration: number;
  // A layout shift's score, and whether input just before it caused it.
  value?: number;
  hadRecentInput?: boolean;
  // An event's interaction (0 for none: a hover, not a click or a key).
  interactionId?: number;
}

// watchVitals collects the three from observe (a PerformanceObserver in the
// app) and reports their ratings once, the first time onHidden fires; a
// vital the browser never measured is left out.
export function watchVitals(observe: (type: string, take: (entries: VitalEntry[]) => void) => void, onHidden: (fn: () => void) => void, report: (ratings: Partial<Record<Vital, Rating>>) => void) {
  let lcp: number | undefined;
  let cls: number | undefined;
  let inp: number | undefined;
  observe("largest-contentful-paint", (entries) => {
    const last = entries.at(-1);
    if (last) lcp = last.startTime;
  });
  observe("layout-shift", (entries) => {
    for (const e of entries) if (!e.hadRecentInput) cls = (cls ?? 0) + (e.value ?? 0);
  });
  observe("event", (entries) => {
    for (const e of entries) if (e.interactionId) inp = Math.max(inp ?? 0, e.duration);
  });
  let sent = false;
  onHidden(() => {
    if (sent) return;
    sent = true;
    const ratings: Partial<Record<Vital, Rating>> = {};
    if (lcp !== undefined) ratings.lcp = rate("lcp", lcp);
    if (cls !== undefined) ratings.cls = rate("cls", cls);
    if (inp !== undefined) ratings.inp = rate("inp", inp);
    if (Object.keys(ratings).length) report(ratings);
  });
}
