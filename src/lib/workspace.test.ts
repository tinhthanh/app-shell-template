// node --experimental-strip-types --test src/lib/workspace.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { usePrefs } from "./prefs.ts";
import { addWorkspace, initials, loadWorkspaces, pickWorkspace, settleWorkspace, useWorkspaces } from "./workspace.ts";

const list = [
  { id: "w-acme", name: "Acme" },
  { id: "w-globex", name: "Globex" },
];

test("the workspace kept stays while it is the person's, else the first one shows", () => {
  assert.equal(settleWorkspace("w-globex", list), "w-globex");
  assert.equal(settleWorkspace("w-gone", list), "w-acme");
  assert.equal(settleWorkspace(null, list), "w-acme");
  assert.equal(settleWorkspace("w-acme", []), null);
});

test("picking a workspace keeps it, for the next reload", () => {
  pickWorkspace("w-globex");
  assert.equal(usePrefs.getState().workspace, "w-globex");
});

test("a workspace's tile shows its first letter or digit", () => {
  assert.equal(initials("acme"), "A");
  assert.equal(initials("  9 lives"), "9");
  assert.equal(initials("Đà Nẵng"), "Đ");
  assert.equal(initials("--"), "?");
});

test("after signing in the workspaces are read and one shows; if they can't be, lists read all the same", async () => {
  usePrefs.setState({ workspace: "w-gone" });
  await loadWorkspaces(async () => list);
  assert.equal(useWorkspaces.getState().status, "ready");
  assert.equal(usePrefs.getState().workspace, "w-acme");
  await loadWorkspaces(() => Promise.reject(new Error("down")));
  assert.equal(useWorkspaces.getState().status, "failed");
});

test("a new workspace goes on the rail and shows", () => {
  addWorkspace({ id: "w-initech", name: "Initech" });
  assert.ok(useWorkspaces.getState().list.some((w) => w.id === "w-initech"));
  assert.equal(usePrefs.getState().workspace, "w-initech");
});
