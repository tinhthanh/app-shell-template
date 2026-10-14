import { useCallback, useEffect, useReducer, useRef } from "react";

import { initial, next, type ResourceState } from "./resource-state.ts";

// useResource reads something from the API and says how that is going. Its
// status is a union, so a view can't draw one state and forget another;
// <ResourceView> (components/resource-view.tsx) draws them all:
//
//   const projects = useResource(() => client.projects(), []);
//   <ResourceView resource={projects} label="Reading projects…" isEmpty={(p) => !p.length} empty={<Empty …/>}>
//     {(projects) => <List projects={projects} />}
//   </ResourceView>
//
// A reload keeps the old data on screen until the new arrives (loading is
// true meanwhile), a reload that fails keeps it with the error beside it,
// and an answer that lands after the component asked for something else is
// dropped (lib/resource-state.ts has the transitions).

export type Resource<T> = ResourceState<T> & { reload(): void };

export function useResource<T>(read: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [state, dispatch] = useReducer(next<T>, undefined, initial<T>);
  const run = useRef(0);
  const [tick, bump] = useReducer((t: number) => t + 1, 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is the caller's list, and tick is the reload.
  useEffect(() => {
    const id = ++run.current;
    dispatch({ type: "start" });
    read().then(
      (data) => id === run.current && dispatch({ type: "loaded", data }),
      (error) => id === run.current && dispatch({ type: "failed", error }),
    );
    return () => {
      run.current++;
    };
  }, [...deps, tick]);
  const reload = useCallback(() => bump(), []);
  return { ...state, reload };
}
