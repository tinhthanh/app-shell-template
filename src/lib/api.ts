// Relative imports and plain timers: api.test.ts runs this in node.
import { ApiError } from "./errors.ts";
import { mockClient } from "./mock.ts";
import type { Project } from "./types.ts";

export type * from "@/lib/types";
export { ApiError };

// The API the app reads and writes through. Every view talks to a Client,
// never to fetch, so the whole UI runs on fixtures (lib/mock.ts) without a
// server: `?mock=1` in the URL, or no VITE_API_URL set. The browser tests
// (e2e/) run that way, so they are fixed and quick.

export interface Client {
  projects(): Promise<Project[]>;
  project(id: string): Promise<Project>;
  updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "tags">>): Promise<Project>;
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

// apiBase is where the HTTP client sends requests: ?api= while knobs are
// on, else the host's config.js, else VITE_API_URL. Empty means there is no
// API, so the fixtures.
export const apiBase = (s: string = search(), e: Env = env, r: RuntimeConfig = runtime()): string => (knobsOn(e) ? new URLSearchParams(s).get("api") : null) || r.apiUrl || e.VITE_API_URL || "";

// isMock says whether the app runs on its fixtures: asked for (?mock=1
// while knobs are on, or config.js says mock), or no API to read from.
export const isMock = (s: string = search(), e: Env = env, r: RuntimeConfig = runtime()): boolean => (knobsOn(e) && new URLSearchParams(s).get("mock") === "1") || r.mock === true || !apiBase(s, e, r);

// A read gets this long before it fails as "didn't answer", so nothing
// spins forever. Writes are left alone: they must not be cut off midway.
export const READ_TIMEOUT_MS = 30_000;

// errorBody reads {error, code} from a failed response's text; plain text
// is already the message.
function errorBody(text: string, fallback: string): { message: string; code?: string } {
  try {
    const j = JSON.parse(text) as { error?: string; code?: string };
    return { message: j.error ?? (text.trim() || fallback), code: j.code };
  } catch {
    return { message: text.trim() || fallback };
  }
}

async function call<T>(base: string, method: string, path: string, body?: unknown): Promise<T> {
  const ctrl = method === "GET" ? new AbortController() : undefined;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS) : undefined;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl?.signal,
    });
  } catch (err) {
    if (ctrl?.signal.aborted) throw new ApiError("The server didn't answer.", 0, "timeout");
    throw new ApiError(err instanceof Error ? err.message : String(err), 0, "network");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const { message, code } = errorBody(await res.text(), `${res.status} ${res.statusText}`);
    throw new ApiError(message, res.status, code);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// httpClient talks to a JSON API at base: GET /projects, GET /projects/:id,
// PATCH /projects/:id. Change the paths to your server's.
export function httpClient(base: string): Client {
  return {
    projects: () => call(base, "GET", "/projects"),
    project: (id) => call(base, "GET", `/projects/${encodeURIComponent(id)}`),
    updateProject: (id, patch) => call(base, "PATCH", `/projects/${encodeURIComponent(id)}`, patch),
  };
}

// client is the one the app uses: the fixtures, or the HTTP client.
export const client: Client = isMock() ? mockClient() : httpClient(apiBase());

// For the tests: the pieces on their own.
export { errorBody };
