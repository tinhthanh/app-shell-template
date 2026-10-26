// node --experimental-strip-types --test scripts/contract.test.mjs (pnpm test)
// The contract's pieces: the schema check, reading the client's calls, and
// the stub answering over HTTP as the contract says.
import assert from "node:assert/strict";
import { test } from "node:test";

import { clientCalls, clientMethods, loadSpec, match, operations, problems } from "./contract.mjs";
import { startStub } from "./stub-server.mjs";

const spec = loadSpec();

test("the schema check finds a missing field, a wrong type, a word not in an enum, an extra field and a bad date", () => {
  const p = { id: "p", workspace: "w", name: "x", description: "", status: "gone", owner: "a", tags: [1], updatedAt: "yesterday", extra: true };
  delete p.name;
  assert.deepEqual(problems({ $ref: "#/components/schemas/Project" }, p, spec), [
    "$: no name",
    '$.status: "gone" is not one of active, paused, archived',
    "$.tags[0]: a integer, not a string",
    '$.updatedAt: "yesterday" is not a date-time',
    "$: extra is not in the contract",
  ]);
  assert.deepEqual(problems({ $ref: "#/components/schemas/Workspace" }, { id: "w", name: "Acme", attention: 2 }, spec), []);
});

const D = "$";

test("the client's calls are read with their paths, the query left off and ids as {id}", () => {
  const calls = clientCalls(
    // api.ts as written, its template placeholders spelled with D so this file has none of its own.
    [
      "export function httpClient() {",
      "  return {",
      `    projects: (query, r) => c("GET", \`/projects${D}{listQuery(query)}\`, undefined, r?.signal),`,
      `    project: (id, r) => c("GET", \`/projects/${D}{encodeURIComponent(id)}\`),`,
      `    search: (query, r) => c("GET", \`/search?q=${D}{encodeURIComponent(query)}\`),`,
      "  };",
    ].join("\n"),
  );
  assert.deepEqual(Object.fromEntries(calls), { projects: { method: "GET", path: "/projects" }, project: { method: "GET", path: "/projects/{id}" }, search: { method: "GET", path: "/search" } });
  assert.deepEqual(clientMethods("export interface Client {\n  a(): Promise<void>;\n  // b()\n  c(x: string): Promise<void>;\n}"), ["a", "c"]);
});

test("a request is matched to its operation and its path's parameters", () => {
  const ops = operations(spec);
  assert.deepEqual(match(ops, "PATCH", "/projects/p%20shop")?.params, { id: "p shop" });
  assert.equal(match(ops, "GET", "/projects")?.id, "projects");
  assert.equal(match(ops, "PUT", "/projects"), undefined);
});

test("the stub answers the contract from the mock: a page, a refusal in the Error shape, a 204", async () => {
  const stub = await startStub(0);
  try {
    const page = await (await fetch(`${stub.url}/projects?workspace=w-acme&limit=2`)).json();
    assert.equal(page.items.length, 2);
    assert.deepEqual(problems({ $ref: "#/components/schemas/Page" }, page, spec), []);
    const missing = await fetch(`${stub.url}/projects/p-none`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).code, "not_found");
    const refused = await fetch(`${stub.url}/projects/p-shop`, { method: "PATCH", body: JSON.stringify({ name: "" }), headers: { "Content-Type": "application/json" } });
    assert.deepEqual(await refused.json(), { error: "A project needs a name.", code: "invalid", field: "name" });
    assert.equal((await fetch(`${stub.url}/projects/p-docs`, { method: "DELETE" })).status, 204);
    assert.equal((await fetch(`${stub.url}/nowhere`)).status, 404);
    assert.equal((await fetch(`${stub.url}/projects`, { method: "OPTIONS", headers: { Origin: "http://localhost:1420" } })).headers.get("access-control-allow-origin"), "http://localhost:1420");
  } finally {
    await stub.close();
  }
});
