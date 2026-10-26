// node --experimental-strip-types --test src/lib/api.test.ts (pnpm test)
// The HTTP client against a fetch that answers what the test says.
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { ApiError, errorBody, httpClient, listQuery, READ_TIMEOUT_MS } from "./api.ts";

type Answer = { status: number; body?: string; json?: unknown; hang?: boolean; throws?: Error; headers?: Record<string, string> };
const calls: { url: string; init: RequestInit }[] = [];
let answer: Answer = { status: 200, json: [] };
// Answers given one call each, before `answer` takes over.
let queue: Answer[] = [];
(globalThis as unknown as { fetch: unknown }).fetch = (url: string, init: RequestInit) => {
  calls.push({ url, init });
  return reply(queue.shift() ?? answer, init);
};
function reply(answer: Answer, init: RequestInit) {
  if (answer.throws) return Promise.reject(answer.throws);
  if (answer.hang)
    return new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
  const text = answer.body ?? JSON.stringify(answer.json);
  const headers = new Map(Object.entries(answer.headers ?? {}));
  return Promise.resolve({
    ok: answer.status < 400,
    status: answer.status,
    statusText: "",
    headers: { get: (k: string) => headers.get(k) ?? null },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  });
}
// No waiting between retries here; the delays themselves are RETRY_DELAYS_MS.
const client = httpClient("http://api.test", { retryDelays: [0, 0] });

