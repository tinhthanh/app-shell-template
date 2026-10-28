import { FolderKanbanIcon, HouseIcon, LayoutGridIcon, ListTodoIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

import { type Key, t } from "@/lib/i18n";
import { useStore, type View, type ViewKind } from "@/lib/store";
import type { SearchHit } from "@/lib/types";

// The app's places: what the sidebar lists, ⌘1–9 jump to, and the command
// palette offers. One list, so every way around agrees. Adding one:
// AGENTS.md › Adding things.

export interface Place {
  id: string;
  label: string;
  icon: ReactNode;
  view: View;
  // The sidebar's bottom group (Settings) rather than the top.
  footer?: boolean;
}

// One entry per view kind, in the sidebar's order (⌘1–9 follow it): a kind
// without a place fails to compile. "missing" (an address the app doesn't
// know) is nowhere to go to, so it has none.
type PlaceKind = Exclude<ViewKind, "missing">;
const PLACES = {
  home: { label: "shell.place.home", icon: <HouseIcon />, view: { kind: "home" } },
  projects: { label: "shell.place.projects", icon: <FolderKanbanIcon />, view: { kind: "projects" } },
  tasks: { label: "shell.place.tasks", icon: <ListTodoIcon />, view: { kind: "tasks" } },
  kit: { label: "shell.place.kit", icon: <LayoutGridIcon />, view: { kind: "kit" } },
  settings: { label: "shell.place.settings", icon: <SettingsIcon />, view: { kind: "settings" }, footer: true },
} satisfies Record<PlaceKind, Omit<Place, "id" | "label"> & { label: Key }>;

// The kinds of record the palette finds (SearchHit's kind): the group they
// are listed under, their icon, and the view one opens on. One entry per
// kind, so a new kind without one fails to compile.
// state is a hit's status in the person's language (read in render), or
// nothing for one the app has no word for.
const said = (words: Record<string, Key>) => (status: string) => (status in words ? t(words[status] as Key) : "");
export const RECORD_KINDS = {
  project: {
    group: "shell.records.projects",
    icon: <FolderKanbanIcon />,
    view: (id: string): View => ({ kind: "projects", id }),
    state: said({ active: "projects.state.active", paused: "projects.state.paused", archived: "projects.state.archived" }),
  },
  task: {
    group: "shell.records.tasks",
    icon: <ListTodoIcon />,
    view: (id: string): View => ({ kind: "tasks", id }),
    state: said({ todo: "tasks.state.todo", doing: "tasks.state.doing", done: "tasks.state.done" }),
  },
} satisfies Record<SearchHit["kind"], { group: Key; icon: ReactNode; view(id: string): View; state(status: string): string }>;

export function places(): Place[] {
  // The label is read here, at render, so it is in the language in use.
  return (Object.keys(PLACES) as PlaceKind[]).map((id) => ({ id, ...PLACES[id], label: t(PLACES[id].label) }));
}

// isActive says whether a place is the one in front.
export const isActive = (p: Place, view: View) => p.view.kind === view.kind;

export function useActivePlace(): Place | undefined {
  const view = useStore((s) => s.view);
  return places().find((p) => isActive(p, view));
}
