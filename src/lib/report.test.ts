// node --experimental-strip-types --test src/lib/report.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { report, setReporter } from "./report.ts";

test("a reporter gets the error and its context, and one that throws is contained", () => {
  const got: unknown[] = [];
  setReporter((e, c) => got.push([e, c]));
  const err = new Error("x");
  report(err, { scope: "Projects" });
  assert.deepEqual(got, [[err, { scope: "Projects" }]]);
  setReporter(() => {
    throw new Error("the reporter is down");
  });
  assert.doesNotThrow(() => report(err));
});
