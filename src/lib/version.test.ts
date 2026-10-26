// node --experimental-strip-types --test src/lib/version.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { compareVersions } from "./version.ts";

test("versions compare as numbers, and one that isn't numbers sorts first", () => {
  assert.equal(compareVersions("0.10.0", "0.9.0"), 1);
  assert.equal(compareVersions("0.2.0", "0.2.0"), 0);
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
  assert.equal(compareVersions("dev", "0.1.0"), -1);
});
