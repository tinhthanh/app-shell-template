// Fails when a view, a settings section or a shortcut is only half wired:
// the parts AGENTS.md › Adding things lists must all be there, or the app
// has a place that reloads to Home, a section the URL can't name, or a key
// that does nothing.
//
//   - every View kind (src/lib/store.ts) has a case in hashToView
//     (src/lib/routes.ts), a round trip in routes.test.ts, an entry in
//     viewTitles (App.tsx, home excepted), and an axe scene (e2e/a11y.spec.ts);
//   - every SettingsSectionId is in routes.ts's SECTIONS and settings-view.tsx;
//   - every shortcut id (src/lib/shortcuts.json) has a case in run
//     (src/hooks/use-shortcuts.ts).
//
//   node scripts/check-views.mjs
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (p) => readFile(resolve(root, p), "utf8");
const problems = [];

const store = await read("src/lib/store.ts");
const viewType = /export type View =([\s\S]*?);\n/.exec(store)?.[1] ?? "";
const kinds = [...new Set([...viewType.matchAll(/kind: "(\w+)"/g)].map((m) => m[1]))];
if (!kinds.length) problems.push("src/lib/store.ts: found no View kinds");
const sections = [...(/export type SettingsSectionId =([^;]*);/.exec(store)?.[1].matchAll(/"(\w+)"/g) ?? [])].map((m) => m[1]);

const routes = await read("src/lib/routes.ts");
const routesTest = await read("src/lib/routes.test.ts");
const app = await read("src/App.tsx");
const a11y = await read("e2e/a11y.spec.ts");
const settingsView = await read("src/views/settings/settings-view.tsx");

for (const k of kinds) {
  if (k !== "home" && !new RegExp(`case "${k}":`).test(routes)) problems.push(`view ${k}: no case in hashToView (src/lib/routes.ts)`);
  if (!routesTest.includes(`kind: "${k}"`)) problems.push(`view ${k}: no round trip in src/lib/routes.test.ts`);
  if (k !== "home" && !new RegExp(`\\b${k}: (?:"|t\\()`).test(/viewTitles =([\s\S]*?)satisfies/.exec(app)?.[1] ?? "")) problems.push(`view ${k}: no viewTitles entry in src/App.tsx`);
  if (!new RegExp(`id: ["\`]${k}\\b`).test(a11y)) problems.push(`view ${k}: no axe scene in e2e/a11y.spec.ts (a scene whose id starts with "${k}")`);
}
const routeSections = /const SECTIONS[^=]*=\s*\[([^\]]*)\]/.exec(routes)?.[1] ?? "";
for (const s of sections) {
  if (!routeSections.includes(`"${s}"`)) problems.push(`settings section ${s}: not in SECTIONS (src/lib/routes.ts), so #/settings/${s} can't be opened`);
  if (!settingsView.includes(`id: "${s}"`)) problems.push(`settings section ${s}: not in SECTIONS (src/views/settings/settings-view.tsx)`);
  if (!a11y.includes(`settings ${s}`)) problems.push(`settings section ${s}: no axe scene in e2e/a11y.spec.ts`);
}

const shortcuts = JSON.parse(await read("src/lib/shortcuts.json")).shortcuts;
const run = await read("src/hooks/use-shortcuts.ts");
for (const { id } of shortcuts) if (!run.includes(`case "${id}"`)) problems.push(`shortcut ${id}: no case in run (src/hooks/use-shortcuts.ts)`);

if (problems.length) {
  console.error(`something is half wired (AGENTS.md › Adding things):\n\n  ${problems.join("\n  ")}\n`);
  process.exit(1);
}
console.log(`check-views: ${kinds.length} views, ${sections.length} settings sections and ${shortcuts.length} shortcuts are wired`);
