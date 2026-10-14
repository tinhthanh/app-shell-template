import { FolderKanbanIcon, HouseIcon, LayoutGridIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useStore, type View, type ViewKind } from "@/lib/store";

// The app's places: what the sidebar lists, ⌘1–9 jump to, and the command
// palette offers. One list, so every way around agrees. Add a view to
// lib/store.ts and App.tsx, then a place here.

export interface Place {
  id: string;
  label: string;
  icon: ReactNode;
  view: View;
  // The sidebar's bottom group (Settings) rather than the top.
  footer?: boolean;
}

// One entry per view kind, in the sidebar's order (⌘1–9 follow it): a kind
// without a place fails to compile.
const PLACES = {
  home: { label: "Home", icon: <HouseIcon />, view: { kind: "home" } },
  projects: { label: "Projects", icon: <FolderKanbanIcon />, view: { kind: "projects" } },
  kit: { label: "Kit", icon: <LayoutGridIcon />, view: { kind: "kit" } },
  settings: { label: "Settings", icon: <SettingsIcon />, view: { kind: "settings" }, footer: true },
} satisfies Record<ViewKind, Omit<Place, "id">>;

export function places(): Place[] {
  return (Object.keys(PLACES) as ViewKind[]).map((id) => ({ id, ...PLACES[id] }));
}

// isActive says whether a place is the one in front.
export const isActive = (p: Place, view: View) => p.view.kind === view.kind;

export function useActivePlace(): Place | undefined {
  const view = useStore((s) => s.view);
  return places().find((p) => isActive(p, view));
}
