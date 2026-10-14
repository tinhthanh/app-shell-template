// Fails a pull request that changes behaviour without proof. On a PR, CI
// runs it with the base commit and the PR's title and body in env:
//
//   BASE_SHA=… PR_TITLE=… PR_BODY=… PR_ACTOR=… node scripts/check-evidence.mjs
//
// What it asks (AGENTS.md › Done means):
//   - a change under src/ (the vendored kit, styles and tests left out)
//     comes with a changed test (src/**/*.test.ts or e2e/*.spec.ts), or
//     the PR body has a line "no-test: <why, in at least 15 characters>";
//   - a change under src/ or index.html has a bullet under ## Unreleased
//     in CHANGELOG.md, unless the title says it isn't user-visible
//     (test:, ci:, chore:, refactor:, docs:, build:);
//   - the title is a lowercase conventional subject.
//
// Dependabot's pull requests (PR_ACTOR dependabot[bot]) are held to the
// first two but not the title: it writes "Bump" and cannot be told not to.
//
// Locally, with no env, it diffs against origin/main.
import { execFileSync } from "node:child_process";

const base = process.env.BASE_SHA || "origin/main";
const title = process.env.PR_TITLE ?? "";
const body = process.env.PR_BODY ?? "";
const bot = process.env.PR_ACTOR === "dependabot[bot]";

const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const behaviour = changed.filter((f) => (f.startsWith("src/") || f === "index.html") && !f.startsWith("src/components/ui/") && !f.endsWith(".css") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));
const tests = changed.filter((f) => f.endsWith(".test.ts") || /^e2e\/.+\.spec\.ts$/.test(f));
const problems = [];

const SUBJECT = /^(feat|fix|test|docs|ci|chore|refactor|perf|build)(\([a-z0-9-]+\))?!?: [a-z]/;
if (title && !bot && !SUBJECT.test(title)) problems.push(`the title "${title}" is not a lowercase conventional subject (feat: …, fix: …, test: …)`);

const noTest = /^no-test: (.{15,})$/m.exec(body);
if (behaviour.length && !tests.length && !noTest) problems.push(`behaviour changed with no test changed (or a "no-test: <why>" line in the PR body):\n    ${behaviour.join("\n    ")}`);
if (noTest && tests.length) problems.push(`the PR body says no-test, but tests changed: take the line out`);

const notUserVisible = /^(test|ci|chore|refactor|docs|build)(\(|:)/.test(title);
if (behaviour.length && !notUserVisible && !changed.includes("CHANGELOG.md"))
  problems.push("a user-visible change needs a bullet under ## Unreleased in CHANGELOG.md (or a title that says it isn't: test:, ci:, chore:, refactor:, docs:)");

if (problems.length) {
  console.error(`the pull request lacks evidence (AGENTS.md › Done means):\n\n  ${problems.join("\n  ")}\n`);
  process.exit(1);
}
console.log(`check-evidence: ${behaviour.length} behaviour files, ${tests.length} test files${noTest ? ", no-test given" : ""}`);
