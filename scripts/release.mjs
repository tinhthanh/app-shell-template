// Prepares a release: sets package.json's version and turns the changelog's
// Unreleased section into this version's, dated. Commit it as
// "chore: release X.Y.Z" on a branch, merge the PR, then push the tag
// vX.Y.Z: .github/workflows/release.yml does the rest.
//
//   node scripts/release.mjs 0.2.0
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("usage: node scripts/release.mjs X.Y.Z");
  process.exit(1);
}
const root = resolve(import.meta.dirname, "..");
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
if (pkg.version === version) {
  console.error(`package.json is already ${version}`);
  process.exit(1);
}
const logPath = resolve(root, "CHANGELOG.md");
const log = readFileSync(logPath, "utf8");
const [, body = ""] = /## Unreleased\n([\s\S]*?)(?=\n## |$)/.exec(log) ?? [];
if (!body.trim()) {
  console.error("CHANGELOG.md has nothing under ## Unreleased");
  process.exit(1);
}
const date = new Date().toISOString().slice(0, 10);
writeFileSync(logPath, log.replace("## Unreleased\n", `## Unreleased\n\n## ${version} (${date})\n`));
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`release ${version}: package.json and CHANGELOG.md updated; commit as "chore: release ${version}", merge, then: git tag v${version} && git push origin v${version}`);
