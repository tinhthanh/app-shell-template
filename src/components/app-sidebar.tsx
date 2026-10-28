import { ChevronDownIcon, LogOutIcon, MenuIcon, PanelLeftCloseIcon, SearchIcon } from "lucide-react";
import { Suspense, useEffect, useMemo, useReducer, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { toastError } from "@/components/error-note";
import { ink, inkScale } from "@/components/ink";
import { NotificationBell } from "@/components/notices";
import { RAIL, WorkspaceAvatar, WorkspaceHeader, WorkspaceRail } from "@/components/sidebar-rail";
import { SidebarResizeHandle } from "@/components/sidebar-resize-handle";
import { Tip } from "@/components/tip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContext, type SidebarContextProps, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useIsMobile, useMediaQuery } from "@/hooks/use-media-query";
import { client } from "@/lib/api";
import { APP_NAME } from "@/lib/app";
import { usePlaceBadges } from "@/lib/badges";
import { t } from "@/lib/i18n";
import { lazyView } from "@/lib/lazy-view";
import { isActive, type Place, places, RECORD_KINDS } from "@/lib/nav";
import { roleWords } from "@/lib/permissions";
import { IS_MAC } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { signedOut, useSession } from "@/lib/session";
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from "@/lib/sidebar-width";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { switchWorkspace, useWorkspaceId, useWorkspaces } from "@/lib/workspace";

// The sidebar is always open on a desktop window; coss ui's menu pieces only
// need to know that.
const alwaysOpen: SidebarContextProps = {
  state: "expanded",
  open: true,
  setOpen: () => {},
  openMobile: false,
  setOpenMobile: () => {},
  isMobile: false,
  toggleSidebar: () => {},
};

// AppSidebar: the rail (sidebar-rail.tsx: the places, the workspaces,
// Settings) beside the sheet (the workspace on show, search, and the open
// place's own list). Folded (⌘\), or in a narrow window, only the rail is
// left. The sheet's width is dragged by its edge (sidebar-resize-handle.tsx).
// usePhone says the window is a phone's (under 640px): the sidebar becomes
// a bar across the top with the places in a sheet (PhoneBar).
export const usePhone = () => useMediaQuery("max-sm");

export function AppSidebar() {
  const context = useMemo(() => alwaysOpen, []);
  const collapsed = usePrefs((p) => p.sidebarCollapsed);
  const narrow = useIsMobile();
  const phone = usePhone();
  if (phone) return null;
  const folded = collapsed || narrow;
  // The sheet's width is --sidebar-w (prefs), or --sidebar-live as a drag
  // runs, held to the narrowest and widest (lib/sidebar-width) even as the
  // window shrinks; the rail sits beside it.
  const sheet = `clamp(${SIDEBAR_MIN}px, var(--sidebar-live, var(--sidebar-w, ${SIDEBAR_DEFAULT}px)), max(${SIDEBAR_DEFAULT}px, min(${SIDEBAR_MAX}px, 40vw)))`;

  return (
    <SidebarContext.Provider value={context}>
      <aside
        aria-label={t("shell.sidebar")}
        data-testid={folded ? "sidebar-rail" : "sidebar"}
        data-fixed={(folded && narrow) || undefined}
        // Its own end border comes on top, so the sheet is the width it was given.
        style={{ width: folded ? RAIL + 1 : `calc(${RAIL}px + ${sheet} + 1px)` }}
        className={cn("@container/side relative flex shrink-0 flex-col border-sidebar-border border-e bg-sidebar text-sidebar-foreground", inkScale)}
      >
        {!folded && <TopStrip />}
        <div className="flex min-h-0 flex-1">
          <WorkspaceRail folded={folded} fixed={narrow} />
          {!folded && <SidebarSheet />}
        </div>
        {/* Last in the Tab order: the edge is reached after the places, not before the app's name. */}
        {!narrow && <SidebarResizeHandle folded={folded} />}
      </aside>
    </SidebarContext.Provider>
  );
}

// TopStrip is the band over the rail and the sheet: the app's mark and name,
// then the notifications and the way to fold the sheet away.
function TopStrip() {
  return (
    <div className="flex h-bar shrink-0 items-center gap-2 ps-lane pe-edge">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-4.5 rounded" />
      <span className="min-w-0 flex-1 truncate font-medium text-desc text-foreground">{APP_NAME}</span>
      <NotificationBell className="size-7 rounded-lg [&_svg]:size-4" />
      <Tip label={t("shell.hideSidebarTip", { keys: "⌘\\" })} side="bottom">
        <button
          type="button"
          aria-label={t("shell.hideSidebar")}
          onClick={() => setPrefs({ sidebarCollapsed: true })}
          className={cn("inline-flex size-7 items-center justify-center rounded-lg hover:bg-sidebar-accent hover:text-foreground [&_svg]:size-4", ink.glyph)}
        >
          <PanelLeftCloseIcon className="rtl:-scale-x-100" />
        </button>
      </Tip>
    </div>
  );
}

// SidebarSheet is beside the rail, on its own raised card: the workspace on show,
// search, and the open place's own list (Projects' by status; elsewhere
// the records opened last). Its top and start border carry on the strip's.
// Lazy as the views are, so it is fetched while the app is idle (lib/lazy-view.tsx).
const ProjectsColumn = lazyView(() => import("@/views/projects/projects-column").then((m) => m.default));

function SidebarSheet() {
  const kind = useStore((s) => s.view.kind);
  // Back online, a list that couldn't load tries again (its boundary starts afresh).
  const [online, cameBack] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener("online", cameBack);
    return () => window.removeEventListener("online", cameBack);
  }, []);
  const role = useSession((s) => s.user?.role);
  return (
    <div data-testid="sidebar-sheet" className="flex min-w-0 flex-1 flex-col rounded-ss-xl border-sidebar-border border-s border-t bg-background">
      <WorkspaceHeader subtitle={role ? roleWords(role) : undefined} />
      <div className="shrink-0 px-edge pb-1">
        <button
          type="button"
          onClick={() => useStore.getState().setPaletteOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background px-2.5 text-start shadow-xs/5 hover:border-foreground/20"
        >
          <SearchIcon className={cn("size-3.5 shrink-0", ink.glyph)} />
          <span className={cn("flex-1 text-desc", ink.faint)}>{t("shell.search")}</span>
          <Kbd className="h-4.5 text-tag">⌘K</Kbd>
        </button>
      </div>
      {/* A column that can't load (offline before it was fetched) leaves Recent in its place, not a broken app. */}
      <ErrorBoundary key={`${kind}:${online}`} scope={t("shell.sidebar")} fallback={<Recent />}>
        <Suspense>{kind === "projects" ? <ProjectsColumn /> : <Recent />}</Suspense>
      </ErrorBoundary>
      <div className="mt-auto px-edge pb-2">
        <Account />
      </div>
    </div>
  );
}

