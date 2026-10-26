import type { ReactNode } from "react";

import { ErrorNote } from "@/components/error-note";
import { Forbidden, NotFound, notHere } from "@/components/not-here";
import { PixelLoader } from "@/components/pixel-loader";
import type { Resource } from "@/lib/resource";

// ResourceView draws a read in every state it can be in, so no view forgets
// one: the loader while nothing is here yet, an ErrorNote with Try again
// when the first read failed, the empty state when there is nothing, and
// else the data through children. A reload keeps the data on screen (the
// caller can spin its Reload button on `loading`); a reload that failed
// keeps it too, under a note that says so, with Try again, so data that
// may be stale never passes for fresh.
//
// A first read the server answered 404 or 403 for is NotFound or Forbidden
// (not-here.tsx) rather than an error to try again.
//
// testid gives the states names a test can find: <testid>-loading,
// <testid>-failed, <testid>-missing, <testid>-forbidden, <testid>-empty,
// <testid>-stale.
export function ResourceView<T>({
  resource,
  label,
  testid,
  isEmpty,
  empty,
  children,
}: {
  resource: Resource<T>;
  label: string;
  testid?: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  switch (resource.status) {
    case "loading":
      return (
        <div className="flex h-full items-center justify-center" data-testid={testid && `${testid}-loading`}>
          <PixelLoader label={label} />
        </div>
      );
    case "failed":
      if (notHere(resource.error) === "missing") return <NotFound testid={testid && `${testid}-missing`} />;
      if (notHere(resource.error) === "forbidden") return <Forbidden testid={testid && `${testid}-forbidden`} />;
      return (
        <div className="mx-auto w-full max-w-xl px-8 pt-8" data-testid={testid && `${testid}-failed`}>
          <ErrorNote error={resource.error} onRetry={resource.reload} />
        </div>
      );
    case "ready":
      if (isEmpty?.(resource.data))
        return (
          <div className="h-full" data-testid={testid && `${testid}-empty`}>
            {empty}
          </div>
        );
      if (resource.error !== undefined && !resource.loading)
        return (
          <div className="flex h-full flex-col">
            <div className="shrink-0 px-page pt-3" data-testid={testid && `${testid}-stale`}>
              <ErrorNote error={resource.error} onRetry={resource.reload} />
            </div>
            <div className="min-h-0 flex-1">{children(resource.data)}</div>
          </div>
        );
      return <>{children(resource.data)}</>;
  }
}
