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