// Places lists the sidebar's rows: the top group, or the bottom one.
// onGo is told when one is chosen (the phone's sheet closes).
function Places({ footer, onGo }: { footer: boolean; onGo?: () => void }) {
  const view = useStore((s) => s.view);
  const badges = usePlaceBadges();
  const list = places().filter((p) => !!p.footer === footer);
  return (
    <nav aria-label={footer ? t("shell.more") : t("shell.places")}>
      <SidebarMenu>
        {list.map((p, i) => {
          const active = isActive(p, view);
          return (
            <SidebarMenuItem key={p.id}>
              {/* data-active is "true" or "false", so the style keys on the value. */}
              <SidebarMenuButton
                isActive={active}
                aria-current={active ? "page" : undefined}
                aria-keyshortcuts={footer ? undefined : `${IS_MAC ? "Meta" : "Control"}+${placeNumber(p, i)}`}
                data-testid={`nav-${p.id}`}
                onClick={() => {
                  useStore.getState().setView({ ...p.view });
                  onGo?.();
                }}
                className={cn(
                  "h-side-row gap-2.5 text-desc hover:text-foreground [&_svg]:size-4 [&_svg]:text-(color:--ink-glyph) data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:[&_svg]:text-(color:--ink-row)",
                  ink.row,
                )}
              >
                {p.icon}
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
                {/* The count is part of the row's name ("Projects 8"); under a hover or the keyboard, the key's
                    hint takes its place (both in one grid cell). The hint is decoration: the key is aria-keyshortcuts. */}
                <span className="grid justify-items-end">
                  {badges[p.id] && (
                    <span
                      data-testid={`place-badge-${p.id}`}
                      className={cn(
                        "col-start-1 row-start-1 text-tag tabular-nums transition-opacity",
                        !footer && "group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0",
                        badges[p.id]?.loud ? "rounded-full bg-warning/16 px-1.5 text-warning-foreground" : "text-(color:--ink-faint)",
                      )}
                    >
                      {badges[p.id]?.count}
                    </span>
                  )}
                  {!footer && (
                    <Kbd
                      aria-hidden
                      className="col-start-1 row-start-1 h-4.5 text-tag text-(color:--ink-faint) opacity-0 transition-opacity group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100"
                    >
                      {`⌘${placeNumber(p, i)}`}
                    </Kbd>
                  )}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

// Recent is the sidebar's section of the records opened last (lib/recent.ts),
// under a heading that folds it away (remembered in prefs). Nothing opened
// yet, nothing shown. After Shipyard's sections (github.com/cosscom/shipyard, MIT).
function Recent() {
  const recent = usePrefs((p) => p.recent);
  const folded = usePrefs((p) => p.folded.includes("recent"));
  const view = useStore((s) => s.view);
  if (!recent.length) return null;
  const title = t("shell.recent");
  return (
    <nav aria-label={title} className="px-2 pt-3 pb-1" data-testid="recent">
      <button
        type="button"
        aria-expanded={!folded}
        aria-label={folded ? t("shell.showSection", { section: title }) : t("shell.foldSection", { section: title })}
        data-testid="recent-fold"
        onClick={() => {
          const rest = usePrefs.getState().folded.filter((f) => f !== "recent");
          setPrefs({ folded: folded ? rest : [...rest, "recent"] });
        }}
        className={cn("flex h-6 w-full items-center gap-1 rounded-md px-2 text-start text-label outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", ink.faint)}
      >
        <ChevronDownIcon aria-hidden className={cn("size-3 transition-transform", folded && "-rotate-90 rtl:rotate-90")} />
        {title}
      </button>
      {!folded && (
        <SidebarMenu>
          {recent.map((r) => {
            const kind = RECORD_KINDS[r.kind];
            const target = kind.view(r.id);
            const active = view.kind === target.kind && "id" in view && view.id === r.id;
            return (
              <SidebarMenuItem key={`${r.kind}:${r.id}`}>
                <SidebarMenuButton
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  data-testid={`recent-${r.kind}-${r.id}`}
                  onClick={() => useStore.getState().setView(target)}
                  className={cn(
                    "h-side-row gap-2.5 text-desc hover:text-foreground [&_svg]:size-4 [&_svg]:text-(color:--ink-glyph) data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground",
                    ink.row,
                  )}
                >
                  {kind.icon}
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
    </nav>
  );
}

// placeNumber is the key that jumps to a place (⌘1–9), by its position
// among every place, as hooks/use-shortcuts.ts counts them.
function placeNumber(p: Place, fallback: number): number {
  const i = places().findIndex((x) => x.id === p.id);
  return (i >= 0 ? i : fallback) + 1;
}

// Account is who is signed in, with Sign out in its menu (lib/session.ts);
// nothing while the app has no session yet or runs without one.
function Account() {
  const user = useSession((s) => s.user);
  if (!user) return null;
  const initials = user.name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  // Signing out signs this browser out whatever the server answers: on a
  // shared machine, a sign-out that failed must not leave the next person in.
  const signOut = async () => {
    try {
      await client.signOut();
    } catch (err) {
      toastError(err, t("shell.signOutFailed"));
    } finally {
      signedOut();
    }
  };
  return (
    <Menu>
      <MenuTrigger
        data-testid="account"
        render={
          <button
            type="button"
            className="mt-1 flex h-side-row w-full items-center gap-2 rounded-md px-2 text-desc text-(color:--ink-row) outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        {/* The button is named by the name it shows, so what is seen is what is said; the initials are a
            picture of it, and that it opens a menu is aria-haspopup's to say. */}
        <Avatar className="size-5" aria-hidden>
          <AvatarFallback className="text-tag">{initials}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-start">{user.name}</span>
      </MenuTrigger>
      <MenuPopup align="start" className="min-w-48">
        <div className="px-2 py-1.5 text-muted-foreground text-meta">
          <div className="truncate">{user.email}</div>
          <div data-testid="account-role">{roleWords(user.role)}</div>
        </div>
        <MenuItem onClick={() => void signOut()}>
          <LogOutIcon />
          {t("shell.signOut")}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

// PhoneBar is the shell on a phone (App.tsx, under 640px): the app's name,
// a menu that opens the places in a sheet from the start edge, and search.
export function PhoneBar() {
  const context = useMemo(() => alwaysOpen, []);
  const [open, setOpen] = useState(false);
  return (
    // grid-ok: a phone's bar is 44px, a finger's target, not the desktop's band
    <header data-testid="phone-bar" className="flex h-11 shrink-0 items-center gap-1 border-b bg-sidebar px-2 text-sidebar-foreground">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<button type="button" aria-label={t("shell.menu")} className="inline-flex size-9 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-foreground" />}
        >
          <MenuIcon className="size-5" />
        </SheetTrigger>
        <SheetPopup side="left" className="w-72 max-w-[85vw]">
          <SheetHeader>
            <SheetTitle>{APP_NAME}</SheetTitle>
            <SheetDescription className="sr-only">{t("shell.whereToGo")}</SheetDescription>
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-4 px-2">
            <SidebarContext.Provider value={context}>
              <PhoneWorkspaces onGo={() => setOpen(false)} />
              <Places footer={false} onGo={() => setOpen(false)} />
              <Places footer onGo={() => setOpen(false)} />
              <Account />
            </SidebarContext.Provider>
          </SheetPanel>
        </SheetPopup>
      </Sheet>
      <span className="min-w-0 flex-1 truncate ps-1 font-medium text-desc text-foreground">{APP_NAME}</span>
      <button
        type="button"
        aria-label={t("shell.search")}
        onClick={() => useStore.getState().setPaletteOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-foreground"
      >
        <SearchIcon className="size-4.5" />
      </button>
    </header>
  );
}

// PhoneWorkspaces is the rail's workspaces in the phone's sheet: a row each,
// the one on show lit.
function PhoneWorkspaces({ onGo }: { onGo(): void }) {
  const list = useWorkspaces((s) => s.list);
  const current = useWorkspaceId();
  if (list.length < 2) return null;
  return (
    <nav aria-label={t("shell.workspaces")}>
      <SidebarMenu>
        {list.map((w) => (
          <SidebarMenuItem key={w.id}>
            <SidebarMenuButton
              isActive={w.id === current}
              aria-current={w.id === current ? "true" : undefined}
              data-testid="phone-workspace"
              onClick={() => {
                switchWorkspace(w.id);
                onGo();
              }}
              className={cn("h-side-row gap-2.5 text-desc", ink.row)}
            >
              <WorkspaceAvatar name={w.name} size={20} />
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  );
}
