// A size budget for what the app loads at startup: the scripts and styles
// dist/index.html references, gzipped. It fails when they grow past the
// budget, so a dependency that doubles the bundle is noticed in the PR
// that adds it, not later. Run after pnpm build.
//
//   node scripts/check-size.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

// The budget sits some 7% above what the app needs today (200 KB of
// JS on 2026-10-26, the libraries 148 KB of it, after the palette, the
// sign-in page and the new-workspace form went lazy), so a new view or
// resource, which loads on demand, fits, and a dependency that doubles
// the bundle does not. Raising it is a PR with the reason here.
const BUDGET = { js: 220_000, css: 45_000 };
// Each piece that loads later (a view, a dialog) has its own ceiling: the
// largest today is the Kit page, at 24 KB. A view past it is pulling in
// something that should be its own chunk, or isn't needed at all.
const LAZY_BUDGET = 40_000;
const dist = resolve(import.meta.dirname, "../dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const gz = (file) => gzipSync(readFileSync(resolve(dist, file))).length;
const sum = (ext) => refs.filter((f) => f.endsWith(ext)).reduce((n, f) => n + gz(f), 0);
const js = sum(".js");
const css = sum(".css");
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `check-size: startup JS ${kb(js)} gzipped (budget ${kb(BUDGET.js)}), CSS ${kb(css)} (budget ${kb(BUDGET.css)}); ${refs.length} files, ${kb(refs.reduce((n, f) => n + statSync(resolve(dist, f)).size, 0))} raw`,
);
const lazy = readdirSync(resolve(dist, "assets"))
  .filter((f) => f.endsWith(".js") && !refs.includes(`assets/${f}`))
  .map((f) => ({ f, n: gz(`assets/${f}`) }))
  .sort((a, b) => b.n - a.n);
const heavy = lazy.filter((c) => c.n > LAZY_BUDGET);
console.log(`check-size: ${lazy.length} pieces load later, the largest ${lazy[0] ? `${lazy[0].f.replace(/-[\w-]{8}\.js$/, "")} at ${kb(lazy[0].n)}` : "none"} (budget ${kb(LAZY_BUDGET)} each)`);
if (js > BUDGET.js || css > BUDGET.css) {
  console.error("check-size: over budget. Lazy-load what isn't needed at startup (lib/lazy-view.tsx), or raise the budget in scripts/check-size.mjs with a reason.");
  process.exit(1);
}
if (heavy.length) {
  console.error(`check-size: ${heavy.map((c) => `${c.f} (${kb(c.n)})`).join(", ")} over ${kb(LAZY_BUDGET)}. Split what only part of it needs, or raise LAZY_BUDGET with a reason.`);
  process.exit(1);
}
