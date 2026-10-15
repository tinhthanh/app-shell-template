// node --experimental-strip-types --test src/lib/api.test.ts (pnpm test)
// The HTTP client against a fetch that answers what the test says.
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { ApiError, errorBody, httpClient, READ_TIMEOUT_MS } from "./api.ts";

type Answer = { status: number; body?: string; json?: unknown; hang?: boolean; throws?: Error };
const calls: { url: string; init: RequestInit }[] = [];
let answer: Answer = { status: 200, json: [] };
(globalThis as unknown as { fetch: unknown }).fetch = (url: string, init: RequestInit) => {
  calls.push({ url, init });
  if (answer.throws) return Promise.reject(answer.throws);
  if (answer.hang)
    return new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
  const text = answer.body ?? JSON.stringify(answer.json);
  return Promise.resolve({ ok: answer.status < 400, status: answer.status, statusText: "", text: () => Promise.resolve(text), json: () => Promise.resolve(JSON.parse(text)) });
};
const client = httpClient("http://api.test");

test.beforeEach(() => {
  calls.length = 0;
  answer = { status: 200, json: [] };
});

test("reads GET their path and writes PATCH JSON, ids escaped", async () => {
  answer = { status: 200, json: { id: "a b", name: "x" } };
  await client.project("a b");
  assert.equal(calls[0]?.url, "http://api.test/projects/a%20b");
  assert.equal(calls[0]?.init.method, "GET");
  await client.updateProject("a b", { status: "paused" });
  assert.equal(calls[1]?.init.method, "PATCH");
  assert.equal(calls[1]?.init.body, JSON.stringify({ status: "paused" }));
  assert.deepEqual(calls[1]?.init.headers, { "Content-Type": "application/json" });
});

test("create POSTs the project and delete DELETEs it, with nothing to parse", async () => {
  answer = { status: 200, json: { id: "p-x" } };
  await client.createProject({ name: "X", description: "" });
  assert.equal(calls[0]?.init.method, "POST");
  assert.equal(calls[0]?.url, "http://api.test/projects");
  answer = { status: 204, body: "" };
  assert.equal(await client.deleteProject("p x"), undefined);
  assert.equal(calls[1]?.url, "http://api.test/projects/p%20x");
  assert.equal(calls[1]?.init.method, "DELETE");
});

test("a failed response is an ApiError with the server's message and code", async () => {
  answer = { status: 404, json: { error: "No project is called x.", code: "not_found" } };
  await assert.rejects(client.project("x"), (e: unknown) => e instanceof ApiError && e.status === 404 && e.code === "not_found" && e.message === "No project is called x.");
  answer = { status: 500, body: "boom" };
  await assert.rejects(client.projects(), (e: unknown) => e instanceof ApiError && e.status === 500 && e.message === "boom");
  assert.deepEqual(errorBody("", "fallback"), { message: "fallback" });
  assert.deepEqual(errorBody('{"error":"x","code":"y"}', "f"), { message: "x", code: "y" });
});

test("a network failure is an ApiError with code network", async () => {
  answer = { throws: new TypeError("Failed to fetch"), status: 0 };
  await assert.rejects(client.projects(), (e: unknown) => e instanceof ApiError && e.code === "network" && e.status === 0);
});

test("a read that never answers is cut off after the read timeout; a write is left alone", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  answer = { hang: true, status: 0 };
  const read = client.projects();
  mock.timers.tick(READ_TIMEOUT_MS + 1);
  await assert.rejects(read, (e: unknown) => e instanceof ApiError && e.code === "timeout");
  const write = client.updateProject("x", {});
  mock.timers.tick(READ_TIMEOUT_MS * 10);
  assert.equal(calls[1]?.init.signal, undefined);
  // Still pending: nothing aborted it.
  assert.equal(
    await Promise.race([
      write.then(
        () => "done",
        () => "failed",
      ),
      Promise.resolve("pending"),
    ]),
    "pending",
  );
  mock.timers.reset();
});

test("the URL may pick the mock or the API only while the knobs are on", async () => {
  const { apiBase, isMock, knobsOn } = await import("./api.ts");
  const prod = { VITE_API_URL: "https://api.acme.test" };
  assert.equal(knobsOn(prod), false);
  assert.equal(apiBase("?api=https://evil.test", prod), "https://api.acme.test");
  assert.equal(isMock("?mock=1", prod), false);
  // No API at all: the fixtures, whatever the URL says.
  assert.equal(isMock("", {}), true);
  // Development, or a demo build: the URL wins.
  const dev = { DEV: true, VITE_API_URL: "https://api.acme.test" };
  assert.equal(apiBase("?api=http://localhost:8080", dev), "http://localhost:8080");
  assert.equal(isMock("?mock=1", dev), true);
  assert.equal(isMock("?mock=0", dev), false);
  assert.equal(isMock("?mock=1", { VITE_KNOBS: "1", VITE_API_URL: "x" }), true);
});

test("the host's config.js wins over the build's env, and can force the fixtures", async () => {
  const { apiBase, isMock } = await import("./api.ts");
  const env = { VITE_API_URL: "https://built.test" };
  assert.equal(apiBase("", env, { apiUrl: "https://host.test" }), "https://host.test");
  assert.equal(apiBase("", env, {}), "https://built.test");
  assert.equal(isMock("", env, { mock: true }), true);
  assert.equal(isMock("", env, { apiUrl: "https://host.test" }), false);
});
