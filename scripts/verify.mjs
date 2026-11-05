// pnpm verify: what a pull request needs before it goes up, run on this
// machine, and a record of it that the push and the pull request check
// (ADR 0017). For a repository whose CI runs locally (the repository
// variable CI_MODE=local: a private one on a free plan, where Actions
// minutes are paid for), it stands in for CI's app job; anywhere it is the
// fullest check there is before a push.
//
//   1. pnpm ci:local: CI's app job on a clean copy of HEAD, the browser suite
//      in CI's Linux (Docker), then the evidence and guardrails gates
//      (scripts/ci-local.mjs), on PR_TITLE, PR_BODY and PR_LABELS or the PR;
//   2. the review: Claude Code's reviewer agent (.claude/agents/reviewer.md)
//      reads the branch's diff against the repository's rules and answers
//      with a verdict, its answer evidence/review.md. Read-only by more than
//      its word: only the reading tools are loaded, no settings (the
//      project's allowlist lets git commit and pnpm through) and no MCP
//      server, and in dontAsk mode anything not in REVIEW_TOOLS is denied;
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
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";
import { treeOf, VERIFY_JSON, verdictOf } from "./check-proof.mjs";

// The tools the reviewer has at all, and the ones it may use: it reads, and asks git and gh.
export const REVIEW_LOADED = ["Read", "Grep", "Glob", "Bash"];
export const REVIEW_TOOLS = ["Read", "Grep", "Glob", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(gh pr view:*)", "Bash(gh pr diff:*)"];

// promptOf is what the review is asked, with the pull request's text when
// there is one (PR_TITLE and PR_BODY, the PR on GitHub, or PR.md): verify
// runs before the push, so often there is none yet, and the evidence gate
// checks the text when there is.
export function promptOf(pr) {
  const text = pr
    ? `The pull request's text, to check as your instructions say:\n\n${pr.title}\n\n${pr.body}`
    : "There is no pull request text yet (verify runs before the push): judge the code and its tests, don't hold the missing text against it, and say in a few lines what the pull request must say (its label, Assumptions, Not done).";
  return `Review this branch as the reviewer agent does: its diff is \`git diff origin/main...HEAD\`.
${text}
Begin your answer with one line, exactly \`VERDICT: ready\` or \`VERDICT: not ready: <the reason, in a few words>\`.
Ready means nothing you found must be fixed before it merges; a finding worth a follow-up is not a reason to say not ready.
Then the findings, most serious first, each with file:line, as your instructions say.`;
}

// agentOf reads an agent's file (its frontmatter's description, its body the
// prompt) as --agents takes it: with no settings loaded, the project's
// agents aren't either, so the reviewer is handed over whole.
export function agentOf(md) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(md);
  if (!m) throw new Error("verify: the reviewer's file has no frontmatter");
  const description = /^description:\s*(.*)$/m.exec(m[1])?.[1] ?? "";
  return { description, prompt: m[2].trim(), tools: REVIEW_LOADED };
}

// reviewArgs is the command line the review runs with.
export function reviewArgs(prompt, reviewerMd) {
  return [
    "-p",
    prompt,
    "--agents",
    JSON.stringify({ reviewer: agentOf(reviewerMd) }),
    "--agent",
    "reviewer",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--permission-mode",
    "dontAsk",
    "--tools",
    ...REVIEW_LOADED,
    "--allowedTools",
    ...REVIEW_TOOLS,
    "--output-format",
    "text",
  ];
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
  // The last run's summary goes first, so a run that stops before writing one can't pass for it.
  const summary = resolve(root, "node_modules/.ci-local.json");
  rmSync(summary, { force: true });
  const ci = sh(process.execPath, ["scripts/ci-local.mjs"], { stdio: "inherit" });
  const ran = existsSync(summary) ? JSON.parse(readFileSync(summary, "utf8")) : null;
  const steps = ran?.commit === commit ? ran.steps : [{ name: "pnpm ci:local (it stopped before its summary)", mark: "✗", s: 0 }];
  if (ci.status !== 0 && !steps.some((s) => s.mark === "✗")) steps.push({ name: `pnpm ci:local (exit ${ci.status})`, mark: "✗", s: 0 });
  const notes = ran?.commit === commit ? ran.notes : ["ci:local left no summary of this commit"];

  console.log("\nverify: 2. the review (Claude Code's reviewer agent, read-only)");
  const claude = process.env.CLAUDE_BIN ?? "claude";
  const started = Date.now();
  const pr = process.env.PR_TITLE
    ? { title: process.env.PR_TITLE, body: process.env.PR_BODY ?? "" }
    : (JSON.parse(sh("gh", ["pr", "view", "--json", "title,body"]).stdout || "null") ??
      (existsSync(resolve(root, "PR.md")) ? (([title, ...body]) => ({ title, body: body.join("\n").trim() }))(readFileSync(resolve(root, "PR.md"), "utf8").split("\n")) : null));
  const review = sh(claude, reviewArgs(promptOf(pr), readFileSync(resolve(root, ".claude/agents/reviewer.md"), "utf8")), { stdio: ["ignore", "pipe", "inherit"] });
  const said = review.error
    ? `VERDICT: not ready: the review didn't run (${review.error.message}); install Claude Code or set CLAUDE_BIN`
    : review.status !== 0
      ? `VERDICT: not ready: claude exited ${review.status} (its words are in the terminal above)\n\n${String(review.stdout ?? "")}`
      : String(review.stdout ?? "");
  const verdict = verdictOf(said);
  console.log(said.trim());
  steps.push({ name: "the review (claude -p --agent reviewer)", mark: verdict === "ready" ? "✓" : "✗", s: Math.round((Date.now() - started) / 1000) });

  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/review.md"), `<!-- The reviewer agent's answer on ${commit.slice(0, 7)}, written by pnpm verify (scripts/verify.mjs). -->\n\n${said.trim()}\n`);
  const record = {
    commit,
    tree,
    at: new Date().toISOString(),
    linux: ran?.linux === true,
    steps,
    notes,
    review: verdict,
    node: process.version,
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
  };
  writeFileSync(resolve(root, VERIFY_JSON), `${JSON.stringify(record, null, 2)}\n`);

  console.log("\nverify: what it says");
  for (const s of steps) console.log(`  ${s.mark} ${s.name}${s.mark === "–" ? "" : ` (${s.s}s)`}`);
  for (const n of notes) console.log(`  note: ${n}`);
  const red = steps.some((s) => s.mark === "✗");
  console.log(red ? "verify: red (evidence/ says so; fix, commit, run again)" : "verify: green. Commit evidence/ (git add evidence && git commit -m 'chore: verify'), then push");
  process.exit(red ? 1 : 0);
}
