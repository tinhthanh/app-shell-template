// node --experimental-strip-types --test src/lib/session-end.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { sessionTimes, WARN_BEFORE_MS } from "./session-end.ts";

const now = Date.parse("2026-10-26T10:00:00Z");

test("the warning comes two minutes before the end", () => {
  assert.deepEqual(sessionTimes("2026-10-26T10:05:00Z", now), { warnIn: 5 * 60_000 - WARN_BEFORE_MS, endIn: 5 * 60_000, final: true });
});

test("a session closer than the warning is warned at once, and one past is ended at once", () => {
  assert.deepEqual(sessionTimes("2026-10-26T10:01:00Z", now), { warnIn: 0, endIn: 60_000, final: true });
  assert.deepEqual(sessionTimes("2026-10-26T09:00:00Z", now), { warnIn: 0, endIn: 0, final: true });
});

test("a session that doesn't end, or a date that can't be read, has no times", () => {
  assert.equal(sessionTimes(undefined, now), undefined);
  assert.equal(sessionTimes("soon", now), undefined);
});

test("a session further off than a timer waits is only looked at again then: no warning, no end", () => {
  assert.deepEqual(sessionTimes("2027-10-26T10:00:00Z", now), { warnIn: Number.POSITIVE_INFINITY, endIn: 2 ** 31 - 1, final: false });
});
