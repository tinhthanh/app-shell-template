// The PR gates (check-evidence.mjs, check-guardrails.mjs) have tests of
// their own: each case is a small git repository (a base commit, then the
// PR's commit) and the script run on it as CI runs it, with the PR's title,
// body, labels and actor in env.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const scripts = resolve(import.meta.dirname);
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};
const git = (cwd, ...args) => {
  const r = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd, env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

// A repository whose base commit has `before`, then a PR commit that
// writes `after` (a path to its text; "" deletes nothing, just writes).
function repo(before, after) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const put = (files) => {
    for (const [p, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), text);
    }
  };
  git(dir, "init", "-q", "-b", "main");
  put(before);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  put(after);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "change");
  return { dir, base };
}

// Runs a gate on the repository, as CI would, and returns what it said.
function gate(name, { dir, base }, pr = {}) {
  const r = spawnSync("node", [join(scripts, `${name}.mjs`)], {
    cwd: dir,
    encoding: "utf8",
    env: { ...env, BASE_SHA: base, PR_TITLE: pr.title ?? "", PR_BODY: pr.body ?? "", PR_LABELS: pr.labels ?? "", PR_ACTOR: pr.actor ?? "someone" },
  });
  rmSync(dir, { recursive: true, force: true });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
}

const BASE = { "src/lib/a.ts": "export const a = 1;\n", "src/lib/a.test.ts": "test\n", "CHANGELOG.md": "# Changelog\n\n## Unreleased\n\n## 0.1.0\n" };
const CODE = { "src/lib/a.ts": "export const a = 2;\n" };
const TEST = { "src/lib/a.test.ts": "test 2\n" };
const BULLET = { "CHANGELOG.md": "# Changelog\n\n## Unreleased\n\n- a is 2\n\n## 0.1.0\n" };
const feat = { title: "feat: a is two" };

test("evidence: a behaviour change with a test and a bullet passes", () => {
  const r = gate("check-evidence", repo(BASE, { ...CODE, ...TEST, ...BULLET }), feat);
  assert.ok(r.ok, r.out);
  assert.match(r.out, /1 behaviour files, 1 test files/);
});

test("evidence: a behaviour change with no test is refused, and names the file", () => {
  const r = gate("check-evidence", repo(BASE, { ...CODE, ...BULLET }), feat);
  assert.ok(!r.ok);
  assert.match(r.out, /no test changed/);
  assert.match(r.out, /src\/lib\/a\.ts/);
});

test("evidence: a no-test line of at least 15 characters stands in for a test; a shorter one does not", () => {
  assert.ok(gate("check-evidence", repo(BASE, { ...CODE, ...BULLET }), { ...feat, body: "no-test: the change is a renamed label only" }).ok);
  assert.ok(!gate("check-evidence", repo(BASE, { ...CODE, ...BULLET }), { ...feat, body: "no-test: trivial" }).ok);
});

test("evidence: a no-test line with a test changed is refused", () => {
  const r = gate("check-evidence", repo(BASE, { ...CODE, ...TEST, ...BULLET }), { ...feat, body: "no-test: nothing to test here, honestly" });
  assert.ok(!r.ok);
  assert.match(r.out, /take the line out/);
});

test("evidence: a user-visible change needs a changelog bullet; test:, chore: and refactor: titles do not", () => {
  const r = gate("check-evidence", repo(BASE, { ...CODE, ...TEST }), feat);
  assert.ok(!r.ok);
  assert.match(r.out, /CHANGELOG\.md/);
  for (const title of ["test: covers a", "chore: tidy a", "refactor(lib): a reads better"]) assert.ok(gate("check-evidence", repo(BASE, { ...CODE, ...TEST }), { title }).ok, title);
});

test("evidence: the title is a lowercase conventional subject", () => {
  for (const title of ["Add a thing", "feat: Add a thing", "feature: a thing", "feat:a thing"]) {
    const r = gate("check-evidence", repo(BASE, { ...CODE, ...TEST, ...BULLET }), { title });
    assert.ok(!r.ok, title);
    assert.match(r.out, /lowercase conventional subject/);
  }
  for (const title of ["fix(app): a is two", "feat!: a breaks", "perf: a is quick"]) assert.ok(gate("check-evidence", repo(BASE, { ...CODE, ...TEST, ...BULLET }), { title }).ok, title);
});

