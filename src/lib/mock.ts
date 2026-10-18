import type { Client } from "@/lib/api";
import type { Project, SearchHit, User } from "@/lib/types";
import { ApiError } from "./errors.ts";
import { pageOf, sortRows } from "./pages.ts";
import { rankEach } from "./search-rank.ts";

// Mock mode (?mock=1, or no VITE_API_URL) runs the whole UI on these
// fixtures, so it can be worked on and tested without a server. Relative
// imports only: pnpm test runs this in node. State is
// mutable within the page: an update shows up on the next read.
//
// Everything here is invented ("acme"): nothing real goes in fixtures.
//
// Knobs in the URL, for working on a state by hand or in a test:
//   ?mock=1&slow=1        every call takes a second and a half
//   ?mock=1&fail=1        every call fails with a server error
//   ?mock=1&failOnce=1    the first call fails, the rest succeed (Try again)
//   ?mock=1&failWrites=1  reads work, writes fail (a failed save)
//   ?mock=1&empty=1       there are no projects
//   ?mock=1&signedOut=1   nobody is signed in: the sign-in view, then alex
//   ?mock=1&many=1        5,000 projects, for the list's scrolling and keys
//   ?mock=1&failMore=1    the list's second page fails once, then comes (Try again)

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

// many is 5,000 invented projects, the same every time.
export function many(count = 5000): Project[] {
  const words = ["Shop", "Ledger", "Beacon", "Harbour", "Atlas", "Relay", "Quill", "Orbit", "Meadow", "Signal"];
  const owners = ["alex", "sam", "priya", "jordan", "mina"];
  const tags = ["web", "mobile", "backend", "ops", "design", "payments"];
  const statuses: Project["status"][] = ["active", "active", "paused", "archived"];
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `${words[i % words.length]} ${Math.floor(i / words.length) + 1}`,
    description: `Project number ${i + 1} of the acme fleet.`,
    status: statuses[i % statuses.length] as Project["status"],
    owner: owners[i % owners.length] as string,
    tags: [tags[i % tags.length] as string, ...(i % 3 === 0 ? [tags[(i + 2) % tags.length] as string] : [])],
    updatedAt: ago(i * 7),
  }));
}

export interface MockOptions {
  // Milliseconds each call takes; the UI's loading states are seen at 1500.
  latency?: number;
  // Every call fails, as a server that is down would.
  fail?: boolean;
  // Only the first call fails: what Try again recovers from.
  failOnce?: boolean;
  // Writes fail, reads don't.
  failWrites?: boolean;
  // Start with no projects.
  empty?: boolean;
  // Seed data of your own (defaults to FIXTURES).
  projects?: Project[];
  // Start signed out: every call is a 401 until signIn.
  signedOut?: boolean;
  // Thousands of projects, for a long list.
  many?: boolean;
  // The first read of a list's later page (a cursor is given) fails; the
  // first page and every read after that one work.
  failMore?: boolean;
  // Called on a 401, as the HTTP client does (lib/session.ts signedOut).
  onUnauthorized?: () => void;
}

export const ALEX: User = { id: "u-alex", name: "Alex Rivera", email: "alex@acme.test" };

