import { EllipsisIcon, PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { Suspense, useMemo } from "react";
import { ink } from "@/components/ink";
import { NotificationBell } from "@/components/notices";
import { Tip } from "@/components/tip";
import { Menu, MenuCheckboxItem, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { usePlaceBadges } from "@/lib/badges";
import { t } from "@/lib/i18n";
import { identicon } from "@/lib/identicon";
import { lazyView } from "@/lib/lazy-view";
import { isActive, type Place, places } from "@/lib/nav";
import { IS_MAC, platformKeys } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useCan } from "@/lib/session";
import { openSettings, useStore } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { initials, pickWorkspace, useWorkspaceId, useWorkspaces } from "@/lib/workspace";

// The sidebar's rail, after Shipyard's (github.com/cosscom/shipyard, MIT):
// the places pinned to it as icons, the rest under its "…" with the way to
// pin them, then the person's workspaces as tiles (the one on show raised,
// with a bar at the rail's edge, and a dot while something in it waits),
// a tile to make another, and Settings at the foot. Beside it the sheet
// (components/app-sidebar.tsx) shows the workspace and the place's own list.

export const RAIL = 60; // w-rail, as a number for the sidebar's width

const railButton =
  "relative inline-flex size-9 items-center justify-center rounded-[10px] outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px]";

// usePinned is the places on the rail (prefs.railPlaces, every top place
// until the person picks) and the rest, for the "…".
function usePinned() {
  const chosen = usePrefs((p) => p.railPlaces);
  return useMemo(() => {
    const top = places().filter((p) => !p.footer);
    const pinned = chosen ? top.filter((p) => chosen.includes(p.id)) : top;
    return { top, pinned, more: top.filter((p) => !pinned.includes(p)) };
  }, [chosen]);
}

export function WorkspaceRail({ folded, fixed = false }: { folded: boolean; fixed?: boolean }) {
  const { top, pinned, more } = usePinned();
  return (
    <nav aria-label={t("shell.rail")} data-testid="workspace-rail" style={{ width: RAIL }} className="flex shrink-0 flex-col items-center gap-1 pt-1 pb-2">
      {folded && (
        <>
          {!fixed && <ShowSidebar />}
          <Tip label={t("shell.searchTip", { keys: platformKeys("⌘K") })} side="inline-end">
            <button type="button" aria-label={t("shell.search")} onClick={() => useStore.getState().setPaletteOpen(true)} className={cn(railButton, ink.row)}>
              <SearchIcon />
            </button>
          </Tip>
          <NotificationBell className={cn(railButton, "size-9 [&_svg]:size-[18px]")} />
        </>
      )}
      {pinned.map((p) => (
        <PlaceIcon key={p.id} place={p} />
      ))}
      <MorePlaces top={top} more={more} />
      <span aria-hidden className="my-1.5 h-px w-5 shrink-0 bg-sidebar-border" />
      <Workspaces />
      <div className="mt-auto flex flex-col items-center gap-1">
        <SettingsButton />
      </div>
    </nav>
  );
}

function ShowSidebar() {
  return (
    <Tip label={t("shell.showSidebarTip", { keys: "⌘\\" })} side="inline-end">
      <button type="button" aria-label={t("shell.showSidebar")} onClick={() => setPrefs({ sidebarCollapsed: false })} className={cn(railButton, ink.glyph)}>
        <PanelOpenGlyph />
      </button>
    </Tip>
  );
}

// The open-sidebar mark, drawn so it mirrors with the page in a right-to-left one.
function PanelOpenGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M14 9l3 3-3 3" />
    </svg>
  );
}