test("evidence: the vendored kit, styles, tests and types are not behaviour", () => {
  const r = gate("check-evidence", repo(BASE, { "src/components/ui/button.tsx": "x\n", "src/index.css": "x\n", "src/lib/b.test.ts": "x\n", "src/vite-env.d.ts": "x\n" }), { title: "chore: kit" });
  assert.ok(r.ok, r.out);
  assert.match(r.out, /0 behaviour files/);
});

test("evidence: dependabot's Bump title passes, but it still needs the rest", () => {
  const bot = { title: "Bump x from 1 to 2", actor: "dependabot[bot]" };
  assert.ok(gate("check-evidence", repo(BASE, { "package.json": "{}\n" }), bot).ok);
  assert.ok(!gate("check-evidence", repo(BASE, CODE), bot).ok);
});

const GUARD = { ...BASE, "biome.json": "{}\n", ".github/workflows/ci.yml": "a\n", "e2e/x.spec.ts": "test\n" };

test("guardrails: a plain change passes", () => {
  const r = gate("check-guardrails", repo(GUARD, CODE));
  assert.ok(r.ok, r.out);
  assert.match(r.out, /0 guardrail files changed/);
});

test("guardrails: a guardrail file needs the label, and is named", () => {
  const r = gate("check-guardrails", repo(GUARD, { "biome.json": "{ }\n" }));
  assert.ok(!r.ok);
  assert.match(r.out, /guardrail-change/);
  assert.match(r.out, /biome\.json/);
  assert.ok(gate("check-guardrails", repo(GUARD, { "biome.json": "{ }\n" }), { labels: "bug,guardrail-change" }).ok);
});

test("guardrails: every guardrail path is one", () => {
  for (const p of [
    "biome-plugins/x.grit",
    "scripts/check-x.mjs",
    "playwright.config.ts",
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/settings.json",
    ".githooks/pre-commit",
    "tsconfig.json",
    "e2e/fixtures.ts",
    "vite.config.ts",
    "package.json",
    "index.html",
    "deploy/csp.txt",
  ]) {
    assert.ok(!gate("check-guardrails", repo(GUARD, { [p]: "x\n" })).ok, p);
  }
});

test("guardrails: dependabot may edit a workflow without the label, nothing else", () => {
  const bot = { actor: "dependabot[bot]" };
  assert.ok(gate("check-guardrails", repo(GUARD, { ".github/workflows/ci.yml": "b\n" }), bot).ok);
  assert.ok(!gate("check-guardrails", repo(GUARD, { ".github/workflows/ci.yml": "b\n", "biome.json": "{ }\n" }), bot).ok);
});

test("guardrails: a skipped, focused or fixme test is refused", () => {
  for (const line of ['test.skip("a", () => {});', 'test.only("a", () => {});', 'test.fixme("a", () => {});']) {
    const r = gate("check-guardrails", repo(GUARD, { "e2e/x.spec.ts": `test\n${line}\n` }));
    assert.ok(!r.ok, line);
    assert.match(r.out, /proves nothing/);
  }
});

test("guardrails: @ts-ignore and @ts-expect-error are refused", () => {
  for (const line of ["// @ts-ignore", "// @ts-expect-error"]) {
    const r = gate("check-guardrails", repo(GUARD, { "src/lib/a.ts": `${line}\nexport const a = 2;\n` }));
    assert.ok(!r.ok, line);
    assert.match(r.out, /fix the type/);
  }
});

test("guardrails: a biome-ignore needs a reason of 15 characters after the colon", () => {
  const short = gate("check-guardrails", repo(GUARD, { "src/lib/a.ts": "// biome-ignore lint/suspicious/noExplicitAny: ok\nexport const a = 2;\n" }));
  assert.ok(!short.ok);
  assert.match(short.out, /without a reason/);
  assert.ok(gate("check-guardrails", repo(GUARD, { "src/lib/a.ts": "// biome-ignore lint/suspicious/noExplicitAny: the wire type is open here\nexport const a = 2;\n" })).ok);
});

test("guardrails: a removed skip is not an added one", () => {
  assert.ok(gate("check-guardrails", repo({ ...GUARD, "e2e/x.spec.ts": 'test.skip("a");\n' }, { "e2e/x.spec.ts": 'test("a");\n' })).ok);
});
