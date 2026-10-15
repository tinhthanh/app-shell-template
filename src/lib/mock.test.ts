// node --experimental-strip-types --test src/lib/mock.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { FIXTURES, mockClient } from "./mock.ts";

test("the fixtures list, read one, and keep an update", async () => {
  const c = mockClient({ latency: 0 });
  const all = await c.projects();
  assert.equal(all.length, FIXTURES.length);
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
  assert.equal((await c.projects()).length, FIXTURES.length + 1);
  await assert.rejects(c.createProject({ name: "Shop", description: "" }), (e: unknown) => e instanceof ApiError && e.code === "invalid");
  await c.deleteProject(p.id);
  await assert.rejects(c.project(p.id), (e: unknown) => e instanceof ApiError && e.status === 404);
  await assert.rejects(c.deleteProject("nope"), (e: unknown) => e instanceof ApiError && e.status === 404);
});

test("failOnce fails the first call only, and failWrites only the writes", async () => {
  const once = mockClient({ latency: 0, failOnce: true });
  await assert.rejects(once.projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.equal((await once.projects()).length, FIXTURES.length);
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
  const a = await mockClient({ latency: 0, many: true }).projects();
  const b = await mockClient({ latency: 0, many: true }).projects();
  assert.equal(a.length, 5000);
  assert.deepEqual(a[4999], b[4999]);
  assert.equal(new Set(a.map((p) => p.id)).size, 5000);
});

test("fail makes every call a 503, and empty starts with nothing", async () => {
  await assert.rejects(mockClient({ latency: 0, fail: true }).projects(), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.deepEqual(await mockClient({ latency: 0, empty: true }).projects(), []);
});
