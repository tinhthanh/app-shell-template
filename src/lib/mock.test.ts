// node --experimental-strip-types --test src/lib/mock.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { FIXTURES, mockClient } from "./mock.ts";

test("the fixtures list, read one, and keep an update", async () => {
  const c = mockClient({ latency: 0 });
  const all = await c.projects();
  assert.equal(all.items.length, FIXTURES.length);
  assert.equal(all.total, FIXTURES.length);
  assert.equal(all.next, undefined);
  const one = await c.project("p-shop");
  assert.equal(one.name, "Shop");
  const updated = await c.updateProject("p-shop", { status: "paused" });
  assert.equal(updated.status, "paused");
  assert.equal((await c.project("p-shop")).status, "paused");
  // What a caller holds is a copy: changing it changes nothing.
  updated.name = "x";
  assert.equal((await c.project("p-shop")).name, "Shop");
});

test("an unknown id is a 404 with a code", async () => {
  const c = mockClient({ latency: 0 });
  await assert.rejects(c.project("nope"), (e: unknown) => e instanceof ApiError && e.status === 404 && e.code === "not_found");
});

test("a name that is empty or taken is refused as invalid", async () => {
  const c = mockClient({ latency: 0 });
  await assert.rejects(c.updateProject("p-shop", { name: " " }), (e: unknown) => e instanceof ApiError && e.code === "invalid" && e.field === "name");
  await assert.rejects(c.updateProject("p-shop", { name: "docs" }), (e: unknown) => e instanceof ApiError && e.status === 422);
  assert.equal((await c.updateProject("p-shop", { name: "Shop 2" })).name, "Shop 2");
});

test("a project is created with an id from its name, and deleted", async () => {
  const c = mockClient({ latency: 0 });
  const p = await c.createProject({ name: "Loyalty Cards", description: "Points and perks." });
  assert.equal(p.id, "p-loyalty-cards");
  assert.equal((await c.projects()).total, FIXTURES.length + 1);
  await assert.rejects(c.createProject({ name: "Shop", description: "" }), (e: unknown) => e instanceof ApiError && e.code === "invalid");
  await c.deleteProject(p.id);
  await assert.rejects(c.project(p.id), (e: unknown) => e instanceof ApiError && e.status === 404);
  await assert.rejects(c.deleteProject("nope"), (e: unknown) => e instanceof ApiError && e.status === 404);
});

