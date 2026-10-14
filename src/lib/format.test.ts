// node --experimental-strip-types --test src/lib/format.test.ts (pnpm test)
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { ago } from "./format.ts";

test("ago reads a time in a word or two, at each boundary", () => {
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-14T12:00:00Z") });
  const at = (s: number) => new Date(Date.now() - s * 1000).toISOString();
  assert.equal(ago(at(0)), "just now");
  assert.equal(ago(at(59)), "just now");
  assert.equal(ago(at(60)), "1m ago");
  assert.equal(ago(at(3599)), "59m ago");
  assert.equal(ago(at(3600)), "1h ago");
  assert.equal(ago(at(86399)), "23h ago");
  assert.equal(ago(at(86400)), "1d ago");
  // A time in the future (a clock ahead) is "just now", never negative.
  assert.equal(ago(at(-120)), "just now");
  assert.equal(ago(undefined), "");
  mock.timers.reset();
});
