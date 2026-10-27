import type { ReactNode } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useStore, type View } from "@/lib/store";

interface ViewHeaderProps {
  // Before the title, outside the heading: a back button, say.
  leading?: ReactNode;
  // Where this page sits, each a link (a detail under its list).
  crumbs?: { label: string; view: View }[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

// ViewHeader is a full-page view's top strip: its title, a short line of
// context, and its actions, so the view's name appears once. Home, Projects,
// Tasks, the Kit and every record's page (components/detail-page.tsx) have
// one; Settings draws its own beside its list of sections.
export function ViewHeader({ leading, crumbs, title, description, actions, children }: ViewHeaderProps) {
  return (
    <header className="flex min-h-bar shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-sidebar/40 px-page py-1">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading}
        {crumbs?.length ? (
          <Breadcrumb>
            <BreadcrumbList className="text-body">
              {crumbs.map((c) => (
                <BreadcrumbItem key={c.label} className="contents">
                  <BreadcrumbLink
                    render={<button type="button" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => useStore.getState().setView(c.view)} />}
                  >
                    {c.label}
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <h1 className="shrink-0 text-row">{title}</h1>
        {description && <p className="hidden min-w-0 truncate text-muted-foreground text-meta md:block">{description}</p>}
      </div>
      {children}
      {actions && (
        <div className="flex shrink-0 items-center gap-2" data-print="hide">
          {actions}
        </div>
      )}
    </header>
  );
}
