// node --experimental-strip-types --test src/lib/prefs.test.ts (pnpm test)
// A page to load prefs from: storage and a document, so the module runs.
import assert from "node:assert/strict";
import { test } from "node:test";

const store = new Map<string, string>();
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
store.set("app.prefs", JSON.stringify({ density: "comfortable", sidebarWidth: 9000 }));

const { DEFAULTS, migratePrefs, PREFS_VERSION, usePrefs } = await import("./prefs.ts");

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
  assert.equal((await fresh({ language: "vi", version: 1 }, "vi")).language, "vi");
  assert.equal((await fresh({ language: "klingon", version: 1 }, "klingon")).language, "system");
});

test("an old save gets an empty Recent, nothing folded and a fresh getting-started list", () => {
  const p = usePrefs.getState();
  assert.deepEqual(p.recent, []);
  assert.deepEqual(p.folded, []);
  assert.deepEqual(p.onboarding, { done: [], dismissed: false });
});

test("usage is shared only after a yes: off by default, off for an old save, and anything but true is no", async () => {
  assert.equal(DEFAULTS.shareUsage, false);
  assert.equal(usePrefs.getState().shareUsage, false);
  assert.equal((await fresh({ shareUsage: "yes", version: 1 }, "share-odd")).shareUsage, false);
});

test("Hide done tasks is off by default, off for an old save, and only true is on", async () => {
  assert.equal(DEFAULTS.hideDoneTasks, false);
  assert.equal(usePrefs.getState().hideDoneTasks, false);
  assert.equal((await fresh({ hideDoneTasks: "yes", version: 1 }, "hide-odd")).hideDoneTasks, false);
});
