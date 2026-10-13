import { FolderKanbanIcon, HouseIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useStore, type View } from "@/lib/store";

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

export function places(): Place[] {
  return [
    { id: "home", label: "Home", icon: <HouseIcon />, view: { kind: "home" } },
    { id: "projects", label: "Projects", icon: <FolderKanbanIcon />, view: { kind: "projects" } },
    { id: "settings", label: "Settings", icon: <SettingsIcon />, view: { kind: "settings" }, footer: true },
  ];
}

// isActive says whether a place is the one in front.
export const isActive = (p: Place, view: View) => p.view.kind === view.kind;

export function useActivePlace(): Place | undefined {
  const view = useStore((s) => s.view);
  return places().find((p) => isActive(p, view));
}
