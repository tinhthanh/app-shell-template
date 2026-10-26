// The API contract (api/openapi.json) and what holds the app to it: a small
// JSON Schema check (the parts the contract uses), the client's calls as
// src/lib/api.ts writes them, and how each operation is called on a Client,
// shared by check-contract.mjs (the mock's answers against the schemas) and
// stub-server.mjs (the mock served over HTTP). Pure, so contract.test.mjs
// runs it.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const loadSpec = () => JSON.parse(readFileSync(resolve(root, "api/openapi.json"), "utf8"));

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// problems lists where value breaks schema ("$.items[0].status: not one of …"),
// following $ref into spec's components.
export function problems(schema, value, spec, at = "$") {
  if (schema.$ref) return problems(spec.components.schemas[schema.$ref.split("/").at(-1)], value, spec, at);
  const out = [];
  for (const part of schema.allOf ?? []) out.push(...problems(part, value, spec, at));
  // One of them fits, or the first one's problems are the answer.
  if (schema.anyOf) {
    const each = schema.anyOf.map((s) => problems(s, value, spec, at));
    return each.some((p) => !p.length) ? out : [...out, ...(each[0] ?? [])];
  }
  if (schema.enum && !schema.enum.includes(value)) return [...out, `${at}: ${JSON.stringify(value)} is not one of ${schema.enum.join(", ")}`];
  const type = Array.isArray(value) ? "array" : value === null ? "null" : Number.isInteger(value) ? "integer" : typeof value;
  if (schema.type && !(schema.type === type || (schema.type === "number" && type === "integer"))) return [...out, `${at}: a ${type}, not a ${schema.type}`];
  if (schema.format === "date-time" && !ISO.test(value)) out.push(`${at}: ${JSON.stringify(value)} is not a date-time`);
  if (schema.format === "date" && !DAY.test(value)) out.push(`${at}: ${JSON.stringify(value)} is not a date`);
  if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at}: ${value} is under ${schema.minimum}`);
  if (type === "array" && schema.items) for (const [i, v] of value.entries()) out.push(...problems(schema.items, v, spec, `${at}[${i}]`));
  if (type === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) out.push(`${at}: no ${k}`);
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      if (schema.properties?.[k]) out.push(...problems(schema.properties[k], v, spec, `${at}.${k}`));
      else if (schema.additionalProperties === false) out.push(`${at}: ${k} is not in the contract`);
    }
  }
  return out;
}

// operations is every operation in the contract, by its operationId.
export function operations(spec) {
  const out = new Map();
  for (const [path, item] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(item)) out.set(op.operationId, { method: method.toUpperCase(), path, op });
  return out;
}

// clientCalls reads httpClient's lines in api.ts: each method, its HTTP
// method and its path with ${…} as {id} and the query left off.
export function clientCalls(source) {
  const body = source.slice(source.indexOf("export function httpClient"));
  const out = new Map();
  for (const m of body.matchAll(/^\s+(\w+): \([^)]*\) => c\("(\w+)", [`"]([^`"]*)[`"]/gm)) {
    const path = m[3]
      .replace(/\$\{listQuery\(.*\)\}/g, "")
      .replace(/\?.*$/, "")
      .replace(/\$\{encodeURIComponent\((\w+)\)\}/g, "{$1}");
    out.set(m[1], { method: m[2], path });
  }
  return out;
}

// interfaceFields is the fields of an interface in types.ts, by name.
export function interfaceFields(source, name) {
  const body = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(source)?.[1] ?? "";
  return [...body.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);
}

// The query and body types the client sends, each held to its operation's
// parameters or request body, so renaming a field on one side fails the
// check instead of quietly sending what the server doesn't read.
export const QUERIES = { projects: "ProjectQuery", tasks: "TaskQuery" };
export const BODIES = { createTask: "TaskInput", updateTask: "TaskInput" };

// clientMethods is the methods of the Client interface in api.ts.
export function clientMethods(source) {
  const body = /export interface Client \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
  return [...body.matchAll(/^\s+(\w+)\(/gm)].map((m) => m[1]);
}

// ARGS says how a request becomes a Client call (the stub), and SAMPLES what
// the check calls the mock with, one per operation: a new operation without
// either fails the check.
export const ARGS = {
  projects: (r) => [{ ...r.query, tags: r.query.tags?.split(","), limit: r.query.limit ? Number(r.query.limit) : undefined }],
  createProject: (r) => [r.body],
  project: (r) => [r.params.id],
  updateProject: (r) => [r.params.id, r.body],
  deleteProject: (r) => [r.params.id],
  tasks: (r) => [{ ...r.query, hideDone: r.query.hideDone === "true" || undefined, limit: r.query.limit ? Number(r.query.limit) : undefined }],
  task: (r) => [r.params.id],
  createTask: (r) => [r.body],
  updateTask: (r) => [r.params.id, r.body],
  deleteTask: (r) => [r.params.id],
  uploadFile: (r) => [r.file],
  projectTags: (r) => [{ workspace: r.query.workspace }],
  workspaces: () => [],
  createWorkspace: (r) => [r.body],
  search: (r) => [r.query.q ?? ""],
  me: () => [],
  signIn: (r) => [r.body?.email ?? "", r.body?.password ?? ""],
  signOut: () => [],
  refreshSession: () => [],
};

export const SAMPLES = {
  projects: { query: { workspace: "w-acme", status: "active", sort: "name:asc", limit: "2" } },
  createProject: { body: { name: "Contract", description: "Made by the contract check.", workspace: "w-acme" } },
  project: { params: { id: "p-shop" } },
  updateProject: { params: { id: "p-shop" }, body: { status: "paused" } },
  deleteProject: { params: { id: "p-docs" } },
  tasks: { query: { workspace: "w-acme", status: "todo", hideDone: "true", sort: "due:asc", limit: "2" } },
  task: { params: { id: "t-webhooks" } },
  uploadFile: { file: new File(["the notes"], "notes.txt", { type: "text/plain" }) },
  createTask: { body: { title: "Contract", project: "p-shop", due: "2026-11-02", workspace: "w-acme" } },
  updateTask: { params: { id: "t-checkout" }, body: { status: "done", due: null, project: null } },
  deleteTask: { params: { id: "t-labels" } },
  projectTags: { query: { workspace: "w-acme" } },
  workspaces: {},
  createWorkspace: { body: { name: "Contract" } },
  search: { query: { q: "sh" } },
  me: {},
  refreshSession: {},
  signOut: {},
  signIn: { body: { email: "alex@acme.test", password: "x" } },
};

// match finds the operation a request is for, and its path's parameters.
export function match(ops, method, pathname) {
  for (const [id, o] of ops) {
    if (o.method !== method) continue;
    const names = [];
    const pattern = o.path.replace(/\{(\w+)\}/g, (_, n) => {
      names.push(n);
      return "([^/]+)";
    });
    const re = new RegExp(`^${pattern}$`);
    const m = re.exec(pathname);
    if (m) return { id, op: o.op, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) };
  }
  return undefined;
}

// success is the status an operation answers when it works, and its schema.
export function success(op) {
  const [status, r] = Object.entries(op.responses).find(([s]) => s.startsWith("2")) ?? ["200", {}];
  return { status: Number(status), schema: r.content?.["application/json"]?.schema };
}
