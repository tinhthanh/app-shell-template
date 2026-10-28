// node --experimental-strip-types --test src/lib/return.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { AWAY_MS, TICK_MS, watchReturn } from "./return.ts";

// A window, a document and a clock the test moves.
function world() {
  let t = 0;
  const on = new Map<string, () => void>();
  let ticker: () => void = () => {};
  const target = {
    addEventListener: (type: string, fn: () => void) => void on.set(type, fn),
    removeEventListener: (type: string) => void on.delete(type),
  };
  const win = {
    ...target,
    setInterval: (fn: () => void) => {
      ticker = fn;
      return 1;
    },
    clearInterval: () => {
      ticker = () => {};
    },
  };
  const doc = { ...target, visibilityState: "visible" };
  let reads = 0;
  const stop = watchReturn(
    () => reads++,
    win,
    doc,
    () => t,
  );
  return {
    fire: (type: string) => on.get(type)?.(),
    pass: (ms: number) => {
      t += ms;
    },
    tick: () => ticker(),
    hide: (hidden: boolean) => {
      doc.visibilityState = hidden ? "hidden" : "visible";
      on.get("visibilitychange")?.();
    },
    reads: () => reads,
    stop,
    has: (type: string) => on.has(type),
  };
}

test("coming back to the window after a while reads again; a glance away doesn't", () => {
  const w = world();
  w.pass(AWAY_MS);
  w.fire("blur");
  w.pass(5_000);
  w.fire("focus");
  assert.equal(w.reads(), 0);
  w.fire("blur");
  w.pass(AWAY_MS);
  w.fire("focus");
  assert.equal(w.reads(), 1);
});

test("a tab shown again after a while reads again", () => {
  const w = world();
  w.pass(AWAY_MS);
  w.hide(true);
  w.pass(AWAY_MS + 1);
  w.hide(false);
  assert.equal(w.reads(), 1);
});

test("the network back reads again at once; never twice within the wait otherwise", () => {
  const w = world();
  w.fire("online");
  assert.equal(w.reads(), 1);
  w.fire("blur");
  w.pass(AWAY_MS);
  w.fire("focus");
  // Thirty seconds since the online read: this one goes too.
  assert.equal(w.reads(), 2);
  w.fire("blur");
  w.pass(1);
  w.hide(true);
  w.pass(AWAY_MS - 10);
  w.hide(false);
  assert.equal(w.reads(), 2);
});

test("a timer that fires far later than it was set for means the computer slept, and reads again", () => {
  const w = world();
  w.pass(TICK_MS);
  w.tick();
  assert.equal(w.reads(), 0);
  w.pass(10 * 60_000);
  w.tick();
  assert.equal(w.reads(), 1);
});

test("stopping takes every listener off", () => {
  const w = world();
  w.stop();
  for (const type of ["blur", "focus", "online", "visibilitychange"]) assert.equal(w.has(type), false, type);
});