// PlaceIcon is a place as an icon, its count as a badge: amber and
// numbered when something waits on the person, a quiet dot otherwise.
function PlaceIcon({ place: p }: { place: Place }) {
  const view = useStore((s) => s.view);
  const badge = usePlaceBadges((s) => s[p.id]);
  const active = isActive(p, view);
  const n = places().findIndex((x) => x.id === p.id) + 1;
  return (
    <Tip label={badge ? `${p.label} · ${badge.count}` : p.label} side="inline-end">
      <button
        type="button"
        // The count is part of its name, for a screen reader as for the eye.
        aria-label={badge ? `${p.label}, ${badge.count}` : p.label}
        aria-current={active ? "page" : undefined}
        aria-keyshortcuts={`${IS_MAC ? "Meta" : "Control"}+${n}`}
        data-testid={`nav-${p.id}`}
        onClick={() => useStore.getState().setView({ ...p.view })}
        className={cn(railButton, ink.row, active && "bg-sidebar-accent text-foreground")}
      >
        {p.icon}
        {badge &&
          (badge.loud ? (
            <span
              data-testid={`place-badge-${p.id}`}
              className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-sidebar bg-warning px-1 font-semibold text-tag text-white tabular-nums leading-none"
            >
              {badge.count > 99 ? "99+" : badge.count}
            </span>
          ) : (
            <span data-testid={`place-badge-${p.id}`} data-count={badge.count} aria-hidden className="absolute end-1 top-1 size-2 rounded-full border-[1.5px] border-sidebar bg-foreground/45" />
          ))}
      </button>
    </Tip>
  );
}

