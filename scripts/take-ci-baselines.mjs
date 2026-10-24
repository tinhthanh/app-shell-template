// The visual baselines from CI's own Linux renderings, for a machine with no
// Docker (pnpm test:visual --update needs it). Push the change; CI's ci run
// fails the pictures it changed and keeps each one's -actual.png and
// -diff.png in its e2e-report artifact. This fetches that artifact for the
// branch you're on and lists every diff to look at; with --take it copies
// the actual pictures over the baselines, to commit beside the change.
// Look at every diff first: a baseline taken unseen proves nothing.
//
//   node scripts/take-ci-baselines.mjs          fetch, list the diffs
//   node scripts/take-ci-baselines.mjs --take   …and copy them into e2e/snapshots/
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const take = process.argv.includes("--take");
const gh = (...args) => {
  const r = spawnSync("gh", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`gh ${args.join(" ")}: ${r.stderr.trim()}`);
  return r.stdout.trim();
};

const branch = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).stdout.trim();
// The newest run that finished: one cancelled by a newer push, or still
// going, has nothing to take.
const run = gh(
  "run",
  "list",
  "--branch",
  branch,
  "--workflow",
  "ci",
  "--limit",
  "10",
  "--json",
  "databaseId,headSha,conclusion",
  "--jq",
  '[.[] | select(.conclusion == "success" or .conclusion == "failure")][0] | "\\(.databaseId) \\(.headSha) \\(.conclusion)"',
);
const [id, sha = "", conclusion] = run.split(" ");
if (!id || id === "null") {
  console.error(`take-ci-baselines: no ci run on ${branch} yet: push it, and wait for CI`);
  process.exit(1);
}
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
if (sha !== head) console.warn(`take-ci-baselines: the last ci run is of ${sha.slice(0, 7)}, not HEAD (${head.slice(0, 7)}): push, wait for it, run again`);

const dir = mkdtempSync(join(tmpdir(), "ci-baselines-"));
try {
  gh("run", "download", id, "-n", "e2e-report", "-D", dir);
} catch (err) {
  // A run that failed nothing may keep no report at all.
  if (!/no valid artifacts/.test(String(err))) throw err;
  console.log(`take-ci-baselines: run ${id} (${conclusion}) kept no report, so no picture changed`);
  process.exit(0);
}
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const actual = walk(dir).filter((f) => /visual-.*-actual\.png$/.test(f));
if (!actual.length) {
  console.log(`take-ci-baselines: run ${id} (${conclusion}) changed no picture`);
  process.exit(0);
}
for (const f of actual) {
  const name = basename(f).replace("-actual", "");
  console.log(`${name}\n  look at: ${f.replace("-actual", "-diff")}`);
  if (take) copyFileSync(f, join(root, "e2e", "snapshots", name));
}
console.log(
  take
    ? `\ntake-ci-baselines: ${actual.length} baseline(s) written to e2e/snapshots/; commit them with the change`
    : `\ntake-ci-baselines: ${actual.length} picture(s) changed; look at each diff, then run again with --take`,
);
