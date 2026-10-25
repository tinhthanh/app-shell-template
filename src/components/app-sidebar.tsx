import { ChevronDownIcon, LogOutIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toastError } from "@/components/error-note";
import { ink, inkScale } from "@/components/ink";
import { NotificationBell } from "@/components/notices";
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
import { isActive, type Place, places, RECORD_KINDS } from "@/lib/nav";
import { roleWords } from "@/lib/permissions";
import { IS_MAC, platformKeys } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { signedOut, useSession } from "@/lib/session";
import { RAIL_WIDTH, SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from "@/lib/sidebar-width";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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

// AppSidebar: the app's name, a search button that opens the palette, the
// places (lib/nav.tsx), and Settings at the bottom. Folded (⌘\), or in a
// window narrower than 800px, it is a rail of icons. Its width is dragged
// by its edge (sidebar-resize-handle.tsx).
// usePhone says the window is a phone's (under 640px): the sidebar becomes
// a bar across the top with the places in a sheet (PhoneBar).
export const usePhone = () => useMediaQuery("max-sm");

export function AppSidebar() {
  const context = useMemo(() => alwaysOpen, []);
  const collapsed = usePrefs((p) => p.sidebarCollapsed);
  const narrow = useIsMobile();
  const phone = usePhone();
  if (phone) return null;
  if (collapsed || narrow) return <Rail fixed={narrow} />;

  return (
    <SidebarContext.Provider value={context}>
      {/* Its width is --sidebar-w (prefs), or --sidebar-live as a drag runs,
          held to the narrowest and widest (lib/sidebar-width) even as the
          window shrinks. */}
      <aside
        aria-label={t("shell.sidebar")}
        data-testid="sidebar"
        style={{ width: `clamp(${SIDEBAR_MIN}px, var(--sidebar-live, var(--sidebar-w, ${SIDEBAR_DEFAULT}px)), max(${SIDEBAR_DEFAULT}px, min(${SIDEBAR_MAX}px, 40vw)))` }}
        className={cn("@container/side relative flex shrink-0 flex-col border-sidebar-border border-e bg-sidebar text-sidebar-foreground", inkScale)}
      >
        <div className="flex h-bar shrink-0 items-center gap-2 ps-lane pe-edge">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-4.5 rounded" />
          <span className="min-w-0 flex-1 truncate font-medium text-desc text-foreground">{APP_NAME}</span>
          <NotificationBell />
          <Tip label={t("shell.hideSidebarTip", { keys: "⌘\\" })} side="right">
            <button
              type="button"
              aria-label={t("shell.hideSidebar")}
              onClick={() => setPrefs({ sidebarCollapsed: true })}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeftCloseIcon className="size-3.5" />
            </button>
          </Tip>
        </div>

        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={() => useStore.getState().setPaletteOpen(true)}
            className="mb-1.5 flex h-7 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/50 px-2 text-desc text-muted-foreground hover:bg-sidebar-accent"
          >
            <SearchIcon className="size-3.5" />
            <span className="flex-1 text-start">{t("shell.search")}</span>
            <Kbd className="h-4.5 text-tag">⌘K</Kbd>
          </button>
          <Places footer={false} />
        </div>
        <Recent />

        <div className="mt-auto px-2 pb-2">
          <Places footer />
          <Account />
        </div>
        {/* Last in the Tab order: the edge is reached after the places, not before the app's name. */}
        <SidebarResizeHandle />
      </aside>
    </SidebarContext.Provider>
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

// Rail is the folded sidebar: the places as icons, each with a tooltip.
// fixed: the window is too narrow to open it.
function Rail({ fixed = false }: { fixed?: boolean }) {
  const view = useStore((s) => s.view);
  return (
    <aside
      aria-label={t("shell.sidebar")}
      data-testid="sidebar-rail"
      data-fixed={fixed || undefined}
      style={{ width: RAIL_WIDTH }}
      className={cn("relative flex shrink-0 flex-col items-center border-sidebar-border border-e bg-sidebar text-sidebar-foreground", inkScale)}
    >
      <div className="flex h-10 shrink-0 items-center">
        {fixed ? (
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-4.5 rounded" />
        ) : (
          <Tip label={t("shell.showSidebarTip", { keys: "⌘\\" })} side="right">
            <button
              type="button"
              aria-label={t("shell.showSidebar")}
              onClick={() => setPrefs({ sidebarCollapsed: false })}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeftOpenIcon className="size-4" />
            </button>
          </Tip>
        )}
      </div>
      <Tip label={t("shell.searchTip", { keys: platformKeys("⌘K") })} side="right">
        <button
          type="button"
          aria-label={t("shell.search")}
          onClick={() => useStore.getState().setPaletteOpen(true)}
          className="mb-2 inline-flex size-9 items-center justify-center rounded-lg border border-sidebar-border bg-background/50 text-muted-foreground hover:bg-sidebar-accent"
        >
          <SearchIcon className="size-4" />
        </button>
      </Tip>
      <nav aria-label={t("shell.places")} className="flex flex-col gap-1">
        {places()
          .filter((p) => !p.footer)
          .map((p) => (
            <RailButton key={p.id} place={p} active={isActive(p, view)} />
          ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1 pb-2">
        {places()
          .filter((p) => p.footer)
          .map((p) => (
            <RailButton key={p.id} place={p} active={isActive(p, view)} />
          ))}
        <Account compact />
      </div>
      {!fixed && <SidebarResizeHandle folded />}
    </aside>
  );
}

function RailButton({ place, active }: { place: Place; active: boolean }) {
  return (
    <Tip label={place.label} side="right">
      <button
        type="button"
        aria-label={place.label}
        aria-current={active ? "page" : undefined}
        data-testid={`nav-${place.id}`}
        onClick={() => useStore.getState().setView({ ...place.view })}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground [&_svg]:size-4.5",
          active && "bg-sidebar-accent text-foreground",
        )}
      >
        {place.icon}
      </button>
    </Tip>
  );
}

// Account is who is signed in, with Sign out in its menu (lib/session.ts);
// nothing while the app has no session yet or runs without one.
function Account({ compact = false }: { compact?: boolean }) {
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
            className={cn(
              "mt-1 flex h-side-row items-center gap-2 rounded-md px-2 text-desc text-(color:--ink-row) outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "size-9 justify-center px-0" : "w-full",
            )}
          />
        }
      >
        {/* The button is named by the name it shows (on the rail, for a screen
            reader only), so what is seen is what is said; the initials are a
            picture of it, and that it opens a menu is aria-haspopup's to say. */}
        <Avatar className="size-5" aria-hidden>
          <AvatarFallback className="text-tag">{initials}</AvatarFallback>
        </Avatar>
        <span className={compact ? "sr-only" : "min-w-0 flex-1 truncate text-start"}>{user.name}</span>
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
