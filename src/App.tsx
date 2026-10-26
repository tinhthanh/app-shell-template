import { Fragment, Suspense, useEffect, useState } from "react";

import { Announcer } from "@/components/announcer";
import { AppSidebar, PhoneBar, usePhone } from "@/components/app-sidebar";
import { ConfirmHost } from "@/components/confirm";
import { ErrorBoundary } from "@/components/error-boundary";
import { NotFound } from "@/components/not-here";
import { NoticeToasts } from "@/components/notices";
import { ShortcutsSheet } from "@/components/shortcuts-sheet";
import { StatusBar } from "@/components/status-bar";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWhatsNewAfterUpdate, WhatsNewDialog } from "@/components/whats-new/whats-new-dialog";
import { useOnlineStatus } from "@/hooks/use-online";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useApplyTheme } from "@/hooks/use-theme";
import { useWindowTitle } from "@/hooks/use-window-title";
import { track } from "@/lib/analytics";
import { client, isMock, knobsOn } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { useRescueRemovedFocus } from "@/lib/focus-home";
import { t } from "@/lib/i18n";
import { lazyView, preloadViews } from "@/lib/lazy-view";
import { usePrefs } from "@/lib/prefs";
import { signedIn, signedOut, useSession } from "@/lib/session";
import { watchStillness } from "@/lib/still";
import { assertNever, useStore, type View, type ViewKind } from "@/lib/store";
import { loadWorkspaces } from "@/lib/workspace";
import { HomeView } from "@/views/home/home-view";

// Home loads with the app; the other views load on first use (lib/lazy-view.tsx)
// and are fetched once the app is idle, so a first visit draws at once.
const ProjectsView = lazyView(() => import("@/views/projects/projects-view").then((m) => m.ProjectsView));
// Code the app doesn't start with: the palette until it is first opened,
// the sign-in page until someone is signed out.
const CommandPalette = lazyView(() => import("@/components/command-palette").then((m) => m.CommandPalette));
const SignInView = lazyView(() => import("@/views/signin/signin-view").then((m) => m.SignInView));
const KitView = lazyView(() => import("@/views/kit/kit-view").then((m) => m.KitView));
const SettingsView = lazyView(() => import("@/views/settings/settings-view").then((m) => m.SettingsView));

// What the window is called on each view, and what an error names. Every
// kind but home must be here: tsc says so.
// In the language in use, so read at render.
const viewTitles = () =>
  ({ projects: t("shell.place.projects"), kit: t("shell.place.kit"), settings: t("shell.place.settings"), missing: t("common.notFound.title") }) satisfies Record<Exclude<ViewKind, "home">, string>;

// ?crash=<kind> makes that view throw, so the error boundary around it can
// be seen and tested (e2e/shell.spec.ts). Only on the fixtures or with the
// knobs on: a production link can't crash a view.
const crash = isMock() || knobsOn() ? new URLSearchParams(location.search).get("crash") : null;

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
    case "missing":
      return <NotFound testid="missing" home />;
    default:
      return assertNever(view);
  }
}

export default function App() {
  useApplyTheme();
  useShortcuts();
  useWindowTitle(viewTitles());
  // Spinners and shimmers hold still while the window is in the background.
  useEffect(watchStillness, []);
  // The other views' code, fetched once the app has started and is idle.
  useEffect(preloadViews, []);
  // The keyboard is never dropped on <body> by what had it going away.
  useRescueRemovedFocus();
  // Offline, the status bar says so (hooks/use-online.ts).
  useOnlineStatus();
  // Once after an update: the release's notes (lib/whats-new.ts).
  useWhatsNewAfterUpdate();
  // Who is signed in: a 401 means nobody (the sign-in view); any other
  // failure lets the app open, and its reads say what is wrong.
  useEffect(() => {
    client.me().then(signedIn, (err) => (err instanceof ApiError && err.status === 401 ? signedOut() : signedIn()));
  }, []);
  const session = useSession((s) => s.status);
  // Signed in, the person's workspaces are read and one shows (lib/workspace.ts).
  useEffect(() => {
    if (session === "signed-in") void loadWorkspaces(() => client.workspaces());
  }, [session]);
  const view = useStore((s) => s.view);
  const phone = usePhone();
  // A new language redraws the frame and the dialogs in it (lib/i18n.ts);
  // the view, what was read and the session are kept outside, so they stay.
  const language = usePrefs((p) => p.language);
  // The palette is drawn from its first opening on, so it can close with its animation.
  const paletteOpen = useStore((s) => s.paletteOpen);
  const [paletteWanted, setPaletteWanted] = useState(false);
  if (paletteOpen && !paletteWanted) setPaletteWanted(true);
  // Usage, for those who share it (lib/analytics.ts): which kind of view, never its address.
  useEffect(() => track("view.open", { kind: view.kind }), [view.kind]);
  useEffect(() => {
    if (paletteOpen) track("palette.open");
  }, [paletteOpen]);
  // Away from a developer's machine, fixtures mean the API was never configured.
  const unconfigured = isMock() && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !knobsOn();

  if (session === "signed-out")
    return (
      <TooltipProvider delay={300}>
        <ToastProvider position="bottom-right">
          <Fragment key={language}>
            <Suspense>
              <SignInView />
            </Suspense>
          </Fragment>
          <Announcer />
        </ToastProvider>
      </TooltipProvider>
    );

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
        <Fragment key={language}>
          <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
            {unconfigured && (
              <div role="status" data-testid="mock-banner" className="shrink-0 border-warning/40 border-b bg-warning/16 px-4 py-1.5 text-center text-warning-foreground text-meta">
                {t("shell.unconfigured")}
              </div>
            )}
            {phone && <PhoneBar />}
            <div className="flex min-h-0 flex-1">
              {/* Settings is a page of its own on a desktop: its list takes the sidebar's place. */}
              {!(view.kind === "settings" && !phone) && <AppSidebar />}
              <main className="relative min-h-0 min-w-0 flex-1">
                <ErrorBoundary
                  key={view.kind}
                  scope={view.kind === "home" ? undefined : viewTitles()[view.kind]}
                  onLeave={view.kind === "home" ? undefined : () => useStore.getState().setView({ kind: "home" })}
                >
                  <Suspense>
                    <ViewFor view={view} />
                  </Suspense>
                </ErrorBoundary>
              </main>
            </div>
            {!(view.kind === "settings" && !phone) && <StatusBar />}
          </div>
          <ErrorBoundary scope={t("shell.aDialog")}>
            {paletteWanted && (
              <Suspense>
                <CommandPalette />
              </Suspense>
            )}
            <ShortcutsSheet />
            <ConfirmHost />
            <WhatsNewDialog />
          </ErrorBoundary>
        </Fragment>
        <NoticeToasts />
        <Announcer />
      </ToastProvider>
    </TooltipProvider>
  );
}