test.beforeEach(() => {
  calls.length = 0;
  queue = [];
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

test("the list asks for its filters, sort and page in the query, and leaves out what is unset", async () => {
  answer = { status: 200, json: { items: [], total: 0 } };
  await client.projects({ q: "a b", status: "active", tags: ["web", "ops"], sort: "name:asc", cursor: "50", limit: 50 });
  assert.equal(calls[0]?.url, "http://api.test/projects?q=a+b&status=active&tags=web%2Cops&sort=name%3Aasc&cursor=50&limit=50");
  await client.projects();
  assert.equal(calls[1]?.url, "http://api.test/projects");
  assert.equal(listQuery({ q: "", tags: [], cursor: undefined }), "");
  await client.projectTags();
  assert.equal(calls[2]?.url, "http://api.test/project-tags");
});

test("search asks the server with the query escaped", async () => {
  answer = { status: 200, json: [] };
  await client.search("a b");
  assert.equal(calls[0]?.url, "http://api.test/search?q=a%20b");
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

test("the session cookie travels, a headers hook adds its own, and a 401 signs out once", async () => {
  const { httpClient: make } = await import("./api.ts");
  const out: number[] = [];
  const c = make("http://api.test", { headers: () => ({ Authorization: "Bearer t" }), onUnauthorized: () => out.push(1) });
  answer = { status: 200, json: [] };
  await c.projects();
  assert.equal(calls[0]?.init.credentials, "include");
  assert.deepEqual(calls[0]?.init.headers, { Authorization: "Bearer t" });
  answer = { status: 401, json: { error: "signed out" } };
  await assert.rejects(c.me(), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.deepEqual(out, [1]);
});

test("a failed response is an ApiError with the server's message and code", async () => {
  answer = { status: 404, json: { error: "No project is called x.", code: "not_found" } };
  await assert.rejects(client.project("x"), (e: unknown) => e instanceof ApiError && e.status === 404 && e.code === "not_found" && e.message === "No project is called x.");
  answer = { status: 500, body: "boom" };
  await assert.rejects(client.projects(), (e: unknown) => e instanceof ApiError && e.status === 500 && e.message === "boom");
  assert.deepEqual(errorBody("", "fallback"), { message: "fallback" });
  assert.deepEqual(errorBody('{"error":"x","code":"y"}', "f"), { message: "x", code: "y", field: undefined });
  // A refusal that names its field: the form puts the message there.
  answer = { status: 422, json: { error: "A project needs a name.", code: "invalid", field: "name" } };
  await assert.rejects(client.createProject({ name: "", description: "" }), (e: unknown) => e instanceof ApiError && e.code === "invalid" && e.field === "name");
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

test("?api= may point at this origin or this machine, never at a stranger's server", async () => {
  const { apiBase, urlApi } = await import("./api.ts");
  const here = "https://demo.acme.test";
  assert.equal(urlApi("?api=/api", here), "/api");
  assert.equal(urlApi("?api=https://demo.acme.test/v2", here), "https://demo.acme.test/v2");
  assert.equal(urlApi("?api=http://localhost:8080", here), "http://localhost:8080");
  assert.equal(urlApi("?api=http://127.0.0.1:9000", here), "http://127.0.0.1:9000");
  assert.equal(urlApi("?api=http://[::1]:9000", here), "http://[::1]:9000");
  // A path the URL parser reads as another host (a backslash, a tab) is a stranger's too.
  for (const bad of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\t/evil.test",
    "/\\/evil.test",
    "https://demo.acme.test.evil.test",
    "http://localhost.evil.test",
    "javascript:alert(1)",
    "not a url",
  ])
    assert.equal(urlApi(`?api=${encodeURIComponent(bad)}`, here), null, bad);
  // Refused, the app falls back to what the build or the host said.
  const demo = { VITE_KNOBS: "1", VITE_API_URL: "https://api.acme.test" };
  assert.equal(apiBase("?api=https://evil.test", demo, {}, here), "https://api.acme.test");
});

test("an answer that isn't JSON is the app's error, with what came back as its details", async () => {
  answer = { status: 200, body: "<!doctype html><title>App</title>" };
  await assert.rejects(client.project("p-shop"), (e: unknown) => e instanceof ApiError && e.code === "bad_response" && e.message.startsWith("<!doctype html>"));
});

test("a read the network dropped or a busy server turned away is tried twice more, then comes", async () => {
  queue = [
    { status: 0, throws: new TypeError("Failed to fetch") },
    { status: 503, body: "busy" },
  ];
  answer = { status: 200, json: { id: "p", name: "P" } };
  assert.equal((await client.project("p")).name, "P");
  assert.equal(calls.length, 3);
});

test("a read that keeps failing gives up after the third try, with the server's error", async () => {
  answer = { status: 503, body: "busy" };
  await assert.rejects(client.project("p"), (e: unknown) => e instanceof ApiError && e.status === 503);
  assert.equal(calls.length, 3);
});

test("a write, a refusal or a 404 is never tried again", async () => {
  answer = { status: 503, body: "busy" };
  await assert.rejects(client.updateProject("p", { status: "paused" }));
  assert.equal(calls.length, 1);
  answer = { status: 404, body: "gone" };
  await assert.rejects(client.project("p"));
  assert.equal(calls.length, 2);
});

test("a server's Retry-After sets the wait before the next try", async () => {
  const slow = httpClient("http://api.test", { retryDelays: [5000] });
  queue = [{ status: 429, body: "slow down", headers: { "Retry-After": "0.05" } }];
  answer = { status: 200, json: [] };
  const started = Date.now();
  await slow.projectTags();
  assert.ok(Date.now() - started < 1000, "waited the server's 50 ms, not the 5 s default");
  assert.equal(calls.length, 2);
});

test("a read called off stops, and isn't tried again", async () => {
  const slow = httpClient("http://api.test", { retryDelays: [5000] });
  answer = { status: 503, body: "busy" };
  const ctrl = new AbortController();
  const read = slow.project("p", { signal: ctrl.signal });
  setTimeout(() => ctrl.abort(), 10);
  await assert.rejects(read, (e: unknown) => e instanceof ApiError && e.code === "aborted");
  assert.equal(calls.length, 1);
});

test("the workspaces are a GET and a POST, and a workspace's tags and projects ask for it", async () => {
  answer = { status: 200, json: [] };
  await client.workspaces();
  assert.equal(calls[0]?.url, "http://api.test/workspaces");
  await client.createWorkspace({ name: "Initech" });
  assert.equal(calls[1]?.init.method, "POST");
  await client.projectTags({ workspace: "w-acme" });
  assert.equal(calls[2]?.url, "http://api.test/project-tags?workspace=w-acme");
  await client.projects({ workspace: "w-acme" });
  assert.equal(calls[3]?.url, "http://api.test/projects?workspace=w-acme");
});

test("a read tried again under one long-lived signal leaves no listener behind on it", async () => {
  const ctrl = new AbortController();
  let added = 0;
  let removed = 0;
  const add = ctrl.signal.addEventListener.bind(ctrl.signal);
  const remove = ctrl.signal.removeEventListener.bind(ctrl.signal);
  ctrl.signal.addEventListener = ((...a: Parameters<AbortSignal["addEventListener"]>) => {
    added++;
    add(...a);
  }) as AbortSignal["addEventListener"];
  ctrl.signal.removeEventListener = ((...a: Parameters<AbortSignal["removeEventListener"]>) => {
    removed++;
    remove(...a);
  }) as AbortSignal["removeEventListener"];
  queue = [
    { status: 503, body: "busy" },
    { status: 503, body: "busy" },
  ];
  answer = { status: 200, json: { id: "p" } };
  await client.project("p", { signal: ctrl.signal });
  assert.equal(calls.length, 3);
  assert.ok(added > 0);
  assert.equal(removed, added);
});

test("a 401 asks once for a longer session and tries again; the person stays signed in", async () => {
  const out: number[] = [];
  const c = httpClient("http://api.test", { retryDelays: [0, 0], onUnauthorized: () => out.push(1) });
  queue = [
    { status: 401, json: { error: "ended" } },
    { status: 200, json: { id: "u" } },
  ];
  answer = { status: 200, json: [{ id: "p" }] };
  assert.deepEqual(await c.projects(), [{ id: "p" }]);
  assert.deepEqual(
    calls.map((x) => `${x.init.method} ${x.url}`),
    ["GET http://api.test/projects", "POST http://api.test/session/refresh", "GET http://api.test/projects"],
  );
  assert.deepEqual(out, []);
});

test("calls that end their session together ask for a longer one once; a refused ask signs out", async () => {
  const out: number[] = [];
  const c = httpClient("http://api.test", { retryDelays: [0, 0], onUnauthorized: () => out.push(1) });
  answer = { status: 401, json: { error: "ended" } };
  await Promise.allSettled([c.projects(), c.workspaces()]);
  assert.equal(calls.filter((x) => x.url.endsWith("/session/refresh")).length, 1);
  assert.deepEqual(out, [1, 1]);
});

test("a wrong password, a sign-out and a server with no refresh never ask for a longer session", async () => {
  answer = { status: 401, json: { error: "no" } };
  await assert.rejects(client.signIn("a", "b"));
  await assert.rejects(client.signOut());
  await assert.rejects(httpClient("http://api.test", { refreshPath: null }).projects());
  assert.equal(calls.filter((x) => x.url.endsWith("/session/refresh")).length, 0);
});

test("tasks are their own paths, and a file goes as it is with its name in a header", async () => {
  await client.tasks({ workspace: "w-acme", project: "p-shop", sort: "due:asc" });
  await client.updateTask("t 1", { due: null });
  answer = { status: 200, json: { id: "f-1", name: "a b.pdf", size: 3, type: "application/pdf" } };
  const file = new File(["abc"], "a b.pdf", { type: "application/pdf" });
  await client.uploadFile(file);
  assert.equal(calls[0]?.url, "http://api.test/tasks?workspace=w-acme&project=p-shop&sort=due%3Aasc");
  assert.equal(calls[1]?.url, "http://api.test/tasks/t%201");
  assert.equal(calls[1]?.init.body, JSON.stringify({ due: null }));
  assert.equal(calls[2]?.url, "http://api.test/files");
  assert.equal(calls[2]?.init.method, "POST");
  assert.equal(calls[2]?.init.body, file);
  assert.deepEqual(calls[2]?.init.headers, { "Content-Type": "application/pdf", "X-File-Name": "a%20b.pdf" });
});

test("a 401 answered with a longer session gives the person with the new end", async () => {
  const got: unknown[] = [];
  const c = httpClient("http://api.test", { retryDelays: [0, 0], onRefreshed: (u) => got.push(u.sessionEndsAt) });
  queue = [
    { status: 401, json: { error: "ended" } },
    { status: 200, json: { id: "u", name: "A", email: "a@acme.test", role: "owner", sessionEndsAt: "2026-10-26T11:00:00.000Z" } },
  ];
  answer = { status: 200, json: [] };
  await c.projects();
  assert.deepEqual(got, ["2026-10-26T11:00:00.000Z"]);
});
