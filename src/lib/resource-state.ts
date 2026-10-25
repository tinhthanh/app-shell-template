// How a read is going (lib/resource.ts), as a pure state machine so
// resource-state.test.ts runs it in node:
//
//   loading   nothing yet; the first read is on its way
//   failed    the first read failed; nothing to show but the error
//   ready     data is here. A reload keeps it on screen (loading: true), and
//             a reload that fails keeps it too, with error set beside it.

export type ResourceState<T> = { loading: boolean } & (
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "failed"; data?: undefined; error: unknown }
  | { status: "ready"; data: T; error?: unknown }
);

export type ResourceEvent<T> = { type: "start" } | { type: "loaded"; data: T } | { type: "failed"; error: unknown } | { type: "reset"; data?: T };

export const initial = <T>(): ResourceState<T> => ({ status: "loading", loading: true });

// initialFrom starts ready on what was kept from last time (lib/resource-cache.ts),
// reading again behind it.
export const initialFrom = <T>(data: T | undefined): ResourceState<T> => (data === undefined ? initial<T>() : { status: "ready", data, loading: true });

export function next<T>(s: ResourceState<T>, e: ResourceEvent<T>): ResourceState<T> {
  switch (e.type) {
    case "start":
      // A reload: what is here stays until the new answer; a failure from
      // before is cleared, since we are trying again.
      return s.status === "ready" ? { status: "ready", data: s.data, loading: true } : { status: "loading", loading: true };
    case "loaded":
      return { status: "ready", data: e.data, loading: false };
    case "failed":
      return s.status === "ready" ? { status: "ready", data: s.data, error: e.error, loading: false } : { status: "failed", error: e.error, loading: false };
    case "reset":
      // Another key (a list's other filter): what was kept for it, or the
      // loader, never the last key's data passed off as this one's.
      return initialFrom(e.data);
  }
}
