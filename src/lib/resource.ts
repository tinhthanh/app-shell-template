import { useCallback, useEffect, useRef, useState } from "react";

// useResource reads something from the API and says how that is going:
// loading, failed, or here. Every list and detail view draws its three
// states from this, so they all behave alike: a reload keeps the old data
// on screen until the new arrives, and an answer that lands after the
// component moved on is dropped.
//
//   const projects = useResource(() => client.projects(), []);
//   if (projects.error) return <ErrorNote … onRetry={projects.reload} />;
//   if (!projects.data) return <PixelLoader label="Reading projects…" />;

export interface Resource<T> {
  data?: T;
  error?: unknown;
  loading: boolean;
  reload(): void;
}

export function useResource<T>(read: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is the caller's list.
  useEffect(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true }));
    read().then(
      (data) => id === run.current && setState({ data, loading: false }),
      (error) => id === run.current && setState((s) => ({ data: s.data, error, loading: false })),
    );
    return () => {
      run.current++;
    };
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
