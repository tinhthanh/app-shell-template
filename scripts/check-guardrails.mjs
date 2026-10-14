// Fails a pull request that weakens the checks. On a PR, CI runs it with
// the base commit and the PR's labels in env:
//
//   BASE_SHA=… PR_LABELS="a,b" PR_ACTOR=… node scripts/check-guardrails.mjs
//
// What it refuses:
//   - added lines with test.skip, test.fixme, test.only, @ts-expect-error or
//     @ts-expect-error (a test that doesn't run proves nothing);
//   - an added biome-ignore without a reason after the colon;
//   - a change to a guardrail file (the lint config and plugins, the
//     scripts here, the Playwright config, the workflows, AGENTS.md,
//     CLAUDE.md, CODEOWNERS, the Claude settings) unless the PR carries
//     the label "guardrail-change", which CODEOWNERS routes to the owner.
//     Dependabot (PR_ACTOR dependabot[bot]) may bump an action's version in
//     the workflows without the label: that is all it ever changes there.
import { execFileSync } from "node:child_process";

const base = process.env.BASE_SHA || "origin/main";
const labels = (process.env.PR_LABELS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const bot = process.env.PR_ACTOR === "dependabot[bot]";

const GUARDRAILS = [
  /^biome\.json$/,
  /^biome-plugins\//,
  /^scripts\/check-.*\.mjs$/,
  /^playwright\.config\.ts$/,
  /^\.github\//,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^\.claude\//,
  /^\.githooks\//,
  /^tsconfig.*\.json$/,
  /^e2e\/fixtures\.ts$/,
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
