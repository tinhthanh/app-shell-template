// Holds the app to its API contract (api/openapi.json), so the client, the
// mock and a server agree on one thing:
//
//   - every method of Client (src/lib/api.ts) is an operation, with the
//     HTTP method and path httpClient sends, and every operation is a method;
//   - every operation has a sample request, which fits its request body;
//   - the mock (src/lib/mock.ts), called with each sample, answers what the
//     operation's response schema says, and its refusals are the Error shape;
//   - every operation says what a caller needs (x-permission: public,
//     signed-in, or an action of x-roles); the client's role table
//     (lib/permissions.ts ACTIONS) is x-roles; and the mock refuses as a
//     server must: 401 to nobody for what isn't public, 403 to each role
//     x-roles leaves out, and nothing to the roles it names.
//
//   node --experimental-strip-types scripts/check-contract.mjs   (pnpm check:contract)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ARGS, BODIES, clientCalls, clientMethods, interfaceFields, loadSpec, operations, problems, QUERIES, root, SAMPLES, success } from "./contract.mjs";

const spec = loadSpec();
const ops = operations(spec);
const api = readFileSync(resolve(root, "src/lib/api.ts"), "utf8");
const calls = clientCalls(api);
const methods = clientMethods(api);
const out = [];

for (const m of methods) {
  const op = ops.get(m);
  const call = calls.get(m);
  if (!op) out.push(`Client.${m}: no operation with operationId "${m}" in api/openapi.json`);
  else if (!call) out.push(`Client.${m}: httpClient has no line for it`);
  else if (op.method !== call.method || op.path !== call.path) out.push(`Client.${m}: httpClient sends ${call.method} ${call.path}, the contract says ${op.method} ${op.path}`);
}
for (const id of ops.keys()) {
  if (!methods.includes(id)) out.push(`${id}: in the contract but not a method of Client`);
  if (!ARGS[id] || !SAMPLES[id]) out.push(`${id}: no ARGS or SAMPLES in scripts/contract.mjs`);
}

// What the client sends: each query type's fields are the operation's query
// parameters, and each body type's fields its request body's properties.
const types = readFileSync(resolve(root, "src/lib/types.ts"), "utf8");
const same = (a, b) => [...a].sort().join(",") === [...b].sort().join(",");
for (const [id, name] of Object.entries(QUERIES)) {
  const sent = interfaceFields(types, name);
  const named = (ops.get(id)?.op.parameters ?? []).filter((p) => p.in === "query").map((p) => p.name);
  if (!same(sent, named)) out.push(`${id}: ${name} sends ${sent.join(", ")}; the contract's query is ${named.join(", ")}`);
}
for (const [id, name] of Object.entries(BODIES)) {
  const sent = interfaceFields(types, name);
  const named = Object.keys(ops.get(id)?.op.requestBody?.content["application/json"]?.schema.properties ?? {});
  if (!same(sent, named)) out.push(`${id}: ${name} sends ${sent.join(", ")}; the contract's body is ${named.join(", ")}`);
}

const { mockClient } = await import("../src/lib/mock.ts");
const client = mockClient({ latency: 0 });
// The order in SAMPLES matters: the records' reads and writes first, then the session, with sign-out next to last (a call after it would be refused) and sign-in last, which needs no session.
for (const [id, sample] of Object.entries(SAMPLES)) {
  const o = ops.get(id);
  if (!o) continue;
  const req = { params: {}, query: {}, ...sample };
  // A JSON body is checked; a file is whatever it is.
  const body = o.op.requestBody?.content["application/json"]?.schema;
  if (body) for (const p of problems(body, req.body, spec, `${id} request`)) out.push(p);
  let answer;
  try {
    answer = await client[id](...ARGS[id](req));
  } catch (err) {
    out.push(`${id}: the mock refused the sample: ${err.message}`);
    continue;
  }
  const { schema } = success(o.op);
  if (!schema) {
    if (answer !== undefined) out.push(`${id}: the contract says no body, the mock answered one`);
    continue;
  }
  for (const p of problems(schema, answer, spec, id)) out.push(p);
}
// What a caller needs, and who may: one table, the contract's.
const roles = spec["x-roles"] ?? {};
const { ACTIONS } = await import("../src/lib/permissions.ts");
const sorted = (table) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(table)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, [...v].sort()]),
    ),
  );
if (sorted(ACTIONS) !== sorted(roles)) out.push(`lib/permissions.ts ACTIONS is not the contract's x-roles: make them the same table\n    ACTIONS: ${sorted(ACTIONS)}\n    x-roles: ${sorted(roles)}`);
// status is what the mock does with the sample for a caller: 0 when it answers.
const status = async (id, opts) => {
  try {
    await mockClient({ latency: 0, ...opts })[id](...ARGS[id]({ params: {}, query: {}, ...SAMPLES[id] }));
    return 0;
  } catch (err) {
    return err.status ?? -1;
  }
};
for (const [id, o] of ops) {
  const need = o.op["x-permission"];
  if (!need) {
    out.push(`${id}: no x-permission (public, signed-in, or an action of x-roles)`);
    continue;
  }
  if (need !== "public" && need !== "signed-in" && !roles[need]) {
    out.push(`${id}: x-permission "${need}" is not an action of x-roles`);
    continue;
  }
  if (!SAMPLES[id]) continue;
  if (need !== "public" && (await status(id, { signedOut: true })) !== 401) out.push(`${id}: the mock answers someone signed out; x-permission is "${need}", so it must be a 401`);
  for (const role of roles[need] ? ["owner", "member", "viewer"] : []) {
    const may = roles[need].includes(role);
    const got = await status(id, { role });
    if (may && got === 403) out.push(`${id}: the mock refuses a ${role}, whom x-roles lets take ${need}`);
    if (!may && got !== 403) out.push(`${id}: the mock lets a ${role} take ${need}, which x-roles doesn't (a 403)`);
  }
}

// A refusal: the shape the client reads (errorBody).
try {
  await client.project("p-none");
  out.push("project: the mock answered a project that isn't there");
} catch (err) {
  for (const p of problems({ $ref: "#/components/schemas/Error" }, { error: err.message, code: err.code, field: err.field }, spec, "refusal")) out.push(p);
}

if (out.length) {
  console.error(`check-contract: the app and api/openapi.json disagree:\n${out.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-contract: ${methods.length} operations, the client's paths and the mock's answers fit api/openapi.json`);