// MorePlaces is the rail's "…": every place, and which of them sit on the rail.
function MorePlaces({ top, more }: { top: Place[]; more: Place[] }) {
  const view = useStore((s) => s.view);
  const chosen = usePrefs((p) => p.railPlaces);
  const pinned = (id: string) => (chosen ? chosen.includes(id) : true);
  const toggle = (id: string, on: boolean) => {
    const now = chosen ?? top.map((p) => p.id);
    setPrefs({ railPlaces: on ? top.map((p) => p.id).filter((x) => x === id || now.includes(x)) : now.filter((x) => x !== id) });
  };
  return (
    <Menu>
      <Tip label={t("shell.morePlaces")} side="inline-end">
        <MenuTrigger
          data-testid="more-places"
          render={
            <button
              type="button"
              aria-label={t("shell.morePlaces")}
              className={cn(railButton, ink.row, "data-popup-open:bg-sidebar-accent", more.some((p) => isActive(p, view)) && "bg-sidebar-accent text-foreground")}
            />
          }
        >
          <EllipsisIcon />
        </MenuTrigger>
      </Tip>
      <MenuPopup side="inline-end" align="start" className="min-w-52">
        <MenuGroup>
          {top.map((p) => (
            <MenuItem key={p.id} data-testid={`more-${p.id}`} onClick={() => useStore.getState().setView({ ...p.view })}>
              {p.icon}
              {p.label}
            </MenuItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>{t("shell.onTheRail")}</MenuGroupLabel>
          {top.map((p) => (
            <MenuCheckboxItem key={p.id} data-testid={`pin-${p.id}`} checked={pinned(p.id)} onCheckedChange={(on) => toggle(p.id, on)}>
              {p.label}
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function SettingsButton() {
  const on = useStore((s) => s.view.kind === "settings");
  return (
    <Tip label={t("shell.place.settings")} side="inline-end">
      <button
        type="button"
        data-testid="nav-settings"
        aria-label={t("shell.place.settings")}
        aria-current={on ? "page" : undefined}
        onClick={() => openSettings()}
        className={cn(railButton, ink.glyph, on && "bg-sidebar-accent text-foreground")}
      >
        <SettingsIcon strokeWidth={1.8} />
      </button>
    </Tip>
  );
}

// Workspaces is the rail's tiles: one per workspace, and one to make another.
function Workspaces() {
  const list = useWorkspaces((s) => s.list);
  const canCreate = useCan("workspace.create");
  const current = useWorkspaceId();
  return (
    <ul aria-label={t("shell.workspaces")} className="flex min-h-0 w-full flex-col items-center gap-1.5 overflow-y-auto pt-0.5 pb-1 [scrollbar-width:none]">
      {list.map((w) => (
        <li key={w.id} className="w-full">
          <WorkspaceTile workspace={w} selected={w.id === current} />
        </li>
      ))}
      {canCreate && (
        <li>
          <NewWorkspace />
        </li>
      )}
    </ul>
  );
}

// WorkspaceTile is a workspace on the rail. Picking another while a record
// of this one is open goes to its list, so the record doesn't bring this
// workspace straight back.
function WorkspaceTile({ workspace: w, selected }: { workspace: Workspace; selected: boolean }) {
  const waiting = w.attention ?? 0;
  const label = waiting ? t("shell.workspaceWaiting", { name: w.name, n: waiting }) : w.name;
  return (
    <div className="relative flex w-full shrink-0 justify-center">
      <Tip side="inline-end" label={label}>
        <button
          type="button"
          data-testid="rail-workspace"
          data-workspace={w.id}
          aria-label={label}
          aria-current={selected ? "true" : undefined}
          onClick={() => {
            if (selected) return;
            const view = useStore.getState().view;
            if (view.kind === "projects" && view.id) useStore.getState().setView({ kind: "projects" });
            pickWorkspace(w.id);
          }}
          className={cn(
            "relative flex size-9 items-center justify-center rounded-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            selected ? "border border-sidebar-border bg-background shadow-xs" : "hover:bg-sidebar-accent",
          )}
        >
          <WorkspaceAvatar name={w.name} />
          <span
            aria-hidden
            className="pointer-events-none absolute end-0 bottom-0 flex size-4 items-center justify-center rounded-[5px] border-[1.5px] border-sidebar bg-foreground font-semibold text-background text-tag leading-none"
          >
            {initials(w.name)}
          </span>
        </button>
      </Tip>
      {selected && <span aria-hidden className="pointer-events-none absolute start-0 top-2.5 h-4 w-[3px] rounded-e-[3px] bg-foreground" />}
      {waiting > 0 && (
        <span aria-hidden data-testid="rail-workspace-dot" className="pointer-events-none absolute start-[calc(50%+9px)] top-0.5 size-[11px] rounded-full border-2 border-sidebar bg-warning" />
      )}
    </div>
  );
}

// WorkspaceAvatar is a workspace's mark: an identicon from its name (lib/identicon.ts).
export function WorkspaceAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const { cells, hue } = useMemo(() => identicon(name), [name]);
  return (
    <span style={{ width: size, height: size }} className="relative flex shrink-0 overflow-hidden rounded-[8px]">
      <svg viewBox="0 0 6 6" shapeRendering="crispEdges" className="size-full" aria-hidden>
        <rect width="6" height="6" className="fill-[color-mix(in_oklab,var(--foreground)_6%,var(--background))]" />
        <g style={{ fill: `oklch(0.62 0.15 ${hue})` }}>
          {cells.map((on, i) =>
            on ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: 25 fixed cells.
              <rect key={i} x={(i % 5) + 0.5} y={Math.floor(i / 5) + 0.5} width="1" height="1" />
            ) : null,
          )}
        </g>
      </svg>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[8px] border border-foreground/10" />
    </span>
  );
}

// NewWorkspace is the rail's last tile. Its form loads after the app has
// started (new-workspace.tsx); until then the tile is drawn and waits.
const NewWorkspaceForm = lazyView(() => import("@/components/new-workspace").then((m) => m.NewWorkspace));
export const newWorkspaceTile = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-sidebar-border border-dashed outline-none hover:border-solid hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
  ink.glyph,
);

function NewWorkspace() {
  return (
    <Suspense
      fallback={
        <button type="button" disabled aria-label={t("shell.newWorkspace")} className={newWorkspaceTile}>
          <PlusIcon strokeWidth={2} />
        </button>
      }
    >
      <NewWorkspaceForm />
    </Suspense>
  );
}

// WorkspaceHeader is the sheet's head: the workspace on show, its mark and
// name, and who the person is in it.
export function WorkspaceHeader({ subtitle }: { subtitle?: string }) {
  const id = useWorkspaceId();
  const w = useWorkspaces((s) => s.list.find((x) => x.id === id));
  if (!w) return null;
  return (
    <div data-testid="workspace-header" className="flex items-center gap-2.5 px-edge pt-3.5 pb-2.5">
      <WorkspaceAvatar name={w.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className={cn("truncate font-semibold text-subtitle leading-5 tracking-[-0.01em]", ink.strong)}>{w.name}</h2>
        {subtitle && <span className={cn("truncate text-tag", ink.faint)}>{subtitle}</span>}
      </div>
    </div>
  );
}
