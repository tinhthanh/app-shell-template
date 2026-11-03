// What CI runs, run on this machine before a push, so a red check is learnt
// here in minutes rather than after a round trip to GitHub. The steps are
// read from the app job in .github/workflows/ci.yml, so the two can't drift,
// and run as CI runs them:
//   - on a clean copy of HEAD (a worktree in ~/Library/Caches/ci-local on a
//     Mac, the temp folder elsewhere: node won't strip types under
//     node_modules, Biome finds no package.json under a hidden folder, and
//     Docker can mount it), with a frozen install: CI sees only what is committed, so a file never added,
//     a lockfile not updated or an .env.local the build leans on fails here
//     as it would there;
//   - with CI=true and each step's own env, and no VITE_* from this shell;
//   - the browser suite in the Playwright Linux image (Docker, 2 CPUs as a
//     private repository's runner has), where CI's races and fonts are. On
//     an arm64 machine the pictures (e2e/visual.spec.ts) run apart in the
//     amd64 image, as pnpm test:visual does. Without Docker the suite runs
//     here, and the summary says so;
// then the evidence and guardrails gates (scripts/check-evidence.mjs,
// check-guardrails.mjs) on this branch's pull request as gh reads it, or on
// PR_TITLE, PR_BODY and PR_LABELS when they are set (before the PR exists).
//
//   pnpm ci:local          all of it
//   pnpm ci:local --here   the browser suite on this machine, not in Docker
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { arch, homedir, tmpdir } from "node:os";
import { basename, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// appSteps reads the app job's steps from the workflow: each single-line
// `run:` with its id and env. What only GitHub can do is left out: actions
// (`uses:`), the reporting steps (`if:`, a `run: |` block) and a step that
// writes to $GITHUB_OUTPUT. kind says how a step runs here.
export function appSteps(yml) {
  const job = /^ {2}app:\n([\s\S]*?)(?=^ {2}\w[\w-]*:\n|(?![\s\S]))/m.exec(yml)?.[1] ?? "";
  const steps = [];
  for (const block of job.split(/^ {6}- /m).slice(1)) {
    const lines = block.split("\n");
    const key = (k) => lines.map((l) => new RegExp(`^(?: {8})?${k}: (.*)$`).exec(l)?.[1]).find((v) => v !== undefined);
    const run = key("run");
    if (key("uses") || key("if") || !run || run === "|" || run.includes("$GITHUB_")) continue;
    const env = {};
    const at = lines.findIndex((l) => /^ {8}env:\s*$/.test(l));
    if (at >= 0)
      for (const l of lines.slice(at + 1)) {
        const m = /^ {10}([A-Z0-9_]+): (.*)$/.exec(l);
        if (!m) {
          if (/^ {10}#/.test(l)) continue;
          break;
        }
        env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
      }
    const kind = /playwright install/.test(run) ? "browsers" : /playwright test/.test(run) ? "e2e" : "check";
    steps.push({ run, id: key("id"), env, kind });
  }
  return steps;
}

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
const git = (...args) => sh("git", args, { cwd: root }).stdout?.trim() ?? "";

// run streams a command and answers whether it passed, and how long it took.
function run(cmd, args, cwd, env) {
  const t = Date.now();
  const status = spawnSync(cmd, args, { cwd, env, stdio: "inherit" }).status;
  return { ok: status === 0, s: Math.round((Date.now() - t) / 1000) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = process.argv.includes("--here");
  const dir = resolve(process.platform === "darwin" ? resolve(homedir(), "Library/Caches") : tmpdir(), "ci-local", `${basename(root)}-${createHash("sha1").update(root).digest("hex").slice(0, 8)}`);
  const results = [];
  const note = [];

  // A clean copy of HEAD, in place of the last one.
  if (existsSync(dir)) sh("git", ["worktree", "remove", "--force", dir], { cwd: root });
  rmSync(dir, { recursive: true, force: true });
  sh("git", ["worktree", "prune"], { cwd: root });
  if (sh("git", ["worktree", "add", "--detach", dir, "HEAD"], { cwd: root }).status !== 0) {
    console.error(`ci-local: couldn't make a worktree of HEAD in ${dir}`);
    process.exit(1);
  }
  const dirty = git("status", "--porcelain").split("\n").filter(Boolean);
  console.log(`ci-local: HEAD ${git("rev-parse", "--short", "HEAD")} in ${dir}`);
  if (dirty.length) note.push(`${dirty.length} uncommitted change${dirty.length > 1 ? "s are" : " is"} not in this run, as they won't be on CI: commit them and run again`);

  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("VITE_"))), CI: "true" };
  delete env.E2E_PORT;
  const linux = process.platform === "linux";
  const docker = !here && !linux && sh("docker", ["info"]).status === 0;
  if (!here && !linux && !docker)
    note.push("Docker isn't running, so the browser suite ran on this machine, not in CI's Linux, and the pictures didn't run: start Docker and run again, or say so in the PR");

  const version = () => JSON.parse(readFileSync(resolve(dir, "node_modules/@playwright/test/package.json"), "utf8")).version;
  // inDocker runs the suite in the Playwright Linux image, on the build in
  // dir (made on this machine: the runner and serve-dist.mjs are plain JavaScript).
  const inDocker = (platform, stepEnv, args) => {
    const image = `mcr.microsoft.com/playwright:v${version()}-noble`;
    if (sh("docker", ["pull", "--quiet", "--platform", platform, image], { stdio: "inherit" }).status !== 0) return { ok: false, s: 0 };
    const e = { ...stepEnv, CI: "true", E2E_SERVE: "static", E2E_PORT: "1430" };
    const flags = Object.entries(e).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
    return run(
      "docker",
      [
        "run",
        "--rm",
        "--init",
        "--platform",
        platform,
        "--cpus=2",
        "--ipc=host",
        "-v",
        `${dir}:/work`,
        "-w",
        "/work",
        ...flags,
        image,
        "node",
        "node_modules/@playwright/test/cli.js",
        "test",
        ...args,
      ],
      dir,
      env,
    );
  };

  let failed = false;
  for (const step of appSteps(readFileSync(resolve(dir, ".github/workflows/ci.yml"), "utf8"))) {
    if (failed) {
      results.push({ name: step.run, mark: "–", s: 0 });
      continue;
    }
    console.log(`\nci-local: ${step.run}`);
    let r;
    if (step.kind === "browsers") {
      // The image has its browsers; here, --with-deps would ask for sudo.
      r = docker ? { ok: true, s: 0, skip: true } : run("sh", ["-c", step.run.replace(" --with-deps", "")], dir, env);
    } else if (step.kind === "e2e" && docker) {
      const amd = arch() !== "arm64";
      r = inDocker(amd ? "linux/amd64" : "linux/arm64", { ...step.env, ...(amd ? {} : { VISUAL: "0" }) }, []);
      if (r.ok && !amd) {
        console.log("\nci-local: the pictures, in the amd64 image (CI's runner draws them)");
        const v = inDocker("linux/amd64", {}, ["e2e/visual.spec.ts"]);
        r = { ok: v.ok, s: r.s + v.s };
      }
    } else {
      r = run("sh", ["-c", step.run], dir, { ...env, ...step.env });
    }
    if (!r.ok && step.kind === "e2e" && existsSync(resolve(dir, "node_modules/.e2e-results/junit.xml")))
      spawnSync("node", ["scripts/ci-failures.mjs", "node_modules/.e2e-results/junit.xml", `Run ${step.run}`], { cwd: dir, stdio: "inherit" });
    results.push({ name: step.run + (step.kind === "e2e" ? (docker ? " (Linux, Docker)" : " (this machine)") : ""), mark: r.skip ? "–" : r.ok ? "✓" : "✗", s: r.s });
    failed = !r.ok;
  }
  if (failed && existsSync(resolve(dir, "node_modules/.e2e-report"))) note.push(`the report: pnpm exec playwright show-report ${resolve(dir, "node_modules/.e2e-report")}`);

  // The PR's gates, as their own jobs: they run whatever the app job did.
  sh("git", ["fetch", "--quiet", "origin", "main"], { cwd: root });
  const pr = JSON.parse(sh("gh", ["pr", "view", "--json", "title,body,labels,author"], { cwd: root }).stdout || "null");
  const gate = {
    PR_TITLE: process.env.PR_TITLE ?? pr?.title ?? "",
    PR_BODY: process.env.PR_BODY ?? pr?.body ?? "",
    PR_LABELS: process.env.PR_LABELS ?? pr?.labels.map((l) => l.name).join(",") ?? "",
    PR_ACTOR: pr?.author.login ?? "",
  };
  if (!pr && process.env.PR_TITLE === undefined) note.push("no pull request for this branch yet: the title and body weren't checked; give PR_TITLE, PR_BODY and PR_LABELS (the open-pr skill)");
  for (const script of ["check-evidence", "check-guardrails"]) {
    console.log(`\nci-local: ${script}`);
    const r = run("node", [`scripts/${script}.mjs`], root, { ...env, ...gate });
    results.push({ name: `node scripts/${script}.mjs`, mark: r.ok ? "✓" : "✗", s: r.s });
  }

  console.log("\nci-local: what CI would say");
  for (const r of results) console.log(`  ${r.mark} ${r.name}${r.mark === "–" ? "" : ` (${r.s}s)`}`);
  for (const n of note) console.log(`  note: ${n}`);
  const red = results.some((r) => r.mark === "✗");
  console.log(red ? "ci-local: red" : "ci-local: green");
  process.exit(red ? 1 : 0);
}
