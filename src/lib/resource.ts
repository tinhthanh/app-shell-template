import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { appendPage, PAGE_SIZE } from "./pages.ts";
import { cached, mutate, remember, subscribe } from "./resource-cache.ts";
import { initial, initialFrom, next, type ResourceState } from "./resource-state.ts";
import type { Page } from "./types.ts";

// useResource reads something from the API and says how that is going. Its
// status is a union, so a view can't draw one state and forget another;
// <ResourceView> (components/resource-view.tsx) draws them all:
//
//   const tags = useResource(() => client.projectTags(), [], { key: "project-tags" });
//   <ResourceView resource={tags} label="Reading tags…" isEmpty={(t) => !t.length} empty={<Empty …/>}>
//     {(tags) => <Tags tags={tags} />}
//   </ResourceView>
//
// With a key, the answer is kept (lib/resource-cache.ts): a view that comes
// back starts ready on it and reads again behind, and mutate(key, …) shows
// a write's result at once. A reload keeps the old data on screen until
// the new arrives (loading is true meanwhile), a reload that fails keeps
// it with the error beside it, and an answer that lands after the
// component asked for something else is dropped (lib/resource-state.ts).

export type Resource<T> = ResourceState<T> & { reload(): void };

export function useResource<T>(read: () => Promise<T>, deps: unknown[], opts: { key?: string } = {}): Resource<T> {
  const key = opts.key;
  const [state, dispatch] = useReducer(next<T>, key, (k) => (k ? initialFrom(cached<T>(k)) : initial<T>()));
  const run = useRef(0);
  const [tick, bump] = useReducer((t: number) => t + 1, 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is the caller's list, and tick is the reload.
  useEffect(() => {
    const id = ++run.current;
    dispatch({ type: "start" });
    read().then(
      (data) => {
        if (id !== run.current) return;
        if (key) remember(key, data);
        else dispatch({ type: "loaded", data });
      },
      (error) => id === run.current && dispatch({ type: "failed", error }),
    );
    return () => {
      run.current++;
    };
  }, [...deps, tick]);
  // What is kept under the key changes (an answer, a mutate): draw it.
  useEffect(() => (key ? subscribe<T>(key, (data) => dispatch({ type: "loaded", data })) : undefined), [key]);
  const reload = useCallback(() => bump(), []);
  return { ...state, reload };
}

// The next page of a list, as <DataTable more> (components/data-table.tsx)
// draws and asks for it: whether there is one, whether it is on its way or
// failed, and how to read it.
export interface More {
  has: boolean;
  loading: boolean;
  failed: boolean;
  load(): void;
}

// usePages reads a list a page at a time (lib/pages.ts): the first page as
// useResource does, kept under key (one key per filter and sort, so each
// is kept on its own, and a new key reads again), and more.load() the next after the pages read so
// far. Coming back, it reads again as many rows as were kept, so the row
// the keyboard left is still there. A page that lands after the list
// changed (another filter, a reload) is dropped.
//
//   const projects = usePages((page) => client.projects({ ...filters, ...page }), { key: `projects${listQuery(filters)}` });
//   <DataTable rows={projects.data.items} total={projects.data.total} more={projects.more} … />
export function usePages<T extends { id: string }>(read: (page: { cursor?: string; limit: number }) => Promise<Page<T>>, opts: { key: string }): Resource<Page<T>> & { more: More } {
  const key = opts.key;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key names what read asks for; read is a new closure every render.
  const first = useResource(() => read({ limit: Math.max(PAGE_SIZE, cached<Page<T>>(key)?.items.length ?? 0) }), [key], { key });
  const [more, setMore] = useState<{ key: string; status: "loading" | "failed" }>();
  const asked = useRef<string>(undefined);
  const cursor = first.status === "ready" ? first.data.next : undefined;
  const status = more?.key === key ? more.status : undefined;
  const load = () => {
    if (!cursor) return;
    const ask = `${key}\n${cursor}`;
    if (asked.current === ask) return;
    asked.current = ask;
    setMore({ key, status: "loading" });
    read({ cursor, limit: PAGE_SIZE }).then(
      (page) => {
        if (asked.current !== ask) return;
        asked.current = undefined;
        mutate<Page<T>>(key, (sofar) => (sofar && sofar.next === cursor ? appendPage(sofar, page) : sofar));
        setMore(undefined);
      },
      () => {
        if (asked.current !== ask) return;
        asked.current = undefined;
        setMore({ key, status: "failed" });
      },
    );
  };
  return { ...first, more: { has: Boolean(cursor), loading: status === "loading", failed: status === "failed", load } };
}
