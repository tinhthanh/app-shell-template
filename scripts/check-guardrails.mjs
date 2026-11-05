// Fails a pull request that weakens the checks. On a PR, CI runs it with
// the base commit and the PR's labels in env:
//
//   BASE_SHA=… PR_LABELS="a,b" PR_ACTOR=… node scripts/check-guardrails.mjs
//   PR_NUMBER=… (CI): the labels are read from the PR as it is now, with gh
//
// What it refuses:
//   - added lines in src, e2e or scripts with test.skip, test.fixme,
//     test.only (a test that doesn't run proves nothing), @ts-expect-error or
//     @ts-expect-error (fix the type instead);
//   - an added biome-ignore without `lint/<rule>: ` and a reason of 15
//     characters or more after the colon;
//   - a change to a guardrail file (biome.json and biome-plugins/, the
//     scripts/check-*.mjs, scripts/verify.mjs and scripts/ci-local.mjs (where
//     CI runs locally they are CI, ADR 0017), playwright.config.ts, everything under .github/
//     (the workflows, CODEOWNERS), AGENTS.md, CLAUDE.md, .claude/ (the
//     settings, hooks and skills), .githooks/, the tsconfigs,
//     e2e/fixtures.ts, vite.config.ts, package.json, index.html and
//     deploy/) unless the PR carries
//     the label "guardrail-change", which CODEOWNERS routes to the owner.
//     Dependabot (PR_ACTOR dependabot[bot]) may bump an action's version in
//     the workflows without the label: that is all it ever changes there.
import { execFileSync, spawnSync } from "node:child_process";

// Locally: origin/main, else main, else the root commit, so the script
// runs in a fresh copy with no remote.
const exists = (ref) => spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], { encoding: "utf8" }).status === 0;
const base = process.env.BASE_SHA || (exists("origin/main") ? "origin/main" : exists("main") ? "main" : execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], { encoding: "utf8" }).trim());
// The labels as they are now, read from GitHub when CI names the PR
// (PR_NUMBER): opening a PR with a label starts two runs, and the one the
// label's event started can be the one cancelled, leaving a run whose event
// saw none. PR_LABELS when gh can't say (locally, before the PR exists).
const live = process.env.PR_NUMBER ? spawnSync("gh", ["pr", "view", process.env.PR_NUMBER, "--json", "labels", "-q", '[.labels[].name] | join(",")'], { encoding: "utf8" }) : null;
const labels = (live?.status === 0 ? live.stdout : (process.env.PR_LABELS ?? ""))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const bot = process.env.PR_ACTOR === "dependabot[bot]";

const GUARDRAILS = [
  /^biome\.json$/,
  /^biome-plugins\//,
  /^scripts\/check-.*\.mjs$/,
  /^scripts\/(verify|ci-local)\.mjs$/,
  /^playwright\.config\.ts$/,
  /^\.github\//,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^\.claude\//,
  /^\.githooks\//,
  /^tsconfig.*\.json$/,
  /^e2e\/fixtures\.ts$/,
  /^vite\.config\.ts$/,
  /^package\.json$/,
  /^index\.html$/,
  /^deploy\//,
];
const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const diff = execFileSync("git", ["diff", "--unified=0", `${base}...HEAD`, "--", "src", "e2e", "scripts"], { encoding: "utf8" });
const problems = [];

const touched = changed.filter((f) => GUARDRAILS.some((r) => r.test(f)));
if (touched.length && !labels.includes("guardrail-change") && !(bot && touched.every((f) => f.startsWith(".github/workflows/"))))
  problems.push(`guardrail files changed without the "guardrail-change" label:\n    ${touched.join("\n    ")}`);

let file = "";
let skip = false;
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    file = line.slice(6);
    // The checks themselves name what they refuse; the label rule covers them.
    skip = GUARDRAILS.some((r) => r.test(file));
  }
  if (skip || !line.startsWith("+") || line.startsWith("+++")) continue;
  const added = line.slice(1);
  if (/\btest\.(skip|fixme|only)\(/.test(added)) problems.push(`${file}: adds ${/test\.(skip|fixme|only)/.exec(added)?.[0]}; a test that doesn't run proves nothing`);
  if (/@ts-(ignore|expect-error)/.test(added)) problems.push(`${file}: adds ${/@ts-(ignore|expect-error)/.exec(added)?.[0]}; fix the type instead`);
  if (/biome-ignore/.test(added) && !/biome-ignore lint\/[\w/-]+: .{15,}/.test(added)) problems.push(`${file}: adds a biome-ignore without a reason after the colon`);
}

if (problems.length) {
  console.error(`the pull request weakens a guardrail:\n\n  ${problems.join("\n  ")}\n`);
  process.exit(1);
}
console.log(`check-guardrails: ${touched.length} guardrail files changed${touched.length ? " (labelled)" : ""}, no test skipped`);
