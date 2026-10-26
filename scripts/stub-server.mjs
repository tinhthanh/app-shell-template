// A server that keeps the API contract (api/openapi.json) by serving the
// mock (src/lib/mock.ts) over HTTP: the app's real client (httpClient) end
// to end, before there is a backend, and a model for one. Each request is
// matched to its operation, called on the mock (ARGS, scripts/contract.mjs),
// and answered with its status, or the mock's refusal as the Error shape.
// Any origin may call it with credentials: it is for this machine only.
//
//   pnpm stub                                  # http://localhost:8787
//   VITE_API_URL=http://localhost:8787 pnpm dev
import { createServer } from "node:http";

import { ARGS, loadSpec, match, operations, success } from "./contract.mjs";

const read = (req) =>
  new Promise((done) => {
    let text = "";
    req.on("data", (c) => {
      text += c;
    });
    req.on("end", () => {
      try {
        done(text ? JSON.parse(text) : undefined);
      } catch {
        done(undefined);
      }
    });
  });

// startStub serves on port (0 for any free one) and says where.
export async function startStub(port = 8787, mockOptions = {}) {
  const { mockClient } = await import("../src/lib/mock.ts");
  const client = mockClient({ latency: 0, ...mockOptions });
  const ops = operations(loadSpec());
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const headers = {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      Vary: "Origin",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, headers).end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://stub");
    const found = match(ops, req.method ?? "GET", url.pathname);
    const send = (status, body) => {
      res.writeHead(status, body === undefined ? headers : { ...headers, "Content-Type": "application/json" });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    if (!found) return send(404, { error: `No ${req.method} ${url.pathname} in the contract.`, code: "not_found" });
    try {
      const answer = await client[found.id](...ARGS[found.id]({ params: found.params, query: Object.fromEntries(url.searchParams), body: await read(req) }));
      const { status } = success(found.op);
      send(status, status === 204 ? undefined : answer);
    } catch (err) {
      send(err.status || 500, { error: err.message, code: err.code, field: err.field });
    }
  });
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  const { port: bound } = server.address();
  return { url: `http://127.0.0.1:${bound}`, close: () => new Promise((done) => server.close(done)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stub = await startStub(Number(process.env.STUB_PORT ?? 8787), { latency: 250 });
  console.log(`stub: the contract served from the mock at ${stub.url}; VITE_API_URL=${stub.url} pnpm dev`);
}
