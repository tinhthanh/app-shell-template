import type { Client } from "@/lib/api";
import type { Attachment, Project, Role, SearchHit, Task, TaskInput, User, Workspace } from "@/lib/types";
import { ApiError } from "./errors.ts";
import { pageOf, sortRows } from "./pages.ts";
import { type Action, can } from "./permissions.ts";
import { rankEach } from "./search-rank.ts";
import { MAX_FILE } from "./upload.ts";

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
//   ?mock=1&failAfter=2   the first two calls work, every one after fails (a server
//                         that goes down while you work: a reload keeps what was read)
//   ?mock=1&role=viewer   signed in as a viewer (or member): the writes
//                         their role can't take are refused with a 403
//   ?mock=1&sessionMinutes=3  the session ends three minutes after signing in
//                         (or after Stay signed in); the warning comes before
//   ?mock=1&failMore=1    the list's second page fails once, then comes (Try again)
//   ?mock=1&hold=1        writes never answer: what shows at once, before the server
//                         confirms, stays on screen to be looked at (optimistic)
//   #/projects/p-vault    a project in another team's workspace: refused, 403

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

export const FIXTURES: Project[] = [
  { id: "p-shop", workspace: "w-acme", name: "Shop", description: "The storefront and its checkout.", status: "active", owner: "alex", tags: ["web", "payments"], updatedAt: ago(12) },
  { id: "p-api", workspace: "w-acme", name: "Public API", description: "REST and webhooks for partners.", status: "active", owner: "sam", tags: ["backend"], updatedAt: ago(45) },
  { id: "p-ios", workspace: "w-acme", name: "iOS app", description: "The customer app on iPhone.", status: "active", owner: "priya", tags: ["mobile"], updatedAt: ago(130) },
  { id: "p-android", workspace: "w-acme", name: "Android app", description: "The customer app on Android.", status: "paused", owner: "priya", tags: ["mobile"], updatedAt: ago(60 * 26) },
  {
    id: "p-warehouse",
    workspace: "w-acme",
    name: "Warehouse",
    description: "Stock, picking and shipping labels.",
    status: "active",
    owner: "jordan",
    tags: ["backend", "ops"],
    updatedAt: ago(60 * 5),
  },
  { id: "p-docs", workspace: "w-acme", name: "Docs", description: "The help centre and the API reference.", status: "active", owner: "alex", tags: ["web"], updatedAt: ago(60 * 50) },
  {
    id: "p-legacy",
    workspace: "w-acme",
    name: "Legacy admin",
    description: "The old back office, read only since the move.",
    status: "archived",
    owner: "sam",
    tags: ["web", "ops"],
    updatedAt: ago(60 * 24 * 40),
  },
  {
    id: "p-design",
    workspace: "w-acme",
    name: "Design system",
    description: "Tokens, components and the Figma library.",
    status: "active",
    owner: "mina",
    tags: ["web", "design"],
    updatedAt: ago(60 * 24 * 3),
  },
  // Globex's: a second workspace on the rail (lib/workspace.ts).
  { id: "p-billing", workspace: "w-globex", name: "Billing", description: "Invoices, plans and the card vault.", status: "active", owner: "jordan", tags: ["payments"], updatedAt: ago(20) },
  { id: "p-portal", workspace: "w-globex", name: "Partner portal", description: "Where resellers place their orders.", status: "paused", owner: "mina", tags: ["web"], updatedAt: ago(60 * 30) },
];

// A project in a workspace the person isn't in: a link to it is refused
// with a 403 (the Forbidden page), as a server would. Never listed.
const ELSEWHERE: Project = { id: "p-vault", workspace: "w-initrode", name: "Vault", description: "Kept by another team.", status: "active", owner: "kim", tags: [], updatedAt: ago(90) };

