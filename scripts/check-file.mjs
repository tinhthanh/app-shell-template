// What the edit hook (.claude/hooks/after-edit.mjs) runs on the file an
// agent has just written: Biome formats it in place, then Biome's errors
// (the house plugins in biome-plugins/ among them) and the checks that read
// a file at a time (check-titles, check-words, check-type, check-grid) look
// at that file alone. A broken rule is said at the edit that broke it, while
// it is fresh, not at the end of the turn by pnpm check. Biome's warnings
// (an import not used yet) are left to pnpm check: mid-change they are noise.
//
//   node scripts/check-file.mjs <file>    exits 1 with what they said, 0 when they pass or the file is none of theirs
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const app = resolve(import.meta.dirname, "..");
const file = process.argv[2] ? resolve(process.argv[2]) : undefined;
const rel = file ? relative(app, file) : "..";
if (!file || rel.startsWith("..") || !existsSync(file) || !/\.(ts|tsx|mjs|json)$/.test(file)) process.exit(0);

// run gives back what a command said when it failed, and nothing when it passed.
const run = (cmd, args) =>
  promisify(execFile)(cmd, args, { cwd: app, maxBuffer: 16 * 1024 * 1024 }).then(
    () => "",
    (e) => `${e.stdout ?? ""}${e.stderr ?? ""}`.trim(),
  );

const said = [];
const biome = join(app, "node_modules/.bin/biome");
// Biome first and alone: it rewrites the file the other checks then read.
if (existsSync(biome)) said.push(await run(biome, ["check", "--write", "--no-errors-on-unmatched", "--diagnostic-level=error", "--colors=off", file]));
if (/^src\/.+\.tsx?$/.test(rel.split("\\").join("/")))
  said.push(...(await Promise.all(["titles", "words", "type", "grid"].map((c) => run(process.execPath, [join(app, `scripts/check-${c}.mjs`), file])))));

const problems = said.filter(Boolean);
if (problems.length) {
  console.error(problems.join("\n\n"));
  process.exit(1);
}
