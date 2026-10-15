import type { ReactNode } from "react";

// The pieces of a list view that every resource shares (the projects
// view is the example): ListToolbar holds the search and the filters
// under the header, left out of print; NothingMatches is what the rows
// become when the filters leave none. The rows themselves are a
// DataTable inside a ResourceView.
export function ListToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2" data-print="hide">
      {children}
    </div>
  );
}

export function NothingMatches({ children = "Nothing matches." }: { children?: ReactNode }) {
  return <p className="px-6 py-8 text-muted-foreground text-sm">{children}</p>;
}