// The workspaces the person belongs to: Acme holds the projects above,
// Globex two more, with one thing waiting (the rail's dot).
// A day this many days from today, as a task's due day: "2026-11-02".
const inDays = (n: number) => {
  const d = new Date(now + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// The tasks: Acme's point at its projects, one is late, one has a file.
export const TASKS: Task[] = [
  { id: "t-checkout", workspace: "w-acme", title: "Fix the checkout's tax line", status: "doing", due: inDays(2), project: { id: "p-shop", name: "Shop" }, updatedAt: ago(30) },
  {
    id: "t-webhooks",
    workspace: "w-acme",
    title: "Document the webhook retries",
    status: "todo",
    due: inDays(-1),
    project: { id: "p-api", name: "Public API" },
    attachment: { id: "f-retries", name: "retry-policy.pdf", size: 182_400, type: "application/pdf" },
    updatedAt: ago(200),
  },
  { id: "t-icons", workspace: "w-acme", title: "New app icons", status: "todo", due: inDays(9), project: { id: "p-ios", name: "iOS app" }, updatedAt: ago(60 * 5) },
  { id: "t-labels", workspace: "w-acme", title: "Print labels in bulk", status: "done", project: { id: "p-warehouse", name: "Warehouse" }, updatedAt: ago(60 * 30) },
  { id: "t-tokens", workspace: "w-acme", title: "Dark mode tokens", status: "doing", due: inDays(5), project: { id: "p-design", name: "Design system" }, updatedAt: ago(90) },
  { id: "t-standup", workspace: "w-acme", title: "Plan the next sprint", status: "todo", updatedAt: ago(15) },
  // Globex's.
  { id: "t-invoices", workspace: "w-globex", title: "Send the October invoices", status: "todo", due: inDays(3), project: { id: "p-billing", name: "Billing" }, updatedAt: ago(45) },
  { id: "t-resellers", workspace: "w-globex", title: "Invite the first resellers", status: "doing", project: { id: "p-portal", name: "Partner portal" }, updatedAt: ago(60 * 8) },
];

export const WORKSPACES: Workspace[] = [
  { id: "w-acme", name: "Acme" },
  { id: "w-globex", name: "Globex", attention: 1 },
];

// many is 5,000 invented projects, the same every time.
export function many(count = 5000): Project[] {
  const words = ["Shop", "Ledger", "Beacon", "Harbour", "Atlas", "Relay", "Quill", "Orbit", "Meadow", "Signal"];
  const owners = ["alex", "sam", "priya", "jordan", "mina"];
  const tags = ["web", "mobile", "backend", "ops", "design", "payments"];
  const statuses: Project["status"][] = ["active", "active", "paused", "archived"];
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i + 1}`,
    workspace: "w-acme",
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
  // Every call after the first this many fails.
  failAfter?: number;
  // Writes fail, reads don't.
  failWrites?: boolean;
  // Start with no projects.
  empty?: boolean;
  // Seed data of your own (defaults to FIXTURES).
  projects?: Project[];
  // Who is signed in may only do what this role may (lib/permissions.ts).
  role?: Role;
  // Start signed out: every call is a 401 until signIn.
  signedOut?: boolean;
  // Thousands of projects, for a long list.
  many?: boolean;
  // The first read of a list's later page (a cursor is given) fails; the
  // first page and every read after that one work.
  failMore?: boolean;
  // Writes never answer, so what a view shows before the server confirms
  // can be looked at and tested without a race against the latency.
  hold?: boolean;
  // The session ends this many minutes after it starts or is made longer.
  sessionMinutes?: number;
  // Called on a 401, as the HTTP client does (lib/session.ts signedOut).
  onUnauthorized?: () => void;
}

export const ALEX: User = { id: "u-alex", name: "Alex Rivera", email: "alex@acme.test", role: "owner" };

const fromUrl = (): MockOptions => {
  if (typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  return {
    latency: q.has("slow") ? 1500 : 250,
    fail: q.has("fail"),
    failOnce: q.has("failOnce"),
    failAfter: q.has("failAfter") ? Number(q.get("failAfter")) : undefined,
    failWrites: q.has("failWrites"),
    empty: q.has("empty"),
    signedOut: q.has("signedOut"),
    many: q.has("many"),
    failMore: q.has("failMore"),
    sessionMinutes: q.has("sessionMinutes") ? Number(q.get("sessionMinutes")) : undefined,
    hold: q.has("hold"),
    role: (["owner", "member", "viewer"] as const).find((r) => r === q.get("role")),
  };
};

// mockClient is a Client over the fixtures. Pure apart from its own state,
// so mock.test.ts runs it in node.
export function mockClient(given: MockOptions = {}): Client {
  const opts = { ...fromUrl(), ...given };
  const latency = opts.latency ?? 0;
  let projects: Project[] = opts.empty ? [] : structuredClone(opts.projects ?? (opts.many ? many() : FIXTURES));
  let workspaces: Workspace[] = structuredClone(WORKSPACES);
  let tasks: Task[] = opts.empty ? [] : structuredClone(TASKS);
  // The files sent, kept by id until a task names one.
  const files = new Map<string, Attachment>();
  const wait = () => (latency ? new Promise<void>((r) => setTimeout(r, latency)) : Promise.resolve());
  const me = { ...ALEX, role: opts.role ?? ALEX.role };
  // A session that ends, when sessionMinutes says so: who is signed in, until when.
  const lasting = (u: Omit<User, "sessionEndsAt">): User => (opts.sessionMinutes ? { ...u, sessionEndsAt: new Date(Date.now() + opts.sessionMinutes * 60_000).toISOString() } : { ...u });
  let user: User | null = opts.signedOut ? null : lasting(me);
  const ended = () => Boolean(user?.sessionEndsAt && Date.parse(user.sessionEndsAt) <= Date.now());
  let calls = 0;
  let laterPages = 0;
  const down = () => new ApiError("The server is not answering right now.", 503, "unavailable");
  const unauthorized = () => {
    opts.onUnauthorized?.();
    return new ApiError("You're signed out.", 401, "unauthorized");
  };
  // guard is every call's first line: the knobs, then who is asking, then
  // (for a write) whether their role may take it.
  const guard = async (write = false, action?: Action) => {
    await wait();
    calls++;
    if (opts.fail || (opts.failOnce && calls === 1) || (opts.failAfter !== undefined && calls > opts.failAfter) || (write && opts.failWrites)) throw down();
    if (!user || ended()) throw unauthorized();
    if (action && !can(user, action)) throw new ApiError("Your role doesn't allow that.", 403, "forbidden");
    if (write && opts.hold) await new Promise<never>(() => {});
  };
  const find = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new ApiError(`No project is called ${id}.`, 404, "not_found");
    return p;
  };
  const findTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new ApiError(`No task is called ${id}.`, 404, "not_found");
    return t;
  };
  const TASK_SORTS: Record<string, (a: Task, b: Task) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    // No due day sorts last.
    due: (a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"),
    updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  };
  // taskFrom applies what a create or an edit sends, refusing what a server
  // would: no title, a day that isn't one, a project or a file it doesn't know.
  const taskFrom = (t: Task, input: TaskInput): Task => {
    const next: Task = { ...t, updatedAt: new Date().toISOString() };
    if (input.title !== undefined) {
      if (!input.title.trim()) throw new ApiError("A task needs a title.", 422, "invalid", "title");
      next.title = input.title.trim();
    }
    if (input.status !== undefined) next.status = input.status;
    if (input.due !== undefined) {
      if (input.due !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new ApiError("That isn't a day.", 422, "invalid", "due");
      if (input.due === null) delete next.due;
      else next.due = input.due;
    }
    if (input.project !== undefined) {
      if (input.project === null) delete next.project;
      else {
        const p = projects.find((x) => x.id === input.project && x.workspace === t.workspace);
        if (!p) throw new ApiError("Pick a project in this workspace.", 422, "invalid", "project");
        next.project = { id: p.id, name: p.name };
      }
    }
    if (input.attachment !== undefined) {
      if (input.attachment === null) delete next.attachment;
      else {
        const f = files.get(input.attachment) ?? (t.attachment?.id === input.attachment ? t.attachment : undefined);
        if (!f) throw new ApiError("That file didn't arrive; add it again.", 422, "invalid", "attachment");
        next.attachment = f;
      }
    }
    return next;
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
        (p) =>
          (!query.workspace || p.workspace === query.workspace) &&
          (!q || `${p.name} ${p.description} ${p.owner}`.toLowerCase().includes(q)) &&
          (!query.status || p.status === query.status) &&
          (query.tags ?? []).every((t) => p.tags.includes(t)),
      );
      return structuredClone(pageOf(sortRows(match, query.sort, SORTS), query.cursor, query.limit));
    },
    async projectTags(o = {}) {
      await guard();
      return [...new Set(projects.filter((p) => !o.workspace || p.workspace === o.workspace).flatMap((p) => p.tags))].sort();
    },
    async workspaces() {
      // Asked once after signing in, as me() is: it isn't failOnce's first
      // call, which is for the read the person is looking at.
      await wait();
      if (opts.fail) throw down();
      if (!user) throw unauthorized();
      return structuredClone(workspaces);
    },
    async createWorkspace(input) {
      await guard(true, "workspace.create");
      const name = input.name.trim();
      if (!name) throw new ApiError("A workspace needs a name.", 422, "invalid", "name");
      if (workspaces.some((w) => w.name.toLowerCase() === name.toLowerCase())) throw new ApiError(`You're already in a workspace called ${name}.`, 422, "invalid", "name");
      // An id from the name, made unique (a name in another script has no ASCII to give).
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";
      let id = `w-${slug}`;
      for (let n = 2; workspaces.some((w) => w.id === id); n++) id = `w-${slug}-${n}`;
      const w: Workspace = { id, name };
      workspaces = [...workspaces, w];
      return structuredClone(w);
    },
    async project(id) {
      await guard();
      if (id === ELSEWHERE.id) throw new ApiError("That project is in a workspace you aren't in.", 403, "forbidden");
      return structuredClone(find(id));
    },
    async updateProject(id, patch) {
      await guard(true, "project.edit");
      // What a server would refuse: an empty name, or one another project has.
      if (patch.name !== undefined && !patch.name.trim()) throw new ApiError("A project needs a name.", 422, "invalid", "name");
      if (patch.name && projects.some((p) => p.id !== id && p.name.toLowerCase() === patch.name?.toLowerCase()))
        throw new ApiError(`Another project is already called ${patch.name}.`, 422, "invalid", "name");
      const next = { ...find(id), ...patch, updatedAt: new Date().toISOString() };
      projects = projects.map((p) => (p.id === id ? next : p));
      return structuredClone(next);
    },
    async createProject(input) {
      await guard(true, "project.create");
      const name = input.name.trim();
      if (!name) throw new ApiError("A project needs a name.", 422, "invalid", "name");
      if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new ApiError(`Another project is already called ${name}.`, 422, "invalid", "name");
      const id = `p-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
      const p: Project = {
        id,
        workspace: input.workspace ?? WORKSPACES[0]?.id ?? "w-acme",
        name,
        description: input.description.trim(),
        status: "active",
        owner: "you",
        tags: [],
        updatedAt: new Date().toISOString(),
      };
      projects = [p, ...projects];
      return structuredClone(p);
    },
    async deleteProject(id) {
      await guard(true, "project.delete");
      find(id);
      projects = projects.filter((p) => p.id !== id);
    },
    async tasks(query = {}) {
      await guard();
      if (query.cursor && opts.failMore && ++laterPages === 1) throw down();
      const q = query.q?.trim().toLowerCase();
      const match = tasks.filter(
        (t) =>
          (!query.workspace || t.workspace === query.workspace) &&
          (!q || `${t.title} ${t.project?.name ?? ""}`.toLowerCase().includes(q)) &&
          (!query.status || t.status === query.status) &&
          (!query.hideDone || t.status !== "done") &&
          (!query.project || t.project?.id === query.project),
      );
      return structuredClone(pageOf(sortRows(match, query.sort, TASK_SORTS), query.cursor, query.limit));
    },
    async task(id) {
      await guard();
      return structuredClone(findTask(id));
    },
    async createTask(input) {
      await guard(true, "task.create");
      const workspace = input.workspace ?? workspaces[0]?.id ?? "w-acme";
      const base: Task = { id: "", workspace, title: "", status: "todo", updatedAt: "" };
      const made = taskFrom(base, { status: "todo", ...input });
      let id = `t-${
        made.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "task"
      }`;
      for (let n = 2; tasks.some((t) => t.id === id); n++)
        id = `t-${
          made.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "task"
        }-${n}`;
      made.id = id;
      tasks = [made, ...tasks];
      return structuredClone(made);
    },
    async updateTask(id, patch) {
      await guard(true, "task.edit");
      const saved = taskFrom(findTask(id), patch);
      tasks = tasks.map((t) => (t.id === id ? saved : t));
      return structuredClone(saved);
    },
    async deleteTask(id) {
      await guard(true, "task.delete");
      findTask(id);
      tasks = tasks.filter((t) => t.id !== id);
    },
    async uploadFile(file) {
      await guard(true, "file.upload");
      if (file.size > MAX_FILE) throw new ApiError("Files up to 5 MB, please.", 422, "invalid", "attachment");
      const f: Attachment = { id: `f-${files.size + 1}-${Date.now().toString(36)}`, name: file.name, size: file.size, type: file.type || "application/octet-stream" };
      files.set(f.id, f);
      return structuredClone(f);
    },
    async search(query) {
      await guard();
      // Each kind is ranked on its own, so one can't crowd the other out.
      return rankEach<{ name: string; text: string; hit: SearchHit }>(
        [
          projects.map((p) => ({ name: p.name, text: `${p.description} ${p.owner}`, hit: { kind: "project", id: p.id, name: p.name, detail: `${p.owner} · ${p.status}` } })),
          tasks.map((t) => ({ name: t.title, text: t.project?.name ?? "", hit: { kind: "task", id: t.id, name: t.title, detail: [t.project?.name, t.status].filter(Boolean).join(" · ") } })),
        ],
        query,
      ).map(({ hit }) => hit);
    },
    async me() {
      // Asked once at start: it doesn't count as failOnce's first call, which
      // is for the read the person is looking at.
      await wait();
      if (opts.fail) throw down();
      if (!user || ended()) throw unauthorized();
      return structuredClone(user);
    },
    async signIn(email, password) {
      await wait();
      if (!email.trim() || !password) throw new ApiError("That email and password don't match.", 401, "unauthorized");
      user = lasting({ ...me, email: email.trim() });
      return structuredClone(user);
    },
    async signOut() {
      // failWrites fails it too, as a server that is down would; the app
      // signs out here all the same (components/app-sidebar.tsx).
      await wait();
      if (opts.fail || opts.failWrites) throw down();
      user = null;
    },
    async refreshSession() {
      await wait();
      if (opts.fail) throw down();
      if (!user || ended()) throw unauthorized();
      user = lasting(user);
      return structuredClone(user);
    },
  };
}
