import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useStore, type View } from "@/lib/store";
import { cn } from "@/lib/utils";

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
// context, and its actions, so the view's name
// appears once. Every full-page view has one: Dashboard, Review, Settings,
// Project settings and plugin screens alike.
//
// Inside a ViewHeaderHost (Settings, plugin screens), a ViewHeader rendered
// anywhere below takes the host's strip, so a section or a plugin can name
// itself and add its actions without the page growing a second header.
export function ViewHeader(props: ViewHeaderProps) {
  const host = useContext(HostContext);
  const claim = host?.claim;
  useLayoutEffect(() => claim?.(), [claim]);
  if (!host) return <Strip {...props} />;
  return host.el ? createPortal(<Strip {...props} />, host.el) : null;
}

function Strip({ leading, crumbs, title, description, actions, children }: ViewHeaderProps) {
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

const HostContext = createContext<{ el: HTMLElement | null; claim(): () => void } | null>(null);

// ViewHeaderHost keeps a strip at the top of its view: fallback until a
// ViewHeader below claims it.
export function ViewHeaderHost({ fallback, children }: { fallback: ViewHeaderProps; children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [claims, setClaims] = useState(0);
  const claim = useCallback(() => {
    setClaims((c) => c + 1);
    return () => setClaims((c) => c - 1);
  }, []);
  const value = useMemo(() => ({ el, claim }), [el, claim]);
  return (
    <HostContext.Provider value={value}>
      <div ref={setEl} className="contents" />
      {claims === 0 && <Strip {...fallback} />}
      {children}
    </HostContext.Provider>
  );
}

// PluginPage is the body of a plugin screen: one width for every plugin,
// left aligned under the strip like the app's own pages.
export function PluginPage({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("w-full max-w-5xl space-y-5 px-6 pt-5 pb-16", className)}>{children}</div>;
}