const fromUrl = (): MockOptions => {
  if (typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  return {
    latency: q.has("slow") ? 1500 : 250,
    fail: q.has("fail"),
    failOnce: q.has("failOnce"),
    failWrites: q.has("failWrites"),
    empty: q.has("empty"),
    signedOut: q.has("signedOut"),
    many: q.has("many"),
    failMore: q.has("failMore"),
  };
};

// mockClient is a Client over the fixtures. Pure apart from its own state,
// so mock.test.ts runs it in node.
export function mockClient(given: MockOptions = {}): Client {
  const opts = { ...fromUrl(), ...given };
  const latency = opts.latency ?? 0;
  let projects: Project[] = opts.empty ? [] : structuredClone(opts.projects ?? (opts.many ? many() : FIXTURES));
  const wait = () => (latency ? new Promise<void>((r) => setTimeout(r, latency)) : Promise.resolve());
  let user: User | null = opts.signedOut ? null : ALEX;
  let calls = 0;
  let laterPages = 0;
  const down = () => new ApiError("The server is not answering right now.", 503, "unavailable");
  const unauthorized = () => {
    opts.onUnauthorized?.();
    return new ApiError("You're signed out.", 401, "unauthorized");
  };
  const guard = async (write = false) => {
    await wait();
    calls++;
    if (opts.fail || (opts.failOnce && calls === 1) || (write && opts.failWrites)) throw down();
    if (!user) throw unauthorized();
  };
  const find = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new ApiError(`No project is called ${id}.`, 404, "not_found");
    return p;
  };
  // How the server sorts the list: the columns' ids in the address.
  const SORTS: Record<string, (a: Project, b: Project) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    owner: (a, b) => a.owner.localeCompare(b.owner),
    updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  };
  return {
    async projects(query = {}) {
      await guard();
      if (query.cursor && opts.failMore && ++laterPages === 1) throw down();
      const q = query.q?.trim().toLowerCase();
      const match = projects.filter(
        (p) => (!q || `${p.name} ${p.description} ${p.owner}`.toLowerCase().includes(q)) && (!query.status || p.status === query.status) && (query.tags ?? []).every((t) => p.tags.includes(t)),
      );
      return structuredClone(pageOf(sortRows(match, query.sort, SORTS), query.cursor, query.limit));
    },
    async projectTags() {
      await guard();
      return [...new Set(projects.flatMap((p) => p.tags))].sort();
    },
    async project(id) {
      await guard();
      return structuredClone(find(id));
    },
    async updateProject(id, patch) {
      await guard(true);
      // What a server would refuse: an empty name, or one another project has.
      if (patch.name !== undefined && !patch.name.trim()) throw new ApiError("A project needs a name.", 422, "invalid", "name");
      if (patch.name && projects.some((p) => p.id !== id && p.name.toLowerCase() === patch.name?.toLowerCase()))
        throw new ApiError(`Another project is already called ${patch.name}.`, 422, "invalid", "name");
      const next = { ...find(id), ...patch, updatedAt: new Date().toISOString() };
      projects = projects.map((p) => (p.id === id ? next : p));
      return structuredClone(next);
    },
    async createProject(input) {
      await guard(true);
      const name = input.name.trim();
      if (!name) throw new ApiError("A project needs a name.", 422, "invalid", "name");
      if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new ApiError(`Another project is already called ${name}.`, 422, "invalid", "name");
      const id = `p-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
      const p: Project = { id, name, description: input.description.trim(), status: "active", owner: "you", tags: [], updatedAt: new Date().toISOString() };
      projects = [p, ...projects];
      return structuredClone(p);
    },
    async deleteProject(id) {
      await guard(true);
      find(id);
      projects = projects.filter((p) => p.id !== id);
    },
    async search(query) {
      await guard();
      // One kind today; a second goes in as another group, ranked on its own.
      return rankEach([projects.map((p) => ({ name: p.name, text: `${p.description} ${p.owner}`, p }))], query).map(
        ({ p }): SearchHit => ({ kind: "project", id: p.id, name: p.name, detail: `${p.owner} · ${p.status}` }),
      );
    },
    async me() {
      // Asked once at start: it doesn't count as failOnce's first call, which
      // is for the read the person is looking at.
      await wait();
      if (opts.fail) throw down();
      if (!user) throw unauthorized();
      return structuredClone(user);
    },
    async signIn(email, password) {
      await wait();
      if (!email.trim() || !password) throw new ApiError("That email and password don't match.", 401, "unauthorized");
      user = { ...ALEX, email: email.trim() };
      return structuredClone(user);
    },
    async signOut() {
      await wait();
      user = null;
    },
  };
}
