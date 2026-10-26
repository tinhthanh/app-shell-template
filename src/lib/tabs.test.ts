// node --experimental-strip-types --test src/lib/tabs.test.ts (pnpm test)
// Two tabs, played by one: what another tab says reaches this one, and
// what this one does is told to the others.
import assert from "node:assert/strict";
import { test } from "node:test";

const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { startTabs } = await import("./tabs.ts");
const { signedIn, signedOut, useSession } = await import("./session.ts");
const { usePrefs } = await import("./prefs.ts");
const { useStore } = await import("./store.ts");

type Listener = (e: { data: unknown }) => void;
const posted: unknown[] = [];
let hear: Listener = () => {};
let storageHeard: (e: { key: string | null; newValue: string | null }) => void = () => {};
const heard: string[] = [];
startTabs(
  {
    postMessage: (m) => posted.push(m),
    addEventListener: (_t, l) => {
      hear = l;
    },
  },
  {
    addEventListener: (_t, l) => {
      storageHeard = l;
    },
  },
  { signedOut: () => heard.push("signed-out"), signedIn: () => heard.push("signed-in") },
);
const alex = { id: "u", name: "Alex", email: "a@acme.test", role: "owner" } as const;

test("another tab signing in or out reaches this one; a message that isn't one is ignored", () => {
  hear({ data: { type: "signed-out" } });
  hear({ data: { type: "signed-in" } });
  hear({ data: { type: "hello" } });
  hear({ data: null });
  assert.deepEqual(heard, ["signed-out", "signed-in"]);
});

test("signing out here tells the other tabs; a sign-out another tab told, or nobody signed in, doesn't", () => {
  posted.length = 0;
  signedIn(alex);
  signedOut();
  signedOut();
  signedIn(alex);
  signedOut({ fromOtherTab: true });
  assert.deepEqual(posted, [{ type: "signed-out" }]);
  assert.equal(useSession.getState().status, "signed-out");
});

test("a sign-in the person made here is told; one read at start isn't", () => {
  posted.length = 0;
  signedIn(alex);
  signedIn(alex, { tell: true });
  assert.deepEqual(posted, [{ type: "signed-in" }]);
});

test("a setting another tab saved is the setting here, held to its shape, and isn't saved back", () => {
  store.delete("app.prefs");
  storageHeard({ key: "app.prefs", newValue: JSON.stringify({ density: "comfortable", sidebarWidth: 9000, version: 1 }) });
  assert.equal(usePrefs.getState().density, "comfortable");
  assert.equal(usePrefs.getState().sidebarWidth, 420);
  assert.equal(store.get("app.prefs"), undefined);
  // What isn't JSON, or a key that isn't ours, changes nothing.
  storageHeard({ key: "app.prefs", newValue: "{oops" });
  storageHeard({ key: "other", newValue: JSON.stringify({ density: "compact" }) });
  assert.equal(usePrefs.getState().density, "comfortable");
  // A change made here is saved as before.
  usePrefs.setState({ density: "compact" });
  assert.equal(JSON.parse(store.get("app.prefs") ?? "{}").density, "compact");
});

test("a theme another tab picked is the theme here, and isn't saved back", () => {
  store.delete("app.ui");
  storageHeard({ key: "app.ui", newValue: JSON.stringify({ themeId: "nord" }) });
  assert.equal(useStore.getState().themeId, "nord");
  assert.equal(store.get("app.ui"), undefined);
  storageHeard({ key: "app.ui", newValue: JSON.stringify({ themeId: 4 }) });
  storageHeard({ key: "app.ui", newValue: null });
  assert.equal(useStore.getState().themeId, "nord");
});

test("a longer session another tab took is this tab's too, so none signs out at the old end", () => {
  signedIn({ ...alex, sessionEndsAt: "2026-10-26T10:03:00.000Z" });
  hear({ data: { type: "refreshed", user: { ...alex, sessionEndsAt: "2026-10-26T10:30:00.000Z" } } });
  assert.equal(useSession.getState().user?.sessionEndsAt, "2026-10-26T10:30:00.000Z");
  // A malformed one, or one while signed out, changes nothing.
  hear({ data: { type: "refreshed", user: null } });
  signedOut({ fromOtherTab: true });
  hear({ data: { type: "refreshed", user: alex } });
  assert.equal(useSession.getState().status, "signed-out");
});

test("taking a longer session here tells the other tabs", async () => {
  const { refreshed } = await import("./session.ts");
  posted.length = 0;
  refreshed({ ...alex, sessionEndsAt: "2026-10-26T11:00:00.000Z" });
  assert.deepEqual(posted, [{ type: "refreshed", user: { ...alex, sessionEndsAt: "2026-10-26T11:00:00.000Z" } }]);
});

test("another tab's workspace stays its own: this tab keeps the one it shows", () => {
  usePrefs.setState({ workspace: "w-acme" });
  storageHeard({ key: "app.prefs", newValue: JSON.stringify({ workspace: "w-globex", density: "comfortable", version: 1 }) });
  assert.equal(usePrefs.getState().workspace, "w-acme");
  assert.equal(usePrefs.getState().density, "comfortable");
});
