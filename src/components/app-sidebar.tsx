import { PanelLeftCloseIcon, PanelLeftOpenIcon, SearchIcon } from "lucide-react";
import { useMemo } from "react";

import { SidebarResizeHandle } from "@/components/sidebar-resize-handle";
import { Tip } from "@/components/tip";
import { Kbd } from "@/components/ui/kbd";
import { SidebarContext, type SidebarContextProps, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-media-query";
import { APP_NAME } from "@/lib/app";
import { isActive, type Place, places } from "@/lib/nav";
import { platformKeys } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
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
export function AppSidebar() {
  const context = useMemo(() => alwaysOpen, []);
  const collapsed = usePrefs((p) => p.sidebarCollapsed);
  const narrow = useIsMobile();
  if (collapsed || narrow) return <Rail fixed={narrow} />;

  return (
    <SidebarContext.Provider value={context}>
      {/* Its width is --sidebar-w (prefs), or --sidebar-live as a drag runs,
          held to the narrowest and widest (lib/sidebar-width) even as the
          window shrinks. */}
      <aside
        aria-label="Sidebar"
        data-testid="sidebar"
        style={{ width: `clamp(${SIDEBAR_MIN}px, var(--sidebar-live, var(--sidebar-w, ${SIDEBAR_DEFAULT}px)), max(${SIDEBAR_DEFAULT}px, min(${SIDEBAR_MAX}px, 40vw)))` }}
        className="@container/side relative flex shrink-0 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground"
      >
        <SidebarResizeHandle />
        <div className="flex h-10 shrink-0 items-center gap-2 px-3">
          <img src="/favicon.svg" alt="" className="size-4.5 rounded" />
          <span className="min-w-0 flex-1 truncate font-medium text-[13px] text-foreground">{APP_NAME}</span>
          <Tip label="Hide the sidebar (⌘\)" side="right">
            <button
              type="button"
              aria-label="Hide the sidebar"
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
            className="mb-1.5 flex h-7 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/50 px-2 text-[13px] text-muted-foreground hover:bg-sidebar-accent"
          >
            <SearchIcon className="size-3.5" />
            <span className="flex-1 text-left">Search</span>
            <Kbd className="h-4.5 text-[10px]">⌘K</Kbd>
          </button>
          <Places footer={false} />
        </div>

        <div className="mt-auto px-2 pb-2">
          <Places footer />
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}

// Places lists the sidebar's rows: the top group, or the bottom one.
function Places({ footer }: { footer: boolean }) {
  const view = useStore((s) => s.view);
  const list = places().filter((p) => !!p.footer === footer);
  return (
    <SidebarMenu aria-label={footer ? "More" : "Places"}>
      {list.map((p, i) => (
        <SidebarMenuItem key={p.id}>
          <SidebarMenuButton
            isActive={isActive(p, view)}
            data-testid={`nav-${p.id}`}
            onClick={() => useStore.getState().setView({ ...p.view })}
            className="h-side-row gap-2.5 text-[13px] [&_svg]:size-4 data-active:bg-sidebar-accent data-active:text-foreground"
          >
            {p.icon}
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            {!footer && <Kbd className="h-4.5 text-[10px] opacity-0 transition-opacity group-hover/menu-item:opacity-100">{`⌘${placeNumber(p, i)}`}</Kbd>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
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
      aria-label="Sidebar"
      data-testid="sidebar-rail"
      data-fixed={fixed || undefined}
      style={{ width: RAIL_WIDTH }}
      className="relative flex shrink-0 flex-col items-center border-sidebar-border border-r bg-sidebar text-sidebar-foreground"
    >
      {!fixed && <SidebarResizeHandle folded />}
      <div className="flex h-10 shrink-0 items-center">
        {fixed ? (
          <img src="/favicon.svg" alt="" className="size-4.5 rounded" />
        ) : (
          <Tip label="Show the sidebar (⌘\)" side="right">
            <button
              type="button"
              aria-label="Show the sidebar"
              onClick={() => setPrefs({ sidebarCollapsed: false })}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeftOpenIcon className="size-4" />
            </button>
          </Tip>
        )}
      </div>
      <Tip label={`Search (${platformKeys("⌘K")})`} side="right">
        <button
          type="button"
          aria-label="Search"
          onClick={() => useStore.getState().setPaletteOpen(true)}
          className="mb-2 inline-flex size-9 items-center justify-center rounded-lg border border-sidebar-border bg-background/50 text-muted-foreground hover:bg-sidebar-accent"
        >
          <SearchIcon className="size-4" />
        </button>
      </Tip>
      <nav aria-label="Places" className="flex flex-col gap-1">
        {places()
          .filter((p) => !p.footer)
          .map((p) => (
            <RailButton key={p.id} place={p} active={isActive(p, view)} />
          ))}
      </nav>
      <div className="mt-auto pb-2">
        {places()
          .filter((p) => p.footer)
          .map((p) => (
            <RailButton key={p.id} place={p} active={isActive(p, view)} />
          ))}
      </div>
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
