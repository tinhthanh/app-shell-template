// Fails when the app lays something out off the grid.
//
// Every edge and line comes from the grid's tokens (src/index.css, "The
// layout grid"): h-bar for the top band (the sidebar's strip, a view's
// header, Settings' strip), px-edge and px-lane for where boxes and their
// content start in a column, px-page for a full page's gutter. Two things
// break it, and this finds them:
//
// - A bar of its own height: a strip with a bottom border at h-9, h-10,
//   h-12… instead of h-bar. Each such height is a line that won't meet its
//   neighbour's.
// - A gutter in raw pixels (ps-[11px], me-[15px]): a step nobody chose,
//   and why two columns that should line up don't.
//
// coss ui's own parts (src/components/ui) keep theirs. An element with a
// `grid-ok: why` comment on one of the two lines above it is a deliberate
// exception and says why. After Shipyard's (github.com/cosscom/shipyard, MIT).
//
//   node scripts/check-grid.mjs            check src/
//   node scripts/check-grid.mjs --count    how many each file has, most first
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const app = resolve(import.meta.dirname, "..");
const src = join(app, "src");

// A className string: a bar is one with a bottom border and a fixed height.
const CLASS = /className=(?:"([^"]*)"|\{cn\(\s*"([^"]*)")/g;
const OFF_BAR = /(?<![\w-])(?:min-)?h-(?:7|7\.5|8|9|10|11|12|14|\[[0-9.]+px\])(?![\w.[-])/;
const BAR = /(?<![\w-])border-b(?![\w-])/;
// A horizontal padding or margin in raw pixels, outside calc().
const RAW_GUTTER = /(?<![\w-])-?(?:p|px|ps|pe|m|mx|ms|me)-\[[0-9.]+px\](?![\w-])/g;

async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (relative(src, p) === join("components", "ui")) continue;
      yield* files(p);
    } else if (/\.tsx$/.test(e.name)) yield p;
  }
}

const found = [];
for await (const f of files(src)) {
  const rel = relative(src, f);
  const lines = (await readFile(f, "utf8")).split("\n");
  lines.forEach((line, i) => {
    if (/grid-ok:/.test(`${lines[i - 2] ?? ""} ${lines[i - 1] ?? ""} ${line}`)) return;
    for (const m of line.matchAll(CLASS)) {
      const cls = m[1] ?? m[2];
      const h = cls.match(OFF_BAR);
      if (h && BAR.test(cls)) found.push({ rel, line: i + 1, what: `${h[0]} on a bar`, fix: "use h-bar (the top band)" });
    }
    for (const m of line.matchAll(RAW_GUTTER)) found.push({ rel, line: i + 1, what: m[0], fix: "use the grid (px-edge, px-lane, px-page) or the spacing scale" });
  });
}

if (process.argv.includes("--count")) {
  const by = new Map();
  for (const f of found) by.set(f.rel, (by.get(f.rel) ?? 0) + 1);
  for (const [rel, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)} ${rel}`);
  console.log(`${found.length} off the grid in ${by.size} files`);
  process.exit(0);
}
if (found.length) {
  for (const f of found) console.error(`src/${f.rel}:${f.line}: ${f.what} — ${f.fix}`);
  console.error(`\n${found.length} off the grid. See the comment in scripts/check-grid.mjs and "The layout grid" in src/index.css.`);
  process.exit(1);
}
console.log("check-grid: everything is on the grid");
