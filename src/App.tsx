import { Suspense, useEffect } from "react";

import { Announcer } from "@/components/announcer";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ConfirmHost } from "@/components/confirm";
import { ErrorBoundary } from "@/components/error-boundary";
import { ShortcutsSheet } from "@/components/shortcuts-sheet";
import { StatusBar } from "@/components/status-bar";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useApplyTheme } from "@/hooks/use-theme";
import { useWindowTitle } from "@/hooks/use-window-title";
import { useRescueRemovedFocus } from "@/lib/focus-home";
import { lazyView, preloadViews } from "@/lib/lazy-view";
import { watchStillness } from "@/lib/still";
import { assertNever, useStore, type View, type ViewKind } from "@/lib/store";
import { HomeView } from "@/views/home/home-view";

// Home loads with the app; the other views load on first use (lib/lazy-view.tsx)
// and are fetched once the app is idle, so a first visit draws at once.
const ProjectsView = lazyView(() => import("@/views/projects/projects-view").then((m) => m.ProjectsView));
const KitView = lazyView(() => import("@/views/kit/kit-view").then((m) => m.KitView));
const SettingsView = lazyView(() => import("@/views/settings/settings-view").then((m) => m.SettingsView));

// What the window is called on each view, and what an error names. Every
// kind but home must be here: tsc says so.
const viewTitles = { projects: "Projects", kit: "Kit", settings: "Settings" } satisfies Record<Exclude<ViewKind, "home">, string>;

// ?crash=<kind> makes that view throw, so the error boundary around it can
// be seen and tested (e2e/shell.spec.ts); nothing else reads it.
const crash = new URLSearchParams(location.search).get("crash");

// ViewFor draws the view in front; a kind this switch leaves out fails to compile.
function ViewFor({ view }: { view: View }) {
  if (crash === view.kind) throw new Error(`Crashed on purpose (?crash=${crash})`);
  switch (view.kind) {
    case "home":
      return <HomeView />;
    case "projects":
      return <ProjectsView id={view.id} />;
    case "kit":
      return <KitView />;
    case "settings":
      return <SettingsView />;
    default:
      return assertNever(view);
  }
}

export default function App() {
  useApplyTheme();
  useShortcuts();
  useWindowTitle(viewTitles);
  // Spinners and shimmers hold still while the window is in the background.
  useEffect(watchStillness, []);
  // The other views' code, fetched once the app has started and is idle.
  useEffect(preloadViews, []);
  // The keyboard is never dropped on <body> by what had it going away.
  useRescueRemovedFocus();
  const view = useStore((s) => s.view);

  return (
    <TooltipProvider delay={300}>
      {/* Toasts sit bottom-right, above the status bar; a bar floating at a
          page's bottom can lift them by setting --app-bar-lift on the root.
          With a dialog or sheet open they move to a corner clear of it
          (components/ui/toast.tsx). */}
      <ToastProvider
        position="bottom-right"
        viewportClassName="max-w-88 data-[position=bottom-right]:bottom-[max(calc(26px+12px),var(--app-bar-lift,0px))] data-[position=bottom-right]:right-3 data-[position=bottom-left]:bottom-[calc(26px+12px)] data-[position=bottom-left]:left-3 data-[position=top-left]:top-3 data-[position=top-left]:left-3 data-[position=top-right]:top-3 data-[position=top-right]:right-3"
      >
        <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
          <div className="flex min-h-0 flex-1">
            <AppSidebar />
            <main className="relative min-h-0 min-w-0 flex-1">
              <ErrorBoundary
                key={view.kind}
                scope={view.kind === "home" ? undefined : viewTitles[view.kind]}
                onLeave={view.kind === "home" ? undefined : () => useStore.getState().setView({ kind: "home" })}
              >
                <Suspense>
                  <ViewFor view={view} />
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
          <StatusBar />
        </div>
        <ErrorBoundary scope="a dialog">
          <CommandPalette />
          <ShortcutsSheet />
          <ConfirmHost />
        </ErrorBoundary>
        <Announcer />
      </ToastProvider>
    </TooltipProvider>
  );
}
