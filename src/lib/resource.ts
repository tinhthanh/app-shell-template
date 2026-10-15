import { useCallback, useEffect, useReducer, useRef } from "react";

import { cached, remember, subscribe } from "./resource-cache.ts";
import { initial, initialFrom, next, type ResourceState } from "./resource-state.ts";

// useResource reads something from the API and says how that is going. Its
// status is a union, so a view can't draw one state and forget another;
// <ResourceView> (components/resource-view.tsx) draws them all:
//
//   const projects = useResource(() => client.projects(), [], { key: "projects" });
//   <ResourceView resource={projects} label="Reading projects…" isEmpty={(p) => !p.length} empty={<Empty …/>}>
//     {(projects) => <List projects={projects} />}
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
