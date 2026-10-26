// node --experimental-strip-types --test src/lib/signout.test.ts (pnpm test)
// What the person who signs out leaves behind on a shared machine: nothing.
import assert from "node:assert/strict";
import { test } from "node:test";

import { setPlaceBadge, usePlaceBadges } from "./badges.ts";
import { notify, useNotifications } from "./notifications.ts";
import { setPrefs, usePrefs } from "./prefs.ts";
import { signedIn, signedOut } from "./session.ts";
import { loadWorkspaces, useWorkspaces } from "./workspace.ts";

test("signing out forgets the person's notices, counts, workspaces and Recent", async () => {
  signedIn({ id: "u-a", name: "A", email: "a@acme.test", role: "owner" });
  await loadWorkspaces(async () => [{ id: "w-acme", name: "Acme" }]);
  notify({ title: "Shop is now paused" });
  setPlaceBadge("projects", 8);
  setPrefs({ recent: [{ kind: "project", id: "p-shop", name: "Shop" }] });
  signedOut();
  assert.deepEqual(useNotifications.getState().notices, []);
  assert.deepEqual(usePlaceBadges.getState(), {});
  assert.equal(useWorkspaces.getState().status, "loading");
  assert.deepEqual(useWorkspaces.getState().list, []);
  assert.equal(usePrefs.getState().workspace, null);
  assert.deepEqual(usePrefs.getState().recent, []);
});

test("an answer to a workspaces load from before a sign-out is dropped", async () => {
  let answer: (list: { id: string; name: string }[]) => void = () => {};
  const late = loadWorkspaces(() => new Promise((r) => (answer = r)));
  signedOut();
  answer([{ id: "w-old", name: "Old" }]);
  await late;
  assert.deepEqual(useWorkspaces.getState().list, []);
});

test("signing out forgets the person's yes to sharing usage, so the next person is asked", async () => {
  const { setPrefs, usePrefs } = await import("./prefs.ts");
  const { signedIn, signedOut } = await import("./session.ts");
  signedIn({ id: "u", name: "A", email: "a@acme.test", role: "owner" });
  setPrefs({ shareUsage: true });
  signedOut();
  assert.equal(usePrefs.getState().shareUsage, false);
});

test("leaving for another workspace leaves an open record and a project filter for the list", async () => {
  const { useStore } = await import("./store.ts");
  const { switchWorkspace } = await import("./workspace.ts");
  const { usePrefs } = await import("./prefs.ts");
  useStore.getState().setView({ kind: "tasks", id: "t-icons" });
  switchWorkspace("w-globex");
  assert.deepEqual(useStore.getState().view, { kind: "tasks" });
  assert.equal(usePrefs.getState().workspace, "w-globex");
  useStore.getState().setView({ kind: "tasks", project: "p-ios", q: "x" });
  switchWorkspace("w-acme");
  assert.deepEqual(useStore.getState().view, { kind: "tasks" });
  // A list with no record in it keeps its filters.
  useStore.getState().setView({ kind: "projects", status: "paused" });
  switchWorkspace("w-globex");
  assert.deepEqual(useStore.getState().view, { kind: "projects", status: "paused" });
});
