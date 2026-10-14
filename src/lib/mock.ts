import type { Client } from "@/lib/api";
import { ApiError } from "./errors.ts";
import type { Project } from "@/lib/types";

// Mock mode (?mock=1, or no VITE_API_URL) runs the whole UI on these
// fixtures, so it can be worked on and tested without a server. Relative
// imports only: pnpm test runs this in node. State is
// mutable within the page: an update shows up on the next read.
//
// Everything here is invented ("acme"): nothing real goes in fixtures.
//
// Knobs in the URL, for working on a state by hand or in a test:
//   ?mock=1&slow=1   every call takes a second and a half
//   ?mock=1&fail=1   every call fails with a server error
//   ?mock=1&empty=1  there are no projects

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

export const FIXTURES: Project[] = [
  { id: "p-shop", name: "Shop", description: "The storefront and its checkout.", status: "active", owner: "alex", tags: ["web", "payments"], updatedAt: ago(12) },
  { id: "p-api", name: "Public API", description: "REST and webhooks for partners.", status: "active", owner: "sam", tags: ["backend"], updatedAt: ago(45) },
  { id: "p-ios", name: "iOS app", description: "The customer app on iPhone.", status: "active", owner: "priya", tags: ["mobile"], updatedAt: ago(130) },
  { id: "p-android", name: "Android app", description: "The customer app on Android.", status: "paused", owner: "priya", tags: ["mobile"], updatedAt: ago(60 * 26) },
  { id: "p-warehouse", name: "Warehouse", description: "Stock, picking and shipping labels.", status: "active", owner: "jordan", tags: ["backend", "ops"], updatedAt: ago(60 * 5) },
  { id: "p-docs", name: "Docs", description: "The help centre and the API reference.", status: "active", owner: "alex", tags: ["web"], updatedAt: ago(60 * 50) },
  { id: "p-legacy", name: "Legacy admin", description: "The old back office, read only since the move.", status: "archived", owner: "sam", tags: ["web", "ops"], updatedAt: ago(60 * 24 * 40) },
  { id: "p-design", name: "Design system", description: "Tokens, components and the Figma library.", status: "active", owner: "mina", tags: ["web", "design"], updatedAt: ago(60 * 24 * 3) },
];

export interface MockOptions {
  // Milliseconds each call takes; the UI's loading states are seen at 1500.
  latency?: number;
  // Every call fails, as a server that is down would.
  fail?: boolean;
  // Start with no projects.
  empty?: boolean;
  // Seed data of your own (defaults to FIXTURES).
  projects?: Project[];
}

const fromUrl = (): MockOptions => {
  if (typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  return { latency: q.has("slow") ? 1500 : 250, fail: q.has("fail"), empty: q.has("empty") };
};

// mockClient is a Client over the fixtures. Pure apart from its own state,
// so mock.test.ts runs it in node.
export function mockClient(opts: MockOptions = fromUrl()): Client {
  const latency = opts.latency ?? 0;
  let projects: Project[] = opts.empty ? [] : structuredClone(opts.projects ?? FIXTURES);
  const wait = () => (latency ? new Promise<void>((r) => setTimeout(r, latency)) : Promise.resolve());
  const guard = async () => {
    await wait();
    if (opts.fail) throw new ApiError("The server is not answering right now.", 503, "unavailable");
  };
  const find = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new ApiError(`No project is called ${id}.`, 404, "not_found");
    return p;
  };
  return {
    async projects() {
      await guard();
      return structuredClone(projects);
    },
    async project(id) {
      await guard();
      return structuredClone(find(id));
    },
    async updateProject(id, patch) {
      await guard();
      // What a server would refuse: an empty name, or one another project has.
      if (patch.name !== undefined && !patch.name.trim()) throw new ApiError("A project needs a name.", 422, "invalid");
      if (patch.name && projects.some((p) => p.id !== id && p.name.toLowerCase() === patch.name?.toLowerCase())) throw new ApiError(`Another project is already called ${patch.name}.`, 422, "invalid");
      const next = { ...find(id), ...patch, updatedAt: new Date().toISOString() };
      projects = projects.map((p) => (p.id === id ? next : p));
      return structuredClone(next);
    },
  };
}
