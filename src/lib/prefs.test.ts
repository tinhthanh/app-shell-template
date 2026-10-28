// node --experimental-strip-types --test src/lib/prefs.test.ts (pnpm test)
// A page to load prefs from: storage and a document, so the module runs.
import assert from "node:assert/strict";
import { test } from "node:test";

const store = new Map<string, string>();
const g = globalThis as unknown as Record<string, unknown>;
const tab = new Map<string, string>();
g.sessionStorage = { getItem: (k: string) => tab.get(k) ?? null, setItem: (k: string, v: string) => void tab.set(k, v), removeItem: (k: string) => void tab.delete(k) };
g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
store.set("app.prefs", JSON.stringify({ density: "comfortable", sidebarWidth: 9000 }));

const { DEFAULTS, fromSaved, migratePrefs, PREFS_VERSION, usePrefs } = await import("./prefs.ts");

test("saved prefs load over the defaults, and a width out of range is held in", () => {
  const p = usePrefs.getState();
  assert.equal(p.density, "comfortable");
  assert.equal(p.uiFontSize, DEFAULTS.uiFontSize);
  assert.equal(p.sidebarWidth, 420);
});

test("the migration stamps the current version", () => {
  assert.equal(migratePrefs({}).version, PREFS_VERSION);
  assert.equal(JSON.parse(store.get("app.prefs")!).version, PREFS_VERSION);
});

test("a change is saved whole", () => {
  usePrefs.setState({ uiFontSize: 14 });
  const saved = JSON.parse(store.get("app.prefs")!);
  assert.equal(saved.uiFontSize, 14);
  assert.equal(saved.density, "comfortable");
});

// fresh loads prefs.ts again, as a new page would, over what is saved now.
async function fresh(saved: Record<string, unknown>, tag: string) {
  store.set("app.prefs", JSON.stringify(saved));
  const m: typeof import("./prefs.ts") = await import(new URL(`./prefs.ts?${tag}`, import.meta.url).href);
  return m.usePrefs.getState();
}

test("the language follows the system until one is chosen", () => {
  assert.equal(DEFAULTS.language, "system");
});

test("prefs saved before there was a language follow the system", () => {
  // The save at the top has no language.
  assert.equal(usePrefs.getState().language, "system");
});

test("a chosen language is kept, and one this build has no words for follows the system", async () => {
  assert.equal(fromSaved({ language: "vi", version: 1 }).language, "vi");
  assert.equal(fromSaved({ language: "klingon" as never, version: 1 }).language, "system");
});

test("an old save gets an empty Recent, nothing folded and a fresh getting-started list", () => {
  const p = usePrefs.getState();
  assert.deepEqual(p.recent, []);
  assert.deepEqual(p.folded, []);
  assert.deepEqual(p.onboarding, { done: [], dismissed: false });
});

test("usage is shared only after a yes: off by default, off for an old save, and anything but true is no", async () => {
  assert.equal(DEFAULTS.shareUsageFor, null);
  assert.equal(usePrefs.getState().shareUsageFor, null);
  // A yes from before it was anyone's (a boolean) is no.
  assert.equal(fromSaved({ shareUsage: true, version: 1 } as never).shareUsageFor, null);
  assert.equal(fromSaved({ shareUsageFor: "u-alex", version: 1 }).shareUsageFor, "u-alex");
});

test("Hide done tasks is off by default, off for an old save, and only true is on", async () => {
  assert.equal(DEFAULTS.hideDoneTasks, false);
  assert.equal(usePrefs.getState().hideDoneTasks, false);
  assert.equal(fromSaved({ hideDoneTasks: "yes" as never, version: 1 }).hideDoneTasks, false);
});

test("a workspace picked is this tab's and the browser's; another save here doesn't put back an older pick", () => {
  usePrefs.setState({ workspace: "w-acme" });
  assert.equal(tab.get("app.workspace"), "w-acme");
  assert.equal(JSON.parse(store.get("app.prefs") ?? "{}").workspace, "w-acme");
  // Another tab picks Globex, then this one opens a record (Recent changes).
  store.set("app.prefs", JSON.stringify({ ...JSON.parse(store.get("app.prefs") ?? "{}"), workspace: "w-globex" }));
  usePrefs.setState({ recent: [{ kind: "project", id: "p-shop", name: "Shop" }] });
  assert.equal(JSON.parse(store.get("app.prefs") ?? "{}").workspace, "w-globex");
  assert.equal(usePrefs.getState().workspace, "w-acme");
});

test("a reload of a tab stays on its own workspace, whatever the browser picked last", async () => {
  tab.set("app.workspace", "w-acme");
  assert.equal((await fresh({ workspace: "w-globex", version: 1 }, "tab-own")).workspace, "w-acme");
  // A new tab (nothing kept for it) opens on the browser's last pick: what fromSaved reads.
  assert.equal(fromSaved({ workspace: "w-globex", version: 1 }).workspace, "w-globex");
});
