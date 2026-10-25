// Relative imports and plain timers: api.test.ts runs this in node.
import { ApiError } from "./errors.ts";
import { signedOut } from "./session.ts";
import type { Page, Project, ProjectQuery, SearchHit, User } from "./types.ts";

// What a read can be given: a signal that calls it off when its answer is
// no longer wanted (another filter, a view that left; lib/resource.ts).
export interface ReadOptions {
  signal?: AbortSignal;
}

export type * from "@/lib/types";
export { ApiError };

// The API the app reads and writes through. Every view talks to a Client,
// never to fetch, so the whole UI runs on fixtures (lib/mock.ts) without a
// server: `?mock=1` in the URL, or no VITE_API_URL set. The browser tests
// (e2e/) run that way, so they are fixed and quick.

export interface Client {
  // A page of the projects that match, filtered and sorted by the server.
  projects(query?: ProjectQuery, o?: ReadOptions): Promise<Page<Project>>;
  // Every tag in use, for the list's filter chips.
  projectTags(o?: ReadOptions): Promise<string[]>;
  project(id: string, o?: ReadOptions): Promise<Project>;
  updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "tags">>): Promise<Project>;
  createProject(input: Pick<Project, "name" | "description">): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  // The records that match a few letters, best first (the palette).
  search(query: string, o?: ReadOptions): Promise<SearchHit[]>;
  // Who is signed in (401 when nobody is), signing in, and out.
  me(): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
}

const search = () => (typeof location === "undefined" ? "" : location.search);
// Vite fills import.meta.env; node (the unit tests) has none.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export interface Env {
  DEV?: boolean | string;
  VITE_API_URL?: string;
  VITE_KNOBS?: string;
}

// The host's runtime configuration (public/config.js, loaded by index.html
// before the app): one build, any API. It wins over the build's env.
export interface RuntimeConfig {
  apiUrl?: string;
  // Force the fixtures, for a demo deployment.
  mock?: boolean;
}
const runtime = (): RuntimeConfig => (globalThis as { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__ ?? {};

// knobsOn says whether the URL may change where the app reads from (?mock,
// ?api=): in development, or in a build made with VITE_KNOBS=1 (a demo). A
// production build ignores them: a link must not be able to point the app
// at another server.
export const knobsOn = (e: Env = env): boolean => e.DEV === true || e.DEV === "true" || e.VITE_KNOBS === "1";

const pageOrigin = () => (typeof location === "undefined" ? "" : location.origin);
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

// urlApi is ?api= if it may be used: a path on this origin, this origin, or
// a server on this machine (localhost). Anywhere else is refused, so a link
// to a dev or demo build cannot send its requests, and whatever the
// headers hook adds (a token), to a stranger's server. A staging API is
// VITE_API_URL or config.js, which the link cannot change.
export function urlApi(s: string, origin: string = pageOrigin()): string | null {
  const raw = new URLSearchParams(s).get("api");
  if (!raw) return null;
  try {
    // Read as the browser will, against this page: a path that the parser
    // turns into another host (/\evil.test, a tab after the slash) is a
    // stranger's server like any other.
    const u = new URL(raw, origin || "http://localhost");
    if (raw.startsWith("/")) return u.origin === (origin || "http://localhost") && !/[\\\s]/.test(raw) ? raw : null;
    if (/^https?:\/\//i.test(raw) && (u.origin === origin || LOOPBACK.has(u.hostname))) return raw;
  } catch {
    // Not a URL: refused like a stranger's.
  }
  return null;
}

// apiBase is where the HTTP client sends requests: ?api= while knobs are
// on (this origin or localhost only, urlApi), else the host's config.js,
// else VITE_API_URL. Empty means there is no API, so the fixtures.
export const apiBase = (s: string = search(), e: Env = env, r: RuntimeConfig = runtime(), origin: string = pageOrigin()): string =>
  (knobsOn(e) ? urlApi(s, origin) : null) || r.apiUrl || e.VITE_API_URL || "";

// isMock says whether the app runs on its fixtures: asked for (?mock=1
// while knobs are on, or config.js says mock), or no API to read from.
export const isMock = (s: string = search(), e: Env = env, r: RuntimeConfig = runtime()): boolean => (knobsOn(e) && new URLSearchParams(s).get("mock") === "1") || r.mock === true || !apiBase(s, e, r);

// A read gets this long before it fails as "didn't answer", so nothing
// spins forever. Writes are left alone: they must not be cut off midway.
export const READ_TIMEOUT_MS = 30_000;

// errorBody reads {error, code, field} from a failed response's text; plain text
// is already the message.
function errorBody(text: string, fallback: string): { message: string; code?: string; field?: string } {
  try {
    const j = JSON.parse(text) as { error?: string; code?: string; field?: string };
    return { message: j.error ?? (text.trim() || fallback), code: j.code, field: j.field };
  } catch {
    return { message: text.trim() || fallback };
  }
}

// How the HTTP client reaches the server: a session cookie by default
// (credentials "include"); headers() for a bearer token kept in memory;
// onUnauthorized when any call answers 401 (docs/decisions/0011-sessions.md).
export interface ClientOptions {
  headers?: () => Record<string, string>;
  credentials?: RequestCredentials;
  onUnauthorized?: () => void;
  // How long to wait before each retry of a read (RETRY_DELAYS_MS); the tests
  // give [0, 0].
  retryDelays?: number[];
}

// A read that the network dropped, or that a busy server turned away (502,
// 503, 429), is tried twice more, after these waits (give or take a quarter,
// so many tabs don't come back at once), or after the server's Retry-After.
// A write is never tried again: it may have landed.
export const RETRY_DELAYS_MS = [400, 1200];

const retriable = (err: unknown) => err instanceof ApiError && (err.code === "network" || err.status === 502 || err.status === 503 || err.status === 429);

// pause waits ms, or rejects at once when the read is called off.
const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((done, fail) => {
    const t = setTimeout(done, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      fail(new ApiError("Asked for something else.", 0, "aborted"));
    });
  });

async function call<T>(base: string, method: string, path: string, body?: unknown, o: ClientOptions = {}, signal?: AbortSignal): Promise<T> {
  const delays = method === "GET" ? (o.retryDelays ?? RETRY_DELAYS_MS) : [];
  for (let attempt = 0; ; attempt++) {
    try {
      return await once<T>(base, method, path, body, o, signal);
    } catch (err) {
      const wait = delays[attempt];
      if (wait === undefined || !retriable(err) || signal?.aborted) throw err;
      await pause((err as ApiError).retryAfter ?? wait * (0.75 + Math.random() * 0.5), signal);
    }
  }
}

async function once<T>(base: string, method: string, path: string, body: unknown, o: ClientOptions, signal?: AbortSignal): Promise<T> {
  const ctrl = method === "GET" ? new AbortController() : undefined;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS) : undefined;
  // Called off by the caller (another filter): the fetch stops too.
  const callOff = () => ctrl?.abort();
  signal?.addEventListener("abort", callOff);
  let res: Response;
  try {
    if (signal?.aborted) ctrl?.abort();
    res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...o.headers?.() },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: o.credentials ?? "include",
      signal: ctrl?.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw new ApiError("Asked for something else.", 0, "aborted");
    if (ctrl?.signal.aborted) throw new ApiError("The server didn't answer.", 0, "timeout");
    throw new ApiError(err instanceof Error ? err.message : String(err), 0, "network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", callOff);
  }
  if (!res.ok) {
    const { message, code, field } = errorBody(await res.text(), `${res.status} ${res.statusText}`);
    if (res.status === 401) o.onUnauthorized?.();
    const err = new ApiError(message, res.status, code, field);
    const after = Number(res.headers?.get?.("Retry-After"));
    if (after > 0) err.retryAfter = Math.min(after, 30) * 1000;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  // A 200 that isn't JSON (a host serving index.html for a wrong apiUrl) is
  // the API failing, said as the app's error, not a SyntaxError.
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(text.trim().slice(0, 200) || "An empty answer.", res.status, "bad_response");
  }
}