test("failOnce fails the first call only, and failWrites only the writes", async () => {
  const once = mockClient({ latency: 0, failOnce: true });
  await assert.rejects(once.projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.equal((await once.projects()).total, FIXTURES.length);
  const writes = mockClient({ latency: 0, failWrites: true });
  assert.equal((await writes.project("p-shop")).name, "Shop");
  await assert.rejects(writes.updateProject("p-shop", { status: "paused" }), (e: unknown) => e instanceof ApiError && e.status === 503);
});

test("signed out, every call is a 401 that says so, until a sign-in with a password", async () => {
  const seen: number[] = [];
  const c = mockClient({ latency: 0, signedOut: true, onUnauthorized: () => seen.push(1) });
  await assert.rejects(c.me(), (e: unknown) => e instanceof ApiError && e.status === 401);
  await assert.rejects(c.projects(), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(seen.length, 2);
  await assert.rejects(c.signIn("alex@acme.test", ""), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal((await c.signIn("alex@acme.test", "x")).name, "Alex Rivera");
  assert.equal((await c.me()).email, "alex@acme.test");
  await c.signOut();
  await assert.rejects(c.me(), (e: unknown) => e instanceof ApiError && e.status === 401);
});

test("search finds projects by a few letters, best first", async () => {
  const c = mockClient({ latency: 0 });
  assert.deepEqual(
    (await c.search("ware")).map((h) => h.name),
    ["Warehouse"],
  );
  assert.deepEqual(
    (await c.search("app")).map((h) => h.name),
    ["Android app", "iOS app"],
  );
  assert.deepEqual(await c.search(""), []);
});

test("many gives thousands of projects, the same every time", async () => {
  const a = await mockClient({ latency: 0, many: true }).projects({ limit: 5000 });
  const b = await mockClient({ latency: 0, many: true }).projects({ limit: 5000 });
  assert.equal(a.total, 5000);
  assert.deepEqual(a.items[4999], b.items[4999]);
  assert.equal(new Set(a.items.map((p) => p.id)).size, 5000);
});

test("the list comes a page at a time, each starting where the last one ended", async () => {
  const c = mockClient({ latency: 0, many: true });
  const first = await c.projects();
  assert.equal(first.items.length, 50);
  assert.equal(first.total, 5000);
  assert.equal(first.next, "50");
  const second = await c.projects({ cursor: first.next });
  assert.equal(second.items[0]?.id, "p-51");
  const last = await c.projects({ cursor: "4990" });
  assert.equal(last.items.length, 10);
  assert.equal(last.next, undefined);
  assert.equal((await c.projects({ limit: 120 })).items.length, 120);
});

test("the server filters by search, status and tags, and sorts by a column either way", async () => {
  const c = mockClient({ latency: 0 });
  const names = async (q: Parameters<typeof c.projects>[0]) => (await c.projects(q)).items.map((p) => p.name);
  assert.deepEqual(await names({ q: "app" }), ["iOS app", "Android app"]);
  assert.deepEqual(await names({ q: "app", status: "active" }), ["iOS app"]);
  assert.deepEqual(await names({ tags: ["web", "ops"] }), ["Legacy admin"]);
  assert.equal((await c.projects({ q: "app" })).total, 2);
  assert.equal((await names({ sort: "name:asc" }))[0], "Android app");
  assert.equal((await names({ sort: "name:desc" }))[0], "Warehouse");
  assert.equal((await names({ sort: "nope:asc" }))[0], "Shop");
});

test("the tags in use are listed once each, in order", async () => {
  assert.deepEqual(await mockClient({ latency: 0 }).projectTags(), ["backend", "design", "mobile", "ops", "payments", "web"]);
});

test("failMore fails the first read of a later page once, and Try again gets it", async () => {
  const c = mockClient({ latency: 0, many: true, failMore: true });
  const first = await c.projects();
  await assert.rejects(c.projects({ cursor: first.next }), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.equal((await c.projects({ cursor: first.next })).items[0]?.id, "p-51");
});

test("fail makes every call a 503, and empty starts with nothing", async () => {
  await assert.rejects(mockClient({ latency: 0, fail: true }).projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.deepEqual(await mockClient({ latency: 0, empty: true }).projects(), { items: [], total: 0 });
});

test("a viewer reads but every write is refused with a 403, and a member may not delete", async () => {
  const viewer = mockClient({ latency: 0, role: "viewer" });
  assert.equal((await viewer.me()).role, "viewer");
  assert.equal((await viewer.projects()).total, FIXTURES.length);
  const forbidden = (e: unknown) => e instanceof ApiError && e.status === 403 && e.code === "forbidden";
  await assert.rejects(viewer.updateProject("p-shop", { status: "paused" }), forbidden);
  await assert.rejects(viewer.createProject({ name: "New", description: "" }), forbidden);
  await assert.rejects(viewer.deleteProject("p-shop"), forbidden);
  const member = mockClient({ latency: 0, role: "member" });
  assert.equal((await member.updateProject("p-shop", { status: "paused" })).status, "paused");
  await assert.rejects(member.deleteProject("p-shop"), forbidden);
  assert.equal((await mockClient({ latency: 0 }).me()).role, "owner");
});

test("failAfter lets the first calls through and fails every one after", async () => {
  const c = mockClient({ latency: 0, failAfter: 1 });
  assert.equal((await c.projects()).total, FIXTURES.length);
  await assert.rejects(c.projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
});

test("a workspace lists its own projects and tags, and a new one is refused without a name or with a taken one", async () => {
  const c = mockClient({ latency: 0 });
  assert.deepEqual(
    (await c.workspaces()).map((w) => w.id),
    ["w-acme", "w-globex"],
  );
  assert.equal((await c.projects({ workspace: "w-acme" })).total, 8);
  assert.deepEqual(
    (await c.projects({ workspace: "w-globex" })).items.map((p) => p.name),
    ["Billing", "Partner portal"],
  );
  assert.deepEqual(await c.projectTags({ workspace: "w-globex" }), ["payments", "web"]);
  await assert.rejects(c.createWorkspace({ name: " " }), (e: unknown) => e instanceof ApiError && e.field === "name");
  await assert.rejects(c.createWorkspace({ name: "acme" }), (e: unknown) => e instanceof ApiError && e.status === 422);
  const made = await c.createWorkspace({ name: "Initech" });
  assert.equal(made.id, "w-initech");
  const p = await c.createProject({ name: "Stapler", description: "", workspace: made.id });
  assert.equal(p.workspace, "w-initech");
});

test("the workspaces read doesn't count as failOnce's first call, but fails with the server", async () => {
  assert.equal((await mockClient({ latency: 0, failOnce: true }).workspaces()).length, 2);
  await assert.rejects(mockClient({ latency: 0, fail: true }).workspaces(), (e: unknown) => e instanceof ApiError && e.status === 503);
});
