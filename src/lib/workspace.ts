// The workspace on show: every list reads the records of one (a team, a
// company: lib/types.ts Workspace), and the sidebar's rail switches between
// them. Kept in prefs (workspace), so a reload stays where it was; a record
// opened from another workspace (a link, the palette) brings its own
// workspace with it (views/projects). After Shipyard's project rail
// (github.com/cosscom/shipyard, MIT). Pure apart from prefs, so
// workspace.test.ts runs it in node.
import { create } from "zustand";

import { setPrefs, usePrefs } from "./prefs.ts";
import { onSignedOut } from "./session.ts";
import type { Workspace } from "./types.ts";

// The person's workspaces, read once after signing in (App.tsx): a list
// that needs the one on show waits while they load; if they can't be read,
// it reads all the same, and its own failure says what is wrong.
export const useWorkspaces = create<{ status: "loading" | "ready" | "failed"; list: Workspace[]; error?: unknown }>()(() => ({ status: "loading", list: [] }));

// loadWorkspaces reads them through the client (lib/api.ts) and settles
// which one shows. An answer to an older load (a sign-out between) is dropped.
let loads = 0;
export async function loadWorkspaces(read: () => Promise<Workspace[]>) {
  const mine = ++loads;
  useWorkspaces.setState({ status: "loading" });
  try {
    const list = await read();
    if (mine !== loads) return;
    useWorkspaces.setState({ status: "ready", list, error: undefined });
    const id = settleWorkspace(usePrefs.getState().workspace, list);
    if (id) pickWorkspace(id);
  } catch (error) {
    if (mine === loads) useWorkspaces.setState({ status: "failed", error });
  }
}

// Signed out, the workspaces, the one on show and the records opened last
// go with the person: the next one on a shared machine sees none of them.
onSignedOut(() => {
  loads++;
  useWorkspaces.setState({ status: "loading", list: [] });
  setPrefs({ workspace: null, recent: [] });
});

// addWorkspace puts a new one on the rail, and shows it.
export function addWorkspace(w: Workspace) {
  useWorkspaces.setState((s) => ({ list: [...s.list.filter((x) => x.id !== w.id), w], status: "ready" }));
  pickWorkspace(w.id);
}

// settleWorkspace is the workspace to show from those the person has: the
// one kept, while it is still theirs, else the first.
export function settleWorkspace(kept: string | null, list: readonly Workspace[]): string | null {
  if (kept && list.some((w) => w.id === kept)) return kept;
  return list[0]?.id ?? null;
}

// pickWorkspace shows a workspace.
export function pickWorkspace(id: string) {
  if (usePrefs.getState().workspace !== id) setPrefs({ workspace: id });
}

// useWorkspaceId is the workspace on show, for a read's query and its key.
export const useWorkspaceId = (): string | null => usePrefs((p) => p.workspace);

// initials is a workspace's letter for its tile: its first letter or digit.
export const initials = (name: string): string => (name.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
