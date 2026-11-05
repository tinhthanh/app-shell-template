// pnpm verify: what a pull request needs before it goes up, run on this
// machine, and a record of it that the push and the pull request check
// (ADR 0017). For a repository whose CI runs locally (the repository
// variable CI_MODE=local: a private one on a free plan, where Actions
// minutes are paid for), it stands in for CI's app job; anywhere it is the
// fullest check there is before a push.
//
//   1. pnpm ci:local: CI's app job on a clean copy of HEAD, the browser suite
//      in CI's Linux (Docker), then the evidence and guardrails gates
//      (scripts/ci-local.mjs);
//   2. the review: Claude Code's reviewer agent (.claude/agents/reviewer.md)
//      reads the branch's diff against the repository's rules, read-only
//      (claude -p, the tools it may use named), and answers with a verdict;
//      its answer is evidence/review.md;
//   3. evidence/verify.json: the commit, its tree (every tracked file but
//      evidence/, scripts/check-proof.mjs), each step's mark, the notes, the
//      verdict, node and the OS.
//
// Commit evidence/ after (the tree it names stays this one), then push:
// pnpm check:proof (the pre-push hook, and CI's evidence job) holds the
// record to the commit pushed. It runs on what is committed only, so a tree
// with changes is refused before anything runs.
//
//   pnpm verify
//   CLAUDE_BIN=/path/to/claude pnpm verify   a claude not on the PATH
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";
import { treeOf, VERIFY_JSON, verdictOf } from "./check-proof.mjs";

// The reviewer may read and ask git and gh; nothing it is given writes.
export const REVIEW_TOOLS = ["Read", "Grep", "Glob", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(gh pr view:*)", "Bash(gh pr diff:*)"];

export const REVIEW_PROMPT = `Review this branch as the reviewer agent does: its diff is \`git diff origin/main...HEAD\`, and its pull request's text is the PR (gh pr view) or PR.md if there is no PR yet.
Begin your answer with one line, exactly \`VERDICT: ready\` or \`VERDICT: not ready: <the reason, in a few words>\`.
Ready means nothing you found must be fixed before it merges; a finding worth a follow-up is not a reason to say not ready.
Then the findings, most serious first, each with file:line, as your instructions say.`;

// reviewArgs is the command line the review runs with.
export function reviewArgs() {
  return ["-p", REVIEW_PROMPT, "--agent", "reviewer", "--allowedTools", ...REVIEW_TOOLS, "--output-format", "text"];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(import.meta.dirname, "..");
  const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  const git = (...args) => String(sh("git", args).stdout ?? "").trim();

  const dirty = git("status", "--porcelain")
    .split("\n")
    .filter((l) => l && !l.slice(3).startsWith("evidence/"));
  if (dirty.length) {
    console.error(`verify: ${dirty.length} uncommitted change${dirty.length > 1 ? "s" : ""}: the run and its record are of a commit, so commit first:\n${dirty.slice(0, 10).join("\n")}`);
    process.exit(1);
  }
  const commit = git("rev-parse", "HEAD");
  const tree = treeOf(git("ls-tree", "-r", "HEAD"));

  console.log("verify: 1. pnpm ci:local");
  sh(process.execPath, ["scripts/ci-local.mjs"], { stdio: "inherit" });
  const summary = resolve(root, "node_modules/.ci-local.json");
  const ran = existsSync(summary) ? JSON.parse(readFileSync(summary, "utf8")) : null;
  const steps = ran?.commit === commit ? ran.steps : [{ name: "pnpm ci:local", mark: "✗", s: 0 }];
  const notes = ran?.commit === commit ? ran.notes : ["ci:local left no summary of this commit"];

  console.log("\nverify: 2. the review (Claude Code's reviewer agent, read-only)");
  const claude = process.env.CLAUDE_BIN ?? "claude";
  const started = Date.now();
  const review = sh(claude, reviewArgs(), { stdio: ["ignore", "pipe", "inherit"] });
  const said = review.error ? `VERDICT: not ready: the review didn't run (${review.error.message}); install Claude Code or set CLAUDE_BIN` : String(review.stdout ?? "");
  const verdict = review.status === 0 || review.error ? verdictOf(said) : "none";
  console.log(said.trim());
  steps.push({ name: "the review (claude -p --agent reviewer)", mark: verdict === "ready" ? "✓" : "✗", s: Math.round((Date.now() - started) / 1000) });

  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/review.md"), `<!-- The reviewer agent's answer on ${commit.slice(0, 7)}, written by pnpm verify (scripts/verify.mjs). -->\n\n${said.trim()}\n`);
  const record = { commit, tree, at: new Date().toISOString(), steps, notes, review: verdict, node: process.version, os: `${os.platform()} ${os.release()} ${os.arch()}` };
  writeFileSync(resolve(root, VERIFY_JSON), `${JSON.stringify(record, null, 2)}\n`);

  console.log("\nverify: what it says");
  for (const s of steps) console.log(`  ${s.mark} ${s.name}${s.mark === "–" ? "" : ` (${s.s}s)`}`);
  for (const n of notes) console.log(`  note: ${n}`);
  const red = steps.some((s) => s.mark === "✗");
  console.log(red ? "verify: red (evidence/ says so; fix, commit, run again)" : "verify: green. Commit evidence/ (git add evidence && git commit -m 'chore: verify'), then push");
  process.exit(red ? 1 : 0);
}
