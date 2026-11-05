// Whether evidence/verify.json, the record `pnpm verify` writes
// (scripts/verify.mjs), is a green run of this commit's tree with the
// reviewer's verdict "ready". It is what stands in for CI on a repository
// whose CI runs locally (the repository variable CI_MODE=local, ADR 0017):
// the pre-push hook refuses a push without it, and the evidence job in
// .github/workflows/ci.yml, the one job that still runs there, checks it
// on the pull request's head. The tree is every tracked file but evidence/,
// so committing the record after the run leaves it this tree's.
//
//   node scripts/check-proof.mjs              HEAD
//   node scripts/check-proof.mjs --ref <sha>  another commit (CI: the PR's head)
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

export const VERIFY_JSON = "evidence/verify.json";

// treeOf hashes `git ls-tree -r` of a commit, leaving out evidence/: the
// files a run checked, whatever record of it was committed after.
export function treeOf(lsTree) {
  const lines = lsTree
    .split("\n")
    .filter((l) => l && !l.split("\t")[1]?.startsWith("evidence/"))
    .sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

// verdictOf reads the reviewer's first line, "VERDICT: ready" or "VERDICT: not ready …".
export function verdictOf(review) {
  const m = /^\s*VERDICT:\s*(ready|not ready)\b/im.exec(review);
  return m ? m[1].toLowerCase() : "none";
}

// proofProblems says what keeps a record from being this tree's green run, in words; none when it is.
export function proofProblems(record, tree) {
  if (!record) return [`no ${VERIFY_JSON}: run pnpm verify, then commit evidence/`];
  const problems = [];
  if (record.tree !== tree) problems.push(`${VERIFY_JSON} is a run of another tree (commit ${String(record.commit ?? "?").slice(0, 7)}): run pnpm verify on this one`);
  for (const s of record.steps ?? []) if (s.mark === "✗") problems.push(`a step was red: ${s.name}`);
  if (!record.steps?.length) problems.push(`${VERIFY_JSON} names no step it ran`);
  if (record.review !== "ready") problems.push(`the reviewer's verdict is "${record.review ?? "none"}", not "ready" (evidence/review.md says why)`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(import.meta.dirname, "..");
  const at = process.argv.indexOf("--ref");
  const ref = at > 0 ? process.argv[at + 1] : "HEAD";
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const listed = git("ls-tree", "-r", ref);
  if (listed.status !== 0) {
    console.error(`check-proof: no commit ${ref}`);
    process.exit(1);
  }
  const shown = git("show", `${ref}:${VERIFY_JSON}`);
  let record = null;
  try {
    record = shown.status === 0 ? JSON.parse(shown.stdout) : null;
  } catch {
    console.error(`check-proof: ${VERIFY_JSON} isn't JSON`);
    process.exit(1);
  }
  const problems = proofProblems(record, treeOf(listed.stdout));
  if (problems.length) {
    console.error(`check-proof: ${ref} has no green run of its own (ADR 0017):\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`check-proof: ${VERIFY_JSON} is a green run of this tree, reviewed ready (${record.at})`);
}
