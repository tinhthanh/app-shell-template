// node --test scripts/ci-steps.test.mjs (pnpm test)
// CI runs every check `pnpm check` does: a check added to one and not the
// other would pass a pull request that a push from a laptop would refuse.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");

test("every check pnpm check runs is a step of CI's app job", () => {
  const check = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts.check;
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const checks = [...check.matchAll(/pnpm (check:[a-z]+|typecheck|lint|test|build)\b/g)].map((m) => m[1]);
  assert.ok(checks.length > 5, "pnpm check names its checks");
  assert.deepEqual(
    checks.filter((c) => !new RegExp(`run: pnpm ${c}\\b`).test(ci)),
    [],
  );
});
