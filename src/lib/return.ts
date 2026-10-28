// What was read goes stale while nobody looks: a window left behind, a
// laptop shut, the network gone. When the person comes back, what is on
// screen is read again, behind what it shows (readAgainOnScreen,
// lib/resource-cache.ts). Back means: the window shown or focused again after
// AWAY_MS or more, the network back, or a timer that fired far later than it
// was set for (the computer slept). Never twice within AWAY_MS. main.tsx
// starts it; pure apart from the window it is given, so return.test.ts runs it.

export const AWAY_MS = 30_000;
// How often the wake check looks, and how late it may be before it counts as sleep.
export const TICK_MS = 15_000;

export interface ReturnTarget {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

// watchReturn calls readAgain when the person comes back to win; doc says
// whether the page is hidden. It returns the way to stop.
export function watchReturn(
  readAgain: () => void,
  win: ReturnTarget & { setInterval(fn: () => void, ms: number): number; clearInterval(id: number): void },
  doc: ReturnTarget & { visibilityState: string },
  now: () => number = Date.now,
): () => void {
  let leftAt: number | undefined;
  let lastRead = now();
  const again = (force = false) => {
    const t = now();
    if (!force && t - lastRead < AWAY_MS) return;
    lastRead = t;
    readAgain();
  };
  const left = () => {
    leftAt ??= now();
  };
  const back = () => {
    const away = leftAt === undefined ? 0 : now() - leftAt;
    leftAt = undefined;
    if (away >= AWAY_MS) again();
  };
  const visibility = () => (doc.visibilityState === "hidden" ? left() : back());
  const online = () => again(true);
  let tickAt = now();
  const tick = win.setInterval(() => {
    const t = now();
    // Far later than set for: the computer slept.
    if (t - tickAt > TICK_MS + AWAY_MS) again();
    tickAt = t;
  }, TICK_MS);
  win.addEventListener("blur", left);
  win.addEventListener("focus", back);
  win.addEventListener("online", online);
  doc.addEventListener("visibilitychange", visibility);
  return () => {
    win.clearInterval(tick);
    win.removeEventListener("blur", left);
    win.removeEventListener("focus", back);
    win.removeEventListener("online", online);
    doc.removeEventListener("visibilitychange", visibility);
  };
}
