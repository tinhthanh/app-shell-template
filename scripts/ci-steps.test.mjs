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
  // The app job's own steps, one whole line each: "pnpm test" mustn't be
  // found inside "pnpm test:coverage", nor in a comment or another job.
  const app = /^ {2}app:\n([\s\S]*?)(?=^ {2}\w[\w-]*:\n|(?![\s\S]))/m.exec(ci)?.[1] ?? "";
  const steps = new Set([...app.matchAll(/^\s*- run: pnpm ([\w:]+)\s*$/gm)].map((m) => m[1]));
  const checks = [...check.matchAll(/pnpm (check:[a-z]+|typecheck|lint|test|build)\b/g)].map((m) => m[1]);
  assert.ok(checks.length > 5, "pnpm check names its checks");
  assert.ok(steps.size > 5, "found the app job's steps");
  assert.deepEqual(
    checks.filter((c) => !steps.has(c)),
    [],
  );
});
