// check-proof.mjs and verify.mjs: what makes evidence/verify.json the proof
// of a commit where CI runs locally (ADR 0017), and how the review is held
// to reading.
import assert from "node:assert/strict";
import { test } from "node:test";
import { proofProblems, treeOf, verdictOf } from "./check-proof.mjs";
import { agentOf, promptOf, REVIEW_LOADED, REVIEW_TOOLS, reviewArgs } from "./verify.mjs";

const lsTree = (...files) => files.map((f) => `100644 blob ${"a".repeat(40)}\t${f}`).join("\n");
const green = (tree) => ({ commit: "abc1234", tree, linux: true, steps: [{ name: "pnpm check", mark: "✓" }], review: "ready" });

test("committing the record after the run leaves the tree the run checked", () => {
  assert.equal(treeOf(lsTree("src/a.ts", "evidence/verify.json", "evidence/review.md")), treeOf(lsTree("src/a.ts")));
  assert.notEqual(treeOf(lsTree("src/a.ts")), treeOf(lsTree("src/a.ts", "src/b.ts")));
});

test("a green, reviewed run of this tree is proof, and nothing else is", () => {
  const tree = treeOf(lsTree("src/a.ts"));
  assert.deepEqual(proofProblems(green(tree), tree), []);
  assert.match(proofProblems(null, tree)[0], /no evidence\/verify.json/);
  assert.match(proofProblems(green("another"), tree)[0], /another tree/);
  assert.match(proofProblems({ ...green(tree), steps: [{ name: "pnpm exec playwright test", mark: "✗" }] }, tree)[0], /red: pnpm exec playwright test/);
  assert.match(proofProblems({ ...green(tree), steps: [] }, tree)[0], /names no step/);
  assert.match(proofProblems({ ...green(tree), review: "not ready" }, tree)[0], /"not ready", not "ready"/);
  assert.match(proofProblems({ ...green(tree), linux: false }, tree)[0], /didn't run in Linux/);
});

test("the reviewer's verdict is read from its own line", () => {
  assert.equal(verdictOf("VERDICT: ready\n\nNo findings."), "ready");
  assert.equal(verdictOf("Some preamble\nVERDICT: not ready: no test for the sort\n- src/x.ts:3"), "not ready");
  assert.equal(verdictOf("Looks ready to me."), "none");
});

test("the reviewer is given only tools that read, and no settings that would let more through", () => {
  const args = reviewArgs(promptOf(null), "---\nname: reviewer\ndescription: Reads a diff.\ntools: Read, Bash\n---\n\nYou review.\n");
  const after = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(after("--setting-sources"), "");
  assert.equal(after("--permission-mode"), "dontAsk");
  assert.ok(args.includes("--strict-mcp-config"));
  assert.deepEqual(JSON.parse(after("--agents")).reviewer, { description: "Reads a diff.", prompt: "You review.", tools: REVIEW_LOADED });
  assert.deepEqual(REVIEW_LOADED, ["Read", "Grep", "Glob", "Bash"]);
  for (const tool of REVIEW_TOOLS) assert.match(tool, /^(Read|Grep|Glob|Bash\((git (diff|log|show)|gh pr (view|diff)):\*\))$/);
  assert.throws(() => agentOf("no frontmatter"), /frontmatter/);
});

test("the review reads the pull request's text, and without one judges the code alone", () => {
  assert.match(promptOf({ title: "ci: a title", body: "The body." }), /ci: a title\n\nThe body\./);
  assert.match(promptOf(null), /no pull request text yet/);
  assert.doesNotMatch(promptOf(null), /gh pr view/);
});
