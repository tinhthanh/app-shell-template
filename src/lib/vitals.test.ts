// node --experimental-strip-types --test src/lib/vitals.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { rate, type VitalEntry, watchVitals } from "./vitals.ts";

test("each vital is rated at web.dev's lines", () => {
  assert.equal(rate("lcp", 2500), "good");
  assert.equal(rate("lcp", 3000), "needs-improvement");
  assert.equal(rate("lcp", 4001), "poor");
  assert.equal(rate("cls", 0.05), "good");
  assert.equal(rate("inp", 600), "poor");
});

test("the ratings go once, when the page is first hidden: the last paint, the shifts not caused by input, the slowest interaction", () => {
  const takers = new Map<string, (e: VitalEntry[]) => void>();
  let hide: () => void = () => {};
  const sent: unknown[] = [];
  watchVitals(
    (type, take) => void takers.set(type, take),
    (fn) => {
      hide = fn;
    },
    (r) => sent.push(r),
  );
  const at = (entryType: string, more: Partial<VitalEntry>): VitalEntry => ({ entryType, startTime: 0, duration: 0, ...more });
  takers.get("largest-contentful-paint")?.([at("largest-contentful-paint", { startTime: 1200 }), at("largest-contentful-paint", { startTime: 3100 })]);
  takers.get("layout-shift")?.([at("layout-shift", { value: 0.08 }), at("layout-shift", { value: 0.5, hadRecentInput: true }), at("layout-shift", { value: 0.05 })]);
  takers.get("event")?.([at("event", { duration: 900 }), at("event", { duration: 120, interactionId: 7 })]);
  hide();
  hide();
  assert.deepEqual(sent, [{ lcp: "needs-improvement", cls: "needs-improvement", inp: "good" }]);
});

test("a page that measured nothing sends nothing", () => {
  let hide: () => void = () => {};
  const sent: unknown[] = [];
  watchVitals(
    () => {},
    (fn) => {
      hide = fn;
    },
    (r) => sent.push(r),
  );
  hide();
  assert.deepEqual(sent, []);
});
