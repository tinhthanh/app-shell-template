// Sets up a repository made from this template, once, with the gh CLI
// signed in as its owner: the guardrail-change label the guardrails job
// asks for, the ruleset that makes main take only green squash-merged
// pull requests (.github/rulesets/main.json), and the owner in
// .github/CODEOWNERS. It says what is left: the Pages source and the
// API_URL or MOCK variable. Running it again changes nothing.
//
//   node scripts/setup-repo.mjs             the repository of this checkout
//   node scripts/setup-repo.mjs --dry-run   say what it would do
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dry = process.argv.includes("--dry-run");
const gh = (...args) => execFileSync("gh", args, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const ghIn = (input, ...args) => execFileSync("gh", args, { cwd: root, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const step = (what, fn) => {
  console.log(`${dry ? "would" : "setup"}: ${what}`);
  if (!dry) fn();
};

if (spawnSync("gh", ["auth", "status"], { stdio: "ignore" }).status !== 0) {
  console.error("setup-repo: sign in with gh auth login first");
  process.exit(1);
}
const repo = gh("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner");
const owner = repo.split("/")[0];
console.log(`setup-repo: ${repo}`);

const labels = gh("label", "list", "--limit", "200", "--json", "name", "-q", ".[].name").split("\n");
if (!labels.includes("guardrail-change"))
  step("the guardrail-change label", () => gh("label", "create", "guardrail-change", "--color", "D93F0B", "--description", "Changes a check, a config or the rules agents follow"));

const rulesets = JSON.parse(gh("api", `repos/${repo}/rulesets`));
if (!rulesets.some((r) => r.name === "main"))
  step("the ruleset on main (squash merges only, the three checks green, no force push)", () =>
    ghIn(readFileSync(resolve(root, ".github/rulesets/main.json"), "utf8"), "api", "-X", "POST", `repos/${repo}/rulesets`, "--input", "-"),
  );

const codeowners = resolve(root, ".github/CODEOWNERS");
const text = readFileSync(codeowners, "utf8");
const next = text.replace(/@[\w-]+/g, `@${owner}`);
if (next !== text) step(`@${owner} as the owner in .github/CODEOWNERS (commit it)`, () => writeFileSync(codeowners, next));

const vars = gh("variable", "list", "--json", "name", "-q", ".[].name").split("\n");
console.log("");
if (!vars.includes("API_URL") && !vars.includes("MOCK"))
  console.log(`left to do: Pages publishes nothing until the repository has a variable, API_URL (your API) or MOCK=1 (a demo on the fixtures):
  gh variable set MOCK --body 1
and Settings › Pages › Source is "GitHub Actions" (https://github.com/${repo}/settings/pages).`);
else console.log("Pages is configured; the next push to main publishes it.");
