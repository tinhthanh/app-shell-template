import type { ReactNode } from "react";

import { ErrorNote } from "@/components/error-note";
import { PixelLoader } from "@/components/pixel-loader";
import type { Resource } from "@/lib/resource";

// ResourceView draws a read in every state it can be in, so no view forgets
// one: the loader while nothing is here yet, an ErrorNote with Try again
// when the first read failed, the empty state when there is nothing, and
// else the data through children. A reload, or a reload that failed, keeps
// the data on screen; the caller shows `loading` and `error` beside it if
// it wants (a spinning Reload button, a toast).
//
// testid gives the states names a test can find: <testid>-loading,
// <testid>-failed, <testid>-empty.
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
      return <>{children(resource.data)}</>;
  }
}