// listQuery writes a list's query as a URL's search, leaving out what is
// unset: ?q=shop&status=active&tags=web,ops&sort=name:asc&cursor=50&limit=50.
export function listQuery(query: ProjectQuery = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    const s = Array.isArray(v) ? v.join(",") : v === undefined ? "" : String(v);
    if (s) p.set(k, s);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// httpClient talks to a JSON API at base: GET /projects?… (a Page),
// GET /project-tags, GET /projects/:id, PATCH /projects/:id,
// GET/POST/DELETE /session. Change the paths to your server's.
export function httpClient(base: string, o: ClientOptions = {}): Client {
  const c = <T>(method: string, path: string, body?: unknown, signal?: AbortSignal) => call<T>(base, method, path, body, o, signal);
  return {
    projects: (query, r) => c("GET", `/projects${listQuery(query)}`, undefined, r?.signal),
    projectTags: (r) => c("GET", "/project-tags", undefined, r?.signal),
    project: (id, r) => c("GET", `/projects/${encodeURIComponent(id)}`, undefined, r?.signal),
    updateProject: (id, patch) => c("PATCH", `/projects/${encodeURIComponent(id)}`, patch),
    createProject: (input) => c("POST", "/projects", input),
    deleteProject: (id) => c("DELETE", `/projects/${encodeURIComponent(id)}`),
    search: (query, r) => c("GET", `/search?q=${encodeURIComponent(query)}`, undefined, r?.signal),
    me: () => c("GET", "/session"),
    signIn: (email, password) => c("POST", "/session", { email, password }),
    signOut: () => c("DELETE", "/session"),
  };
}

// deferred is a Client whose real one comes from load, once, at the first
// call: the mock and its fixtures are their own chunk, loaded only in mock
// mode, so a build that talks to an API never carries them.
function deferred(load: () => Promise<Client>): Client {
  let loading: Promise<Client> | undefined;
  const get = () => (loading ??= load());
  return new Proxy({} as Client, {
    get:
      (_, method: keyof Client) =>
      (...args: unknown[]) =>
        get().then((c) => (c[method] as (...a: unknown[]) => unknown)(...args)),
  });
}

// client is the one the app uses: the fixtures, or the HTTP client. A 401
// from either signs the person out (lib/session.ts).
export const client: Client = isMock() ? deferred(() => import("./mock.ts").then((m) => m.mockClient({ onUnauthorized: signedOut }))) : httpClient(apiBase(), { onUnauthorized: signedOut });

// For the tests: the pieces on their own.
export { errorBody };
