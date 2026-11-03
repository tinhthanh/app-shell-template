// node --test scripts/ci-local.test.mjs (pnpm test)
// pnpm ci:local runs the app job's steps as ci.yml lists them (appSteps):
// every check, with its env, and nothing only GitHub can do.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { appSteps } from "./ci-local.mjs";

const ci = readFileSync(resolve(import.meta.dirname, "../.github/workflows/ci.yml"), "utf8");

test("every step CI's app job runs is run, in its order, from the frozen install to the browser suite", () => {
  const runs = appSteps(ci).map((s) => s.run);
  assert.equal(runs[0], "pnpm install --frozen-lockfile");
  for (const r of ["pnpm typecheck", "pnpm lint", "pnpm check:words", "pnpm test", "pnpm test:coverage", "pnpm build", "pnpm check:size"]) assert.ok(runs.includes(r), r);
  assert.ok(runs.indexOf("pnpm build") < runs.indexOf("pnpm exec playwright test"));
  assert.equal(runs.at(-1), "pnpm exec playwright test");
});

test("the browser suite gets CI's own env: two workers, axe in both themes", () => {
  const e2e = appSteps(ci).find((s) => s.kind === "e2e");
  assert.equal(e2e.env.E2E_WORKERS, "2");
  assert.equal(e2e.env.A11Y_FULL, "1");
});

test("what only GitHub can do is left out: actions, the reporting steps, $GITHUB_OUTPUT", () => {
  const steps = appSteps(ci);
  assert.ok(steps.every((s) => !s.run.includes("$GITHUB_") && !s.run.includes("ci-failures")));
  assert.equal(steps.filter((s) => s.kind === "browsers").length, 1);
});

test("only the app job's steps are read, each with its id and env", () => {
  const yml = `jobs:
  app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@x
      - run: pnpm lint
      - id: e2e
        run: pnpm exec playwright test
        env:
          E2E_WORKERS: "2"
          # a comment
          A11Y_FULL: "1"
      - if: failure()
        run: node report.mjs
  evidence:
    steps:
      - run: node scripts/check-evidence.mjs
`;
  assert.deepEqual(appSteps(yml), [
    { run: "pnpm lint", id: undefined, env: {}, kind: "check" },
    { run: "pnpm exec playwright test", id: "e2e", env: { E2E_WORKERS: "2", A11Y_FULL: "1" }, kind: "e2e" },
  ]);
});
