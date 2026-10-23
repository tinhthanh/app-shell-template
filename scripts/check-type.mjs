// Fails when the app sizes text any way but the type scale.
//
// Text is sized by role (src/index.css): text-page-title, text-title,
// text-heading, text-subtitle, text-body, text-section, text-row,
// text-desc, text-label, text-meta, text-tag and text-mono. A raw size
// (text-sm, text-xs, text-[11px]) is a new step on the scale that nobody
// chose, and a dozen of those is why two pages that should match don't.
//
// coss ui's own parts (src/components/ui) keep the kit's sizes. A line
// that draws text as a picture says why in a `type-ok:` comment on it or
// on the line above; a file in ALLOW does, for the whole file.
// After Shipyard's (github.com/cosscom/shipyard, MIT).
//
//   node scripts/check-type.mjs            check src/
//   node scripts/check-type.mjs --count    how many each file has, most first
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const app = resolve(import.meta.dirname, "..");
const src = join(app, "src");

const ALLOW = new Map([["lib/segmented-control.ts", "coss ui's toggle styles for the segmented control: the kit's phone and desktop sizes, as components/ui has them"]]);

const RAW = /(?<![\w-])text-(?:\[[0-9.]+(?:px|rem|em)\]|xs|sm|base|lg|xl|[2-9]xl)(?![\w[-])/g;

async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (relative(src, p) === join("components", "ui")) continue;
      yield* files(p);
    } else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) yield p;
  }
}

const found = [];
for await (const f of files(src)) {
  const rel = relative(src, f);
  if (ALLOW.has(rel)) continue;
  const lines = (await readFile(f, "utf8")).split("\n");
  lines.forEach((line, i) => {
    if (line.includes("type-ok:") || lines[i - 1]?.includes("type-ok:")) return;
    for (const m of line.matchAll(RAW)) found.push({ file: `src/${rel}`, line: i + 1, size: m[0] });
  });
}

if (process.argv.includes("--count")) {
  const by = new Map();
  for (const f of found) by.set(f.file, (by.get(f.file) ?? 0) + 1);
  for (const [file, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${file}`);
  process.exit(0);
}
if (found.length) {
  console.error(`check-type: ${found.length} raw text size(s); size text by its role on the type scale (src/index.css):\n  ${found.map((f) => `${f.file}:${f.line}  ${f.size}`).join("\n  ")}`);
  process.exit(1);
}
console.log("check-type: every text size is on the type scale");
